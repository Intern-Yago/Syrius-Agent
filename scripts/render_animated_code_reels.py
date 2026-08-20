import os
import sys
import json
import subprocess
import shutil
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
import soundfile as sf
import whisper

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

WIDTH = 1080
HEIGHT = 1920
FPS = 30

VOICE_CANDIDATES = [
    os.path.abspath("output/reels-audio/reels_cmsz3yt5y0000t4t8hp1alvem.mp3"),
    os.path.abspath("output/reels-audio/reels_ecmascript_safe_assignment.mp3"),
]

VOICE_PATH = next((p for p in VOICE_CANDIDATES if os.path.exists(p)), None)
if not VOICE_PATH:
    print("❌ Arquivo de áudio não encontrado.")
    sys.exit(1)

BG_MUSIC_PATH = os.path.abspath("output/reels-audio/background_music.mp3")
OUTPUT_DIR = os.path.abspath("output/reels-video")
os.makedirs(OUTPUT_DIR, exist_ok=True)

MIXED_AUDIO_PATH = os.path.join(OUTPUT_DIR, "temp_animated_mixed.mp3")

# Mixa áudio
print(f"🎛️ Mixando áudio neural ({os.path.basename(VOICE_PATH)})...")
voice_data, voice_sr = sf.read(VOICE_PATH)
if len(voice_data.shape) > 1:
    voice_data = np.mean(voice_data, axis=1)

total_duration = len(voice_data) / voice_sr

if os.path.exists(BG_MUSIC_PATH):
    bg_data, bg_sr = sf.read(BG_MUSIC_PATH)
    if len(bg_data.shape) > 1:
        bg_data = np.mean(bg_data, axis=1)
    if bg_sr != voice_sr:
        import scipy.signal
        bg_data = scipy.signal.resample(bg_data, int(len(bg_data) * voice_sr / bg_sr))
    target_samples = int(total_duration * voice_sr)
    if len(bg_data) < target_samples:
        repeats = int(np.ceil(target_samples / len(bg_data)))
        bg_data = np.tile(bg_data, repeats)
    bg_data = bg_data[:target_samples] * 0.10
    final_audio = (voice_data * 1.0) + bg_data
else:
    final_audio = voice_data

sf.write(MIXED_AUDIO_PATH, final_audio, voice_sr)
print(f"✅ Áudio final mixado: {total_duration:.2f} segundos")

# Transcrição Whisper com timestamps de palavras
print("🎙️ Transcrevendo palavras para sincronização com Whisper AI...")
whisper_model = whisper.load_model("base")
transcription = whisper_model.transcribe(
    VOICE_PATH,
    language="pt",
    word_timestamps=True,
    verbose=False
)

words_list = []
for segment in transcription.get("segments", []):
    for w in segment.get("words", []):
        word_clean = w["word"].strip()
        if word_clean:
            words_list.append({
                "word": word_clean,
                "start": w["start"],
                "end": w["end"]
            })

print(f"✅ {len(words_list)} palavras sincronizadas.")

# Definição das Cenas com Código Animado
SCENES = [
    {
        "badge": "⚡ ECMASCRIPT 2025",
        "badge_color": "#38bdf8",
        "file_name": "legacy_api.ts",
        "tag": "O_PROBLEMA_TRY_CATCH",
        "lines": [
            "// 💀 O inferno do Try/Catch no JavaScript",
            "async function loadUserProfile(userId: string) {",
            "  try {",
            "    const res = await fetch(`/api/user/${userId}`);",
            "    const data = await res.json();",
            "    return data;",
            "  } catch (error) {",
            "    console.error('Erro na requisição:', error);",
            "    throw new Error('Falha ao carregar');",
            "  }",
            "}"
        ],
        "time_start": 0.0,
        "time_end": 7.0,
        "type_duration": 4.5,
    },
    {
        "badge": "⚠️ ESCOPOS ANINHADOS",
        "badge_color": "#ef4444",
        "file_name": "checkout_nested.ts",
        "tag": "PIRAMIDE_DE_TRATAMENTO",
        "lines": [
            "// 💥 Pirâmide de try/catch poluindo o escopo...",
            "try {",
            "  const user = await getUser();",
            "  try {",
            "    const payment = await processPayment(user);",
            "    try {",
            "      await sendReceipt(payment);",
            "    } catch (errReceipt) { ... }",
            "  } catch (errPay) { ... }",
            "} catch (errUser) { ... }"
        ],
        "time_start": 7.0,
        "time_end": 17.5,
        "type_duration": 6.5,
    },
    {
        "badge": "🚀 NOVO OPERADOR ?=",
        "badge_color": "#10b981",
        "file_name": "safe_assignment.ts",
        "tag": "CLEAN_CODE_TUPLE_PATTERN",
        "lines": [
            "// ✨ Safe Assignment Operator (?=) — Clean Code!",
            "async function loadUserProfile(userId: string) {",
            "  const [fetchErr, res] = ?= await fetch(`/api/user/${userId}`);",
            "  if (fetchErr) return handleNetworkError(fetchErr);",
            "",
            "  const [parseErr, data] = ?= await res.json();",
            "  if (parseErr) return handleParseError(parseErr);",
            "",
            "  return data; // Zero try/catch blocks! 🚀",
            "}"
        ],
        "time_start": 17.5,
        "time_end": 34.0,
        "type_duration": 9.0,
    },
    {
        "badge": "💡 RESUMO EXECUTIVO",
        "badge_color": "#a855f7",
        "file_name": "ecmascript_summary.ts",
        "tag": "PADRAO_GO_E_RUST_NO_JS",
        "lines": [
            "/*",
            "  🔥 Principais Vantagens do Operador ?=:",
            "  ",
            "  1. [error, result] no formato de tupla",
            "  2. Variáveis permanecem no escopo correto",
            "  3. Elimina indentação e pirâmides try/catch",
            "  ",
            "  ❤️ Curta & Compartilhe com seu time",
            "  🚀 Siga @syrius_tech para novidades diárias!",
            "*/"
        ],
        "time_start": 34.0,
        "time_end": total_duration + 0.5,
        "type_duration": 6.0,
    }
]

# Carrega fontes TTF do Windows
font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 34)
font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
font_file = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 24)
font_code = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 26)
font_subtitle = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 36)
font_footer = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)

def syntax_color(line_text, word):
    if line_text.strip().startswith("//") or line_text.strip().startswith("/*") or line_text.strip().startswith("*") or line_text.strip().startswith("*/"):
        return "#64748b" # Cinza comentário
    if word in ["const", "let", "var", "async", "function", "return", "if", "throw", "new", "try", "catch", "await"]:
        return "#c084fc" # Roxo palavra-chave
    if word in ["?=", "=>", "===", "!=="]:
        return "#38bdf8" # Ciano neon operador
    if word.startswith("'") or word.startswith('"') or word.startswith("`"):
        return "#4ade80" # Verde string
    if "error" in word.lower() or "err" in word.lower() or "💀" in word or "💥" in word:
        return "#f87171" # Vermelho erro
    return "#f8fafc" # Branco código

def get_typed_content(lines, progress):
    """Calcula o texto que deve estar visível baseado no progresso da cena (0.0 a 1.0)"""
    full_text = "\n".join(lines)
    total_chars = len(full_text)
    visible_chars = int(min(1.0, progress) * total_chars)
    typed_text = full_text[:visible_chars]
    return typed_text.split("\n"), (visible_chars < total_chars)

num_frames = int(total_duration * FPS)
print(f"🎬 Renderizando {num_frames} frames do vídeo de alto foco em código...")

targets_to_render = [
    os.path.join(OUTPUT_DIR, "reels_cmsytovaq0000n0t8hwifowug.mp4"),
    os.path.join(OUTPUT_DIR, "reels_cmsz5rk4e0000gwt8usjs4ic3.mp4"),
    os.path.join(OUTPUT_DIR, "reels_cmsz3yt5y0000t4t8hp1alvem.mp4"),
]

PRIMARY_OUTPUT = targets_to_render[0]

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
    "-preset", "veryfast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    PRIMARY_OUTPUT
]

pipe = subprocess.Popen(cmd, stdin=subprocess.PIPE)

for f_idx in range(num_frames):
    t = f_idx / FPS
    
    # 1. Canvas Fundo Escuro com Gradiente
    img = Image.new("RGB", (WIDTH, HEIGHT), "#080c14")
    draw = ImageDraw.Draw(img)
    
    # Grid de fundo sutil
    for gy in range(0, HEIGHT, 80):
        draw.line([(0, gy), (WIDTH, gy)], fill=(15, 23, 42), width=1)
    for gx in range(0, WIDTH, 80):
        draw.line([(gx, 0), (gx, HEIGHT)], fill=(15, 23, 42), width=1)
    
    # 2. Determina a Cena Ativa
    active_scene = SCENES[0]
    for s in SCENES:
        if s["time_start"] <= t < s["time_end"]:
            active_scene = s
            break
            
    scene_elapsed = t - active_scene["time_start"]
    type_prog = min(1.0, scene_elapsed / active_scene["type_duration"])
    typed_lines, is_still_typing = get_typed_content(active_scene["lines"], type_prog)
    
    # Cursor piscante a cada 500ms
    cursor_visible = is_still_typing or (int(t * 2) % 2 == 0)

    # 3. Header Superior (Badge e Branding)
    header_y = 70
    draw.text((60, header_y + 10), "@syrius_tech", fill="#38bdf8", font=font_title)
    
    # Badge Flutuante no Topo
    badge_text = active_scene["badge"]
    bbox = font_badge.getbbox(badge_text)
    badge_w = (bbox[2] - bbox[0]) + 36
    badge_h = 44
    badge_x = WIDTH - 60 - badge_w
    
    draw.rounded_rectangle(
        [badge_x, header_y + 8, badge_x + badge_w, header_y + 8 + badge_h],
        radius=12,
        fill=active_scene["badge_color"]
    )
    draw.text((badge_x + 18, header_y + 18), badge_text, fill="#ffffff", font=font_badge)

    # 4. MOCKUP GIGANTE DO VS CODE (Foco Total no Código: 80% da Tela)
    editor_x = 50
    editor_y = 150
    editor_w = WIDTH - 100
    editor_h = 1360
    
    # Sombra do Editor
    draw.rounded_rectangle(
        [editor_x + 4, editor_y + 8, editor_x + editor_w + 4, editor_y + editor_h + 8],
        radius=20,
        fill=(0, 0, 0)
    )
    
    # Fundo do Editor (Tema Dark VS Code #0d1117)
    draw.rounded_rectangle(
        [editor_x, editor_y, editor_x + editor_w, editor_y + editor_h],
        radius=20,
        fill=(13, 17, 23),
        outline=(48, 54, 61),
        width=2
    )
    
    # Barra de Título do macOS
    titlebar_h = 60
    draw.rounded_rectangle(
        [editor_x, editor_y, editor_x + editor_w, editor_y + titlebar_h],
        radius=20,
        fill=(22, 27, 34)
    )
    draw.rectangle([editor_x, editor_y + 35, editor_x + editor_w, editor_y + titlebar_h], fill=(22, 27, 34))
    
    # Botões Janela (Vermelho, Amarelo, Verde)
    draw.ellipse([editor_x + 24, editor_y + 20, editor_x + 44, editor_y + 40], fill="#ff5f56")
    draw.ellipse([editor_x + 54, editor_y + 20, editor_x + 74, editor_y + 40], fill="#ffbd2e")
    draw.ellipse([editor_x + 84, editor_y + 20, editor_x + 104, editor_y + 40], fill="#27c93f")
    
    # Aba do Arquivo Ativo
    tab_x = editor_x + 130
    tab_w = 320
    draw.rectangle([tab_x, editor_y + 12, tab_x + tab_w, editor_y + titlebar_h], fill=(13, 17, 23))
    draw.line([(tab_x, editor_y + 12), (tab_x + tab_w, editor_y + 12)], fill="#38bdf8", width=3)
    draw.text((tab_x + 20, editor_y + 22), f"📄 {active_scene['file_name']}", fill="#f8fafc", font=font_file)

    # 5. RENDERIZAÇÃO DO CÓDIGO ANIMADO (Linha por Linha com Destaque Sintático)
    code_start_y = editor_y + 90
    line_h = 52
    
    for l_idx, line in enumerate(typed_lines):
        line_y = code_start_y + l_idx * line_h
        
        # Destaque de fundo suave se for a linha do operador ?=
        if "?=" in line:
            draw.rounded_rectangle(
                [editor_x + 10, line_y - 6, editor_x + editor_w - 10, line_y + line_h - 10],
                radius=8,
                fill=(16, 185, 129, 30),
                outline=(52, 211, 153, 120),
                width=1
            )
        
        # Número da Linha
        num_str = str(l_idx + 1).rjust(2)
        draw.text((editor_x + 24, line_y), num_str, fill="#475569", font=font_code)
        
        # Linha Divisória de Numeração
        draw.line([(editor_x + 70, editor_y + titlebar_h), (editor_x + 70, editor_y + editor_h - 20)], fill=(30, 41, 59), width=1)
        
        # Renderização do Texto do Código
        text_x = editor_x + 90
        
        # Colorização Sintática por Tokens
        tokens = line.split(" ")
        curr_x = text_x
        for token in tokens:
            color = syntax_color(line, token)
            draw.text((curr_x, line_y), token + " ", fill=color, font=font_code)
            # Mede largura do token
            tb = font_code.getbbox(token + " ")
            curr_x += (tb[2] - tb[0])
            
        # Desenha o cursor piscante na última linha digitada
        if l_idx == len(typed_lines) - 1 and cursor_visible:
            draw.rectangle([curr_x, line_y - 2, curr_x + 4, line_y + 30], fill="#38bdf8")

    # 6. LEGENDA KARAOKE SINCRONIZADA COM WHISPER AI (No Rodapé)
    current_words = [w for w in words_list if w["start"] - 0.2 <= t <= w["end"] + 0.35]
    
    # Pega a frase local (contexto de 5 a 7 palavras ao redor)
    active_idx = -1
    for idx_w, w in enumerate(words_list):
        if w["start"] <= t <= w["end"]:
            active_idx = idx_w
            break
            
    if active_idx != -1:
        start_sub = max(0, active_idx - 2)
        end_sub = min(len(words_list), active_idx + 4)
        sub_slice = words_list[start_sub:end_sub]
        
        sub_box_y = 1550
        sub_box_h = 100
        
        # Backdrop de Legenda
        draw.rounded_rectangle(
            [60, sub_box_y, WIDTH - 60, sub_box_y + sub_box_h],
            radius=16,
            fill=(10, 15, 26),
            outline=(56, 189, 248, 80),
            width=1
        )
        
        # Calcula largura total para centralizar
        total_sub_w = 0
        word_widths = []
        for item in sub_slice:
            wb = font_subtitle.getbbox(item["word"] + " ")
            w_width = wb[2] - wb[0]
            word_widths.append(w_width)
            total_sub_w += w_width
            
        sub_cur_x = (WIDTH - total_sub_w) // 2
        for w_i, item in enumerate(sub_slice):
            is_active_word = (item["start"] <= t <= item["end"])
            w_color = "#facc15" if is_active_word else "#ffffff" # Amarelo vibrante na palavra ativa
            draw.text((sub_cur_x, sub_box_y + 28), item["word"] + " ", fill=w_color, font=font_subtitle)
            sub_cur_x += word_widths[w_i]
            
    # 7. Rodapé Fixo
    footer_y = 1840
    draw.text((WIDTH // 2, footer_y), "💡 Siga @syrius_tech para dominar o JavaScript moderno", fill="#94a3b8", font=font_footer, anchor="mm")

    # Envia frame para FFmpeg
    pipe.stdin.write(img.tobytes())

pipe.stdin.close()
pipe.wait()

print(f"\n🎉 VÍDEO RENDERIZADO COM SUCESSO EM: {PRIMARY_OUTPUT}")

# Copia para todos os posts de ECMAScript do banco
for target in targets_to_render[1:]:
    shutil.copyfile(PRIMARY_OUTPUT, target)
    print(f"📁 Copiado para: {os.path.basename(target)}")

print("🚀 Todos os vídeos de Reels com animação de código foram sincronizados!")
