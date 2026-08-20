import os
import sys
import json
import subprocess
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
import soundfile as sf

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# Configura FFmpeg no PATH
ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
ffmpeg_dir = os.path.dirname(ffmpeg_exe)
ffmpeg_target = os.path.join(ffmpeg_dir, "ffmpeg.exe")
if not os.path.exists(ffmpeg_target):
    try:
        shutil.copyfile(ffmpeg_exe, ffmpeg_target)
    except:
        pass
os.environ["PATH"] = ffmpeg_dir + os.pathsep + os.environ.get("PATH", "")

import whisper

WIDTH = 1080
HEIGHT = 1920
FPS = 30

VOICE_PATH = os.path.abspath("output/reels-audio/reels_cmsz3yt5y0000t4t8hp1alvem.mp3")
BG_MUSIC_PATH = os.path.abspath("output/reels-audio/background_music.mp3")
MIXED_AUDIO_PATH = os.path.abspath("output/reels-audio/reels_cmsz3yt5y0000t4t8hp1alvem_mixed.mp3")
OUTPUT_DIR = os.path.abspath("output/reels-video")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_MP4 = os.path.join(OUTPUT_DIR, "reels_cmsz3yt5y0000t4t8hp1alvem.mp4")

# Mixa voz com trilha sonora Lo-Fi
print("\n🎛️ Mixando voz com trilha sonora Lo-Fi...")
voice_data, voice_sr = sf.read(VOICE_PATH)
if len(voice_data.shape) > 1:
    voice_data = np.mean(voice_data, axis=1)

total_duration = len(voice_data) / voice_sr

bg_data, bg_sr = sf.read(BG_MUSIC_PATH)
if len(bg_data.shape) > 1:
    bg_data = np.mean(bg_data, axis=1)
if bg_sr != voice_sr:
    import scipy.signal
    bg_data = scipy.signal.resample(bg_data, int(len(bg_data) * voice_sr / bg_sr))

# Loop ou corte da trilha
target_samples = int(total_duration * voice_sr)
if len(bg_data) < target_samples:
    repeats = int(np.ceil(target_samples / len(bg_data)))
    bg_data = np.tile(bg_data, repeats)
bg_data = bg_data[:target_samples] * 0.12 # Volume suave da trilha

final_audio = (voice_data * 1.0) + bg_data
sf.write(MIXED_AUDIO_PATH, final_audio, voice_sr)
print(f"✅ Áudio mixado: {total_duration:.2f}s")

# Cenas do Roteiro
SCENES = [
    {
        "title": "CENA 1: O GANCHO",
        "badge": "⚡ NOVIDADE JAVASCRIPT",
        "badge_color": "#38bdf8",
        "header_tag": "ECMASCRIPT_PROPOSAL",
        "code_snippet": "// 💀 O inferno do Try/Catch no JS...\ntry {\n  const res = await fetch('/api/user');\n  const data = await res.json();\n} catch (err) {\n  console.error(err);\n}",
        "time_start": 0.0,
        "time_end": 6.5,
    },
    {
        "title": "CENA 2: O PROBLEMA",
        "badge": "⚠️ ESCOPOS ANINHADOS",
        "badge_color": "#ef4444",
        "header_tag": "NESTED_TRY_CATCH",
        "code_snippet": "// 💥 Código poluído e difícil de manter\ntry {\n  const user = await getUser();\n  try {\n    const pay = await charge(user);\n  } catch (errPay) { ... }\n} catch (errUser) { ... }",
        "time_start": 6.5,
        "time_end": 17.5,
    },
    {
        "title": "CENA 3: A SOLUÇÃO (?=)",
        "badge": "🚀 SAFE ASSIGNMENT OPERATOR",
        "badge_color": "#10b981",
        "header_tag": "OPERADOR_?=__CLEAN_CODE",
        "code_snippet": "// ✨ Novo Operador ?= (Sem nenhum try/catch!)\nconst [error, response] = ?= await fetch('/api/pay');\n\nif (error) {\n  return handleError(error);\n}\nreturn process(response);",
        "time_start": 17.5,
        "time_end": 33.0,
    },
    {
        "title": "CENA 4: CTA & COMUNIDADE",
        "badge": "🔥 SYRIUS TECH",
        "badge_color": "#a855f7",
        "header_tag": "SAVE_AND_SHARE",
        "code_snippet": "/*\n  💡 Curtiu essa novidade do ECMAScript?\n  \n  ❤️ Curta & Compartilhe com seu time\n  🔖 Salve para consultar no Node.js\n  🚀 Siga @syrius_tech para mais!\n*/",
        "time_start": 33.0,
        "time_end": 999.0,
    },
]

print("🎙️ Transcrevendo legendas sincronizadas com Whisper AI...")
model = whisper.load_model("tiny")
transcription = model.transcribe(VOICE_PATH, language="pt", word_timestamps=True)

words = []
for segment in transcription["segments"]:
    if "words" in segment:
        for w in segment["words"]:
            words.append({
                "word": w["word"].strip().upper(),
                "start": w["start"],
                "end": w["end"]
            })
    else:
        text = segment["text"].strip().upper()
        seg_words = text.split()
        if seg_words:
            dur = (segment["end"] - segment["start"]) / len(seg_words)
            for i, sw in enumerate(seg_words):
                words.append({
                    "word": sw,
                    "start": segment["start"] + i * dur,
                    "end": segment["start"] + (i + 1) * dur
                })

print(f"✅ {len(words)} palavras sincronizadas com precisão milimétrica!")

# Fontes
def get_font(size, bold=False):
    font_names = ["segoeui.ttf", "arial.ttf", "consola.ttf", "calibri.ttf"]
    if bold:
        font_names = ["segoeuib.ttf", "arialbd.ttf", "consolab.ttf", "calibrib.ttf"]
    for f in font_names:
        try:
            return ImageFont.truetype(f, size)
        except:
            continue
    return ImageFont.load_default()

font_title = get_font(38, bold=True)
font_badge = get_font(22, bold=True)
font_code = get_font(26, bold=False)
font_sub_active = get_font(48, bold=True)
font_sub_normal = get_font(38, bold=True)
font_watermark = get_font(22, bold=True)

# FFT para visualizador de áudio
audio_samples_per_frame = int(voice_sr / FPS)
num_frames = int(total_duration * FPS)

def get_audio_spectrum(frame_idx, num_bars=28):
    start = frame_idx * audio_samples_per_frame
    end = min(start + audio_samples_per_frame * 2, len(final_audio))
    if start >= len(final_audio) or end <= start:
        return [0.0] * num_bars
    chunk = final_audio[start:end]
    if len(chunk) < 64:
        return [0.0] * num_bars
    fft_vals = np.abs(np.fft.rfft(chunk * np.hanning(len(chunk))))
    bands = np.array_split(fft_vals[:min(len(fft_vals), 512)], num_bars)
    bars = []
    for b in bands:
        if len(b) > 0:
            val = np.mean(b)
            bars.append(min(1.0, val * 3.5))
        else:
            bars.append(0.0)
    return bars

print(f"🎬 Renderizando {num_frames} frames em 1080x1920 (30 FPS)...")

# Inicia processo FFmpeg
cmd = [
    "ffmpeg", "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{WIDTH}x{HEIGHT}",
    "-pix_fmt", "rgb24",
    "-r", str(FPS),
    "-i", "-",
    "-i", MIXED_AUDIO_PATH,
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "19",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    OUTPUT_MP4
]

pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for f_idx in range(num_frames):
    t = f_idx / FPS
    
    # 1. Background Escuro Gradiente
    img = Image.new("RGB", (WIDTH, HEIGHT), "#080c14")
    draw = ImageDraw.Draw(img)
    
    # Gradiente sutil
    for y in range(0, HEIGHT, 8):
        alpha = int(y / HEIGHT * 25)
        draw.rectangle([0, y, WIDTH, y + 8], fill=(8 + alpha // 4, 12 + alpha // 3, 20 + alpha // 2))
    
    # 2. Determina a Cena Ativa
    active_scene = SCENES[0]
    for s in SCENES:
        if s["time_start"] <= t < s["time_end"]:
            active_scene = s
            break

    # 3. Header / Branding no Topo
    draw.rectangle([40, 60, WIDTH - 40, 130], fill=(15, 23, 42), outline=(56, 189, 248, 100), width=1)
    draw.text((65, 80), "@syrius_tech", fill="#38bdf8", font=font_title)
    
    # Badge da Cena
    badge_w = 340
    badge_x = WIDTH - 40 - badge_w - 20
    draw.rectangle([badge_x, 75, badge_x + badge_w, 115], fill=active_scene["badge_color"])
    draw.text((badge_x + 16, 82), active_scene["badge"], fill="#ffffff", font=font_badge)

    # 4. Mockup do VS Code / Terminal Central
    card_x, card_y, card_w, card_h = 50, 160, WIDTH - 100, 940
    # Sombra e Fundo
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=16, fill=(13, 17, 23), outline=(48, 54, 61), width=2)
    # Barra de Título do Editor
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + 55], radius=16, fill=(22, 27, 34))
    draw.rectangle([card_x, card_y + 30, card_x + card_w, card_y + 55], fill=(22, 27, 34))
    
    # Bolinhas do macOS (Vermelho, Amarelo, Verde)
    draw.ellipse([card_x + 20, card_y + 20, card_x + 36, card_y + 36], fill="#ff5f56")
    draw.ellipse([card_x + 46, card_y + 20, card_x + 62, card_y + 36], fill="#ffbd2e")
    draw.ellipse([card_x + 72, card_y + 20, card_x + 88, card_y + 36], fill="#27c93f")
    
    # Aba do Arquivo
    draw.text((card_x + 115, card_y + 17), f"app.ts — {active_scene['header_tag']}", fill="#94a3b8", font=font_badge)
    
    # Linhas de Código Sintático
    code_lines = active_scene["code_snippet"].split("\n")
    code_start_y = card_y + 80
    for idx, line in enumerate(code_lines):
        line_y = code_start_y + idx * 46
        # Número da Linha
        draw.text((card_x + 25, line_y), str(idx + 1).rjust(2), fill="#475569", font=font_code)
        
        # Colorização Sintática Simples
        color = "#f8fafc"
        if line.strip().startswith("//") or line.strip().startswith("/*") or line.strip().startswith("*") or line.strip().startswith("*/"):
            color = "#64748b"
        elif "const" in line or "function" in line or "return" in line or "if" in line or "try" in line or "catch" in line or "await" in line:
            color = "#38bdf8"
        elif "error" in line or "err" in line or "💀" in line:
            color = "#f87171"
        elif "?=" in line or "🚀" in line:
            color = "#34d399"
        
        draw.text((card_x + 75, line_y), line, fill=color, font=font_code)

    # 5. Visualizador de Espectro de Áudio Reativo Neon (28 barras)
    bars = get_audio_spectrum(f_idx, 28)
    vis_y = 1140
    bar_w = 26
    spacing = 8
    total_w = len(bars) * (bar_w + spacing) - spacing
    start_x = (WIDTH - total_w) // 2
    
    for b_i, b_val in enumerate(bars):
        b_h = max(6, int(b_val * 140))
        bx = start_x + b_i * (bar_w + spacing)
        by = vis_y + 70 - b_h // 2
        # Cor gradiente ciano para roxo
        bar_color = (
            int(56 + (b_i / len(bars)) * 112),
            int(189 - (b_i / len(bars)) * 104),
            248
        )
        draw.rounded_rectangle([bx, by, bx + bar_w, by + b_h], radius=6, fill=bar_color)

    # 6. Legendas Dinâmicas Sincronizadas (Whisper AI)
    # Busca 3 a 5 palavras ativas ao redor do tempo atual
    current_words = []
    active_word_idx = -1
    
    for w_i, w in enumerate(words):
        if w["start"] - 0.2 <= t <= w["end"] + 0.3:
            # Pega janela de contexto
            w_start = max(0, w_i - 2)
            w_end = min(len(words), w_i + 3)
            current_words = words[w_start:w_end]
            active_word_idx = w_i - w_start
            break
            
    if not current_words and words:
        # Fallback: pega a palavra mais próxima
        closest = min(range(len(words)), key=lambda i: abs(words[i]["start"] - t))
        w_start = max(0, closest - 1)
        w_end = min(len(words), closest + 2)
        current_words = words[w_start:w_end]
        active_word_idx = closest - w_start

    # Renderiza caixa de legendas no terço inferior
    sub_box_y = 1320
    draw.rounded_rectangle([60, sub_box_y, WIDTH - 60, sub_box_y + 190], radius=20, fill=(15, 23, 42, 230), outline=(56, 189, 248, 80), width=1)
    
    # Desenha texto das legendas com destaque amarelo na palavra ativa
    sub_line_text = " ".join([cw["word"] for cw in current_words])
    if current_words:
        # Mede largura e centraliza
        total_sub_w = draw.textlength(sub_line_text, font=font_sub_normal)
        sub_x = (WIDTH - total_sub_w) // 2
        
        curr_x = sub_x
        for cw_idx, cw in enumerate(current_words):
            is_active = (cw_idx == active_word_idx)
            w_font = font_sub_active if is_active else font_sub_normal
            w_color = "#facc15" if is_active else "#f8fafc"
            
            draw.text((curr_x, sub_box_y + 60), cw["word"] + " ", fill=w_color, font=w_font)
            curr_x += draw.textlength(cw["word"] + " ", font=font_sub_normal)

    # 7. Outro Card / Footer de Engajamento
    if t >= 33.0 or active_scene["title"] == "CENA 4: CTA & COMUNIDADE":
        # Card de CTA destacado
        draw.rounded_rectangle([70, 1560, WIDTH - 70, 1840], radius=16, fill=(17, 24, 39), outline=(168, 85, 247), width=2)
        draw.text((100, 1590), "🚀 SYRIUS TECH — ENGENHARIA & IA", fill="#a855f7", font=font_title)
        
        # Pílulas de Ação
        pills = [
            ("❤️ Curtir", "#ef4444"),
            ("💬 Comentar", "#38bdf8"),
            ("🚀 Compartilhar", "#10b981"),
            ("🔖 Salvar Post", "#f59e0b")
        ]
        pill_w = 210
        pill_gap = 14
        pill_start_x = (WIDTH - (len(pills) * pill_w + (len(pills) - 1) * pill_gap)) // 2
        
        for p_i, (p_text, p_col) in enumerate(pills):
            px = pill_start_x + p_i * (pill_w + pill_gap)
            draw.rounded_rectangle([px, 1680, px + pill_w, 1760], radius=12, fill=(30, 41, 59), outline=p_col, width=2)
            draw.text((px + 20, 1705), p_text, fill="#ffffff", font=font_badge)

    pipe.stdin.write(img.tobytes())

pipe.stdin.close()
pipe.wait()

print(f"\n🎉 VÍDEO MASTER RENDERIZADO COM SUCESSO!")
print(f"📁 Arquivo final: {OUTPUT_MP4} ({os.path.getsize(OUTPUT_MP4) / 1024 / 1024:.2f} MB)")
