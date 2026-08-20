import os
import sys
import gc
import json
import time
import argparse
import csv
import torch
import soundfile as sf
import scipy.signal as signal

# Patch torchaudio.load to use soundfile so it never fails on torchcodec DLLs
import torchaudio
def custom_load(filepath, *args, **kwargs):
    data, sr = sf.read(filepath)
    if data.ndim == 1:
        tensor = torch.from_numpy(data).unsqueeze(0).float()
    else:
        tensor = torch.from_numpy(data.T).float()
    return tensor, sr

torchaudio.load = custom_load

from huggingface_hub import hf_hub_download
import f5_tts.infer.utils_infer
from f5_tts.model import CFM, DiT
from f5_tts.model.modules import MelSpec
from f5_tts.infer.utils_infer import load_model, get_tokenizer

def extract_dataset_chunks(sample_path, output_dir="voice-lab/dataset"):
    """Uses whisper to extract 15-20 aligned training audio chunks with exact transcription."""
    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, "metadata.csv")

    data, sr = sf.read(sample_path)
    if data.ndim > 1:
        data = data.mean(axis=1)

    print("STAGE:Segmentando amostra de voz com Whisper para criar o dataset de treino...", flush=True)
    num_samples = int(len(data) * 16000 / sr)
    data_16k = signal.resample(data, num_samples).astype("float32")

    import whisper
    whisper_model = whisper.load_model("tiny")
    result = whisper_model.transcribe(data_16k, language="pt")

    csv_rows = []
    chunks = []
    for i, seg in enumerate(result.get("segments", [])):
        t0 = seg.get("start", 0)
        t1 = seg.get("end", 0)
        txt = seg.get("text", "").strip().lower()
        if t1 - t0 >= 1.2 and len(txt) > 3:
            s0 = int(t0 * sr)
            s1 = int(t1 * sr)
            chunk_wav = data[s0:s1]
            chunk_path = os.path.abspath(os.path.join(output_dir, f"chunk_{i:03d}.wav"))
            sf.write(chunk_path, chunk_wav, sr)
            csv_rows.append([chunk_path, txt])
            chunks.append((chunk_path, txt))

    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f, delimiter="|")
        writer.writerow(["audio_file", "text"])
        for r in csv_rows:
            writer.writerow(r)

    print(f"STAGE:Dataset criado com sucesso ({len(chunks)} fragmentos de fala alinhados).", flush=True)
    return chunks

def train_custom_voice(sample_path, output_model_path, epochs=12, lr=1.5e-5):
    sample_abs = os.path.abspath(sample_path)
    if not os.path.exists(sample_abs):
        raise FileNotFoundError(f"Amostra de áudio '{sample_abs}' não encontrada. Grave o áudio primeiro.")

    os.makedirs(os.path.dirname(os.path.abspath(output_model_path)), exist_ok=True)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    print(f"PROGRESS:5|STAGE:Iniciando pipeline de calibração neural na GPU ({device})...", flush=True)

    # 1. Extração do dataset de fragmentos
    chunks = extract_dataset_chunks(sample_abs)
    if not chunks:
        raise ValueError("Nenhum fragmento de fala válido pôde ser extraído da amostra.")

    print(f"PROGRESS:15|STAGE:Carregando modelo neural brasileiro e vocabulário...", flush=True)
    vocab_file = os.path.join(os.path.dirname(f5_tts.infer.utils_infer.__file__), "examples", "vocab.txt")
    vocab_char_map, vocab_size = get_tokenizer(vocab_file, "custom")

    model_cls = DiT
    model_cfg = dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4)
    ckpt_path = hf_hub_download(repo_id="firstpixel/F5-TTS-pt-br", filename="pt-br/model_last.safetensors")
    
    cfm_model = load_model(model_cls, model_cfg, ckpt_path=ckpt_path, device=device)
    dit = cfm_model.transformer.to(device).float()

    mel_module = MelSpec(n_fft=1024, hop_length=256, win_length=1024, n_mel_channels=100, target_sample_rate=24000, mel_spec_type="vocos").to(device).float()
    cfm = CFM(transformer=dit, mel_spec_module=mel_module, vocab_char_map=vocab_char_map).to(device).float()
    cfm.train()

    optimizer = torch.optim.AdamW(cfm.parameters(), lr=lr, weight_decay=1e-4)

    total_epochs = int(epochs)
    print(f"PROGRESS:20|STAGE:Iniciando {total_epochs} épocas de treinamento real com Backpropagation...", flush=True)

    final_loss = 0.8
    for epoch in range(1, total_epochs + 1):
        epoch_loss = 0.0
        for wav_path, txt in chunks:
            data, sr = sf.read(wav_path)
            if data.ndim > 1:
                data = data.mean(axis=1)

            wav_t = torch.from_numpy(data).unsqueeze(0).float().to(device)
            text_list = [txt]

            optimizer.zero_grad()
            loss, cond, pred = cfm(wav_t, text=text_list)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(cfm.parameters(), 1.0)
            optimizer.step()

            epoch_loss += loss.item()

        avg_loss = epoch_loss / len(chunks)
        final_loss = avg_loss

        vram_mb = torch.cuda.memory_allocated() / (1024 ** 2) if torch.cuda.is_available() else 0
        progress = int(20 + (epoch / total_epochs) * 75)
        print(f"PROGRESS:{progress}|STAGE:Época {epoch}/{total_epochs} (Loss: {avg_loss:.4f} | VRAM: {vram_mb:.0f}MB)", flush=True)
        print(f"METRICS:{json.dumps({'epoch': epoch, 'total_epochs': total_epochs, 'loss': round(avg_loss, 4), 'vram_mb': round(vram_mb, 1)})}", flush=True)

    # 4. Salvar pesos calibrados permanentemente
    print(f"PROGRESS:96|STAGE:Salvando modelo calibrado permanentemente em disco...", flush=True)
    ckpt_dict = {
        "ema_model_state_dict": dit.state_dict(),
        "model_state_dict": dit.state_dict()
    }
    torch.save(ckpt_dict, output_model_path)

    metadata = {
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "total_chunks": len(chunks),
        "epochs": total_epochs,
        "final_loss": round(final_loss, 4),
        "base_model": "firstpixel/F5-TTS-pt-br",
        "device": device
    }
    meta_path = output_model_path.replace(".pth", ".json").replace(".safetensors", ".json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"PROGRESS:100|STAGE:Modelo Neural Treinado com Sucesso na RTX 2060!", flush=True)
    print(f"DONE:{output_model_path}", flush=True)

    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Real Neural Fine-Tuning on GPU with Whisper Dataset Segmentation")
    parser.add_argument("--sample", "-s", default="voice-lab/amostra.wav", help="Training audio sample path")
    parser.add_argument("--output", "-o", default="voice-lab/models/minha_voz_calibrada.pth", help="Output trained model path")
    parser.add_argument("--epochs", "-e", type=int, default=12, help="Number of training epochs")

    args, unknown = parser.parse_known_args()
    train_custom_voice(args.sample, args.output, epochs=args.epochs)
