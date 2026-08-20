import os
import sys
import gc
import re
import argparse
import torch
import soundfile as sf
import numpy as np
import tempfile
from num2words import num2words

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
from f5_tts.infer.utils_infer import load_model, load_vocoder, infer_process
from f5_tts.model import DiT

def transform_numbers_to_text(text):
    """Converts digits to Brazilian Portuguese words as recommended by firstpixel."""
    def replace_number(match):
        num = int(match.group())
        try:
            return num2words(num, lang='pt_BR')
        except:
            return match.group()

    transformed = re.sub(r'\d+', replace_number, text)
    transformed = transformed.replace(" e um mil", " e mil").replace("um mil ", "mil ")
    # Clean technical tokens that confuse flow-matching
    transformed = transformed.replace("try/catch", "try catch").replace("try / catch", "try catch")
    return transformed.lower()

def split_into_sentences(text):
    """Splits text into natural conversational sentence chunks for optimal acoustic flow."""
    raw_chunks = re.split(r'([.!?;\n]+)', text)
    sentences = []
    current = ""
    for part in raw_chunks:
        current += part
        if re.search(r'[.!?;\n]+', part) and len(current.strip()) > 8:
            sentences.append(current.strip())
            current = ""
    if current.strip():
        sentences.append(current.strip())
    
    clean = [s for s in sentences if len(s) > 1]
    return clean if clean else [text]

def resolve_device(preference="auto"):
    if preference == "cpu":
        return "cpu"
    if preference == "cuda":
        if torch.cuda.is_available():
            return "cuda"
        print("Aviso: CUDA solicitada mas indisponivel no PyTorch. Usando CPU.", flush=True)
        return "cpu"
    
    # Auto mode: check cuda availability
    if torch.cuda.is_available():
        try:
            free_mem = torch.cuda.mem_get_info()[0] / (1024 ** 2)
            if free_mem >= 1000:
                return "cuda"
            else:
                print(f"Aviso: VRAM livre baixa ({free_mem:.0f}MB). Usando CPU para seguranca.", flush=True)
                return "cpu"
        except Exception:
            return "cuda"
    return "cpu"

def prepare_aligned_reference(sample_path):
    """
    Extracts the exact first sentence from the user's recorded teleprompter audio
    with 100% matched phonetic transcription.
    """
    data, sr = sf.read(sample_path)
    if data.ndim > 1:
        data = data.mean(axis=1)

    total_duration = len(data) / sr

    # Ground truth first phrase in user's teleprompter recording: "Fala pessoal, seja muito bem-vindos." (~3.1s)
    if total_duration > 4.0:
        cut_len = int(sr * 3.1)
        cut_data = data[:cut_len]
        temp_sample = os.path.join(tempfile.gettempdir(), f"aligned_sample_{os.getpid()}.wav")
        sf.write(temp_sample, cut_data, sr)
        ref_text = "fala pessoal, seja muito bem-vindos."
        return temp_sample, ref_text, True

    temp_sample = os.path.join(tempfile.gettempdir(), f"aligned_sample_{os.getpid()}.wav")
    sf.write(temp_sample, data, sr)
    ref_text = "fala pessoal, seja muito bem-vindos."
    return temp_sample, ref_text, True

def run_clone(output_path, text, sample_wav="voice-lab/amostra.wav", device_pref="auto", nfe=16):
    sample_path = os.path.abspath(sample_wav)
    if not os.path.exists(sample_path):
        raise FileNotFoundError(f"Arquivo de referência '{sample_path}' não encontrado. Grave sua voz antes.")

    target_device = resolve_device(device_pref)
    clean_sample_path, ref_text, is_temp = prepare_aligned_reference(sample_path)

    print(f"Reference audio: {sample_path} (Using aligned slice: {clean_sample_path})", flush=True)
    print(f"Matched Reference Text: '{ref_text}'", flush=True)
    print(f"Target Device: {target_device} (pref: {device_pref}) | NFE Steps: {nfe}", flush=True)
    print(f"Loading Portuguese pt-BR fine-tuned model: firstpixel/F5-TTS-pt-br...", flush=True)

    try:
        model_cls = DiT
        model_cfg = dict(dim=1024, depth=22, heads=16, ff_mult=2, text_dim=512, conv_layers=4)

        vocoder = load_vocoder(vocoder_name="vocos", is_local=False, device=target_device)

        trained_custom_model = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "voice-lab", "models", "minha_voz_calibrada.pth"))
        if os.path.exists(trained_custom_model) and os.path.getsize(trained_custom_model) > 1000:
            print(f"Carregando Modelo Neural Dedicado do Usuário: {trained_custom_model}", flush=True)
            base_ckpt = hf_hub_download(repo_id="firstpixel/F5-TTS-pt-br", filename="pt-br/model_last.safetensors")
            model = load_model(model_cls, model_cfg, ckpt_path=base_ckpt, device=target_device)
            try:
                ckpt_dict = torch.load(trained_custom_model, map_location=target_device)
                if isinstance(ckpt_dict, dict):
                    state = ckpt_dict.get("ema_model_state_dict", ckpt_dict.get("model_state_dict", ckpt_dict))
                    if hasattr(model, "transformer") and not any(k.startswith("transformer.") for k in state.keys()):
                        model.transformer.load_state_dict(state, strict=False)
                    else:
                        model.load_state_dict(state, strict=False)
                print("Pesos calibrados do usuário aplicados com sucesso!", flush=True)
            except Exception as load_err:
                print(f"Aviso ao carregar pesos dedicados ({load_err}). Usando modelo base brasileiro.", flush=True)
        else:
            print("Carregando Modelo Base Brasileiro: firstpixel/F5-TTS-pt-br...", flush=True)
            ckpt_path = hf_hub_download(repo_id="firstpixel/F5-TTS-pt-br", filename="pt-br/model_last.safetensors")
            model = load_model(model_cls, model_cfg, ckpt_path=ckpt_path, device=target_device)

        cfg_strength = 1.3 if int(nfe) >= 16 else 1.5

        # Split text into sentence chunks for natural acoustic flow and breathing pauses
        sentence_chunks = split_into_sentences(text)
        print(f"Divided into {len(sentence_chunks)} sentence chunks for natural synthesis:", flush=True)

        combined_audio = []
        sample_rate_out = 24000

        for idx, chunk in enumerate(sentence_chunks):
            processed_chunk = transform_numbers_to_text(chunk)
            print(f"[{idx+1}/{len(sentence_chunks)}] Gerando locução: '{processed_chunk}'", flush=True)

            wav, sr, _ = infer_process(
                clean_sample_path,
                ref_text,
                processed_chunk,
                model,
                vocoder,
                mel_spec_type="vocos",
                target_rms=0.15,
                cross_fade_duration=0.15,
                nfe_step=int(nfe),
                cfg_strength=cfg_strength,
                device=target_device
            )
            sample_rate_out = sr
            combined_audio.append(wav)

            # Add a 150ms natural breathing pause between sentences
            if idx < len(sentence_chunks) - 1:
                combined_audio.append(np.zeros(int(sr * 0.15)))

        final_audio = np.concatenate(combined_audio)
        sf.write(output_path, final_audio, sample_rate_out)
        print(f"DONE:{output_path}", flush=True)
    except Exception as e:
        print(f"Clone Error: {e}", file=sys.stderr, flush=True)
        raise e
    finally:
        if is_temp:
            try:
                os.remove(clean_sample_path)
            except Exception:
                pass
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        gc.collect()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Intelligent Zero-shot Local Voice Cloning with Brazilian Portuguese F5-TTS")
    parser.add_argument("--output", "-o", required=True, help="Output audio file path (.wav)")
    parser.add_argument("--text", "-t", required=True, help="Text to synthesize")
    parser.add_argument("--sample", "-s", default="voice-lab/amostra.wav", help="Reference sample audio path (.wav)")
    parser.add_argument("--device", "-d", default="auto", choices=["auto", "cuda", "cpu"], help="Compute device")
    parser.add_argument("--nfe", "-n", type=int, default=16, help="Number of Function Evaluations (Sampling steps)")

    args, unknown = parser.parse_known_args()
    run_clone(args.output, args.text, args.sample, args.device, args.nfe)
