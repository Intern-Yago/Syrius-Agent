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

if len(sys.argv) < 2:
    print("Uso: python render_reels_for_post.py <caminho_config_json>", file=sys.stderr)
    sys.exit(1)

config_path = sys.argv[1]
with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

post_id = config.get("postId", "unknown")
topic = config.get("topic", "Dica Dev")
voice_path = os.path.abspath(config["audioPath"])
output_mp4 = os.path.abspath(config["outputPath"])
scenes_data = config.get("scenes", [])

if not os.path.exists(voice_path):
    print(f"❌ Arquivo de voz não encontrado: {voice_path}", file=sys.stderr)
    sys.exit(1)

os.makedirs(os.path.dirname(output_mp4), exist_ok=True)
bg_music_path = os.path.abspath("output/reels-audio/background_music.mp3")
mixed_audio_path = os.path.join(os.path.dirname(output_mp4), f"temp_mixed_{post_id}.mp3")

# 1. Mixa voz com trilha de fundo Lo-Fi
print(f"🎛️ Mixando áudio neural ({os.path.basename(voice_path)})...")
voice_data, voice_sr = sf.read(voice_path)
if len(voice_data.shape) > 1:
    voice_data = np.mean(voice_data, axis=1)

total_duration = len(voice_data) / voice_sr

if os.path.exists(bg_music_path):
    bg_data, bg_sr = sf.read(bg_music_path)
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

sf.write(mixed_audio_path, final_audio, voice_sr)
print(f"✅ Áudio final mixado: {total_duration:.2f} segundos")

# 2. Transcrição Whisper AI com timestamps
print("🎙️ Transcrevendo palavras para sincronização com Whisper AI...")
whisper_model = whisper.load_model("base")
transcription = whisper_model.transcribe(
    voice_path,
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

# 3. Monta Cenas Proporcionais à duração
def wrap_code_lines(raw_lines, max_chars=40):
    wrapped = []
    for l in raw_lines:
        if len(l) <= max_chars:
            wrapped.append(l)
        else:
            indent = len(l) - len(l.lstrip())
            indent_str = " " * indent
            words = l.split(" ")
            cur = ""
            for w in words:
                if not cur:
                    cur = w
                elif len(cur) + 1 + len(w) <= max_chars:
                    cur += " " + w
                else:
                    wrapped.append(cur)
                    cur = indent_str + "  " + w
            if cur:
                wrapped.append(cur)
    return wrapped

num_scenes = len(scenes_data)
if num_scenes == 0:
    scenes_data = [
        {
            "badge": "⚡ SYRIUS TECH",
            "badge_color": "#38bdf8",
            "file_name": "solution.ts",
            "tag": "DEV_INSIGHTS",
            "lines": [
                f"// {topic[:35]}",
                "async function main() {",
                "  console.log('Arquitetura limpa');",
                "  return true;",
                "}"
            ]
        }
    ]
    num_scenes = 1

scene_duration = total_duration / num_scenes
SCENES = []
for i, s in enumerate(scenes_data):
    s_start = i * scene_duration
    s_end = (i + 1) * scene_duration if i < num_scenes - 1 else total_duration + 0.5
    s_type = min(scene_duration * 0.75, 7.5)
    raw_lines = s.get("lines", [f"// Cena {i+1}"])
    safe_lines = wrap_code_lines(raw_lines, max_chars=42)
    SCENES.append({
        "badge": s.get("badge", f"CENA {i+1}"),
        "badge_color": s.get("badge_color", "#38bdf8"),
        "file_name": s.get("file_name", f"module_{i+1}.ts"),
        "tag": s.get("tag", "CODE"),
        "lines": safe_lines,
        "time_start": s_start,
        "time_end": s_end,
        "type_duration": s_type,
    })

# Carrega fontes TTF do Windows
font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 34)
font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
font_headline = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 40)
font_file = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 24)
font_code = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 28)
font_subtitle = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 36)
font_footer = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)
font_stat_val = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 46)
font_stat_lbl = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20)

def syntax_color(line_text, word):
    w_strip = word.strip().rstrip(";,():{}[]")
    if line_text.strip().startswith("//") or line_text.strip().startswith("/*") or line_text.strip().startswith("*") or line_text.strip().startswith("*/"):
        return "#64748b"
    if w_strip in ["const", "let", "var", "async", "function", "return", "if", "throw", "new", "try", "catch", "await", "import", "export", "describe", "test", "it", "expect", "vi", "spyOn", "toThrow"]:
        return "#c084fc"
    if w_strip in ["?=", "=>", "===", "!==", "+=", "-=", "toBe", "toHaveBeenCalledTimes", "resolves"]:
        return "#38bdf8"
    if word.startswith("'") or word.startswith('"') or word.startswith("`"):
        return "#4ade80"
    if "error" in word.lower() or "err" in word.lower() or "bug" in word.lower() or "fail" in word.lower():
        return "#f87171"
    if "pass" in word.lower() or "✓" in word or "✅" in word:
        return "#34d399"
    return "#f8fafc"

def get_typed_content(lines, progress):
    full_text = "\n".join(lines)
    total_chars = len(full_text)
    visible_chars = int(min(1.0, progress) * total_chars)
    typed_text = full_text[:visible_chars]
    return typed_text.split("\n"), (visible_chars < total_chars)

num_frames = int(total_duration * FPS)
print(f"Renderizando {num_frames} frames do video de Reels com Multi-Layout ({output_mp4})...")

cmd = [
    "ffmpeg", "-y",
    "-f", "rawvideo",
    "-vcodec", "rawvideo",
    "-s", f"{WIDTH}x{HEIGHT}",
    "-pix_fmt", "rgb24",
    "-r", str(FPS),
    "-i", "-",
    "-i", mixed_audio_path,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    output_mp4
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
    
    cursor_visible = is_still_typing or (int(t * 2) % 2 == 0)
    layout = active_scene.get("layout", "CODE_EDITOR")

    # 3. Header Superior (Branding e Badge da Cena)
    header_y = 70
    draw.text((60, header_y + 10), "@syrius_tech", fill="#38bdf8", font=font_title)
    
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

    # 4. RENDERIZADOR MULTI-LAYOUT
    card_x = 50
    card_y = 150
    card_w = WIDTH - 100
    card_h = 1340

    if layout == "TECH_NEWS":
        # LAYOUT: TECH NEWS (Manchete + Bullets + Metricas)
        draw.rounded_rectangle(
            [card_x + 4, card_y + 8, card_x + card_w + 4, card_y + card_h + 8],
            radius=20, fill=(0, 0, 0)
        )
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=20, fill=(13, 17, 26), outline=(56, 189, 248), width=2
        )
        # Top banner
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 70],
            radius=20, fill=(20, 27, 44)
        )
        draw.rectangle([card_x, card_y + 40, card_x + card_w, card_y + 70], fill=(20, 27, 44))
        draw.text((card_x + 30, card_y + 22), "BREAKING TECH UPDATE", fill="#38bdf8", font=font_file)
        
        # Headline
        headline = active_scene.get("headline", active_scene.get("header_title", "Novidade Tech"))
        draw.text((card_x + 30, card_y + 110), headline[:38], fill="#ffffff", font=font_headline)

        # Bullets / Lines
        line_start_y = card_y + 240
        for l_idx, line in enumerate(typed_lines):
            ly = line_start_y + l_idx * 70
            draw.ellipse([card_x + 34, ly + 8, card_x + 46, ly + 20], fill="#38bdf8")
            draw.text((card_x + 65, ly), line, fill="#e2e8f0", font=font_code)

        # Metrics box (se houver)
        metrics = active_scene.get("metrics", [])
        if metrics:
            m = metrics[0]
            m_box_y = card_y + card_h - 220
            draw.rounded_rectangle(
                [card_x + 30, m_box_y, card_x + card_w - 30, m_box_y + 160],
                radius=14, fill=(15, 23, 42), outline=(56, 189, 248, 120), width=1
            )
            draw.text((card_x + 50, m_box_y + 24), str(m.get("value", "")), fill="#38bdf8", font=font_stat_val)
            draw.text((card_x + 50, m_box_y + 90), str(m.get("label", "")).upper(), fill="#94a3b8", font=font_stat_lbl)

    elif layout == "BROWSER_MOCKUP":
        # LAYOUT: BROWSER MOCKUP (WebUI / Documentacao / GitHub Repo)
        draw.rounded_rectangle(
            [card_x + 4, card_y + 8, card_x + card_w + 4, card_y + card_h + 8],
            radius=20, fill=(0, 0, 0)
        )
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=20, fill=(11, 15, 25), outline=(147, 51, 234), width=2
        )
        # Browser top bar
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 65],
            radius=20, fill=(22, 27, 38)
        )
        draw.rectangle([card_x, card_y + 40, card_x + card_w, card_y + 65], fill=(22, 27, 38))
        # Dots
        draw.ellipse([card_x + 24, card_y + 22, card_x + 44, card_y + 42], fill="#ff5f56")
        draw.ellipse([card_x + 54, card_y + 22, card_x + 74, card_y + 42], fill="#ffbd2e")
        draw.ellipse([card_x + 84, card_y + 22, card_x + 104, card_y + 42], fill="#27c93f")
        # URL bar
        url_text = active_scene.get("header_title", "https://github.com/repo")
        draw.rounded_rectangle(
            [card_x + 130, card_y + 14, card_x + card_w - 30, card_y + 52],
            radius=8, fill=(13, 17, 23), outline=(48, 54, 61), width=1
        )
        draw.text((card_x + 145, card_y + 22), url_text[:45], fill="#94a3b8", font=font_file)

        # Content area
        headline = active_scene.get("headline", "Interface & Documentacao")
        draw.text((card_x + 30, card_y + 110), headline[:38], fill="#ffffff", font=font_headline)

        line_start_y = card_y + 230
        for l_idx, line in enumerate(typed_lines):
            ly = line_start_y + l_idx * 65
            draw.text((card_x + 40, ly), line, fill="#cbd5e1", font=font_code)

    elif layout == "TERMINAL_CLI":
        # LAYOUT: TERMINAL CLI (Comandos reais de linha de comando)
        draw.rounded_rectangle(
            [card_x + 4, card_y + 8, card_x + card_w + 4, card_y + card_h + 8],
            radius=20, fill=(0, 0, 0)
        )
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=20, fill=(10, 15, 20), outline=(16, 185, 129), width=2
        )
        # Terminal top bar
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 55],
            radius=20, fill=(18, 24, 32)
        )
        draw.rectangle([card_x, card_y + 35, card_x + card_w, card_y + 55], fill=(18, 24, 32))
        draw.ellipse([card_x + 24, card_y + 18, card_x + 44, card_y + 38], fill="#ff5f56")
        draw.ellipse([card_x + 54, card_y + 18, card_x + 74, card_y + 38], fill="#ffbd2e")
        draw.ellipse([card_x + 84, card_y + 18, card_x + 104, card_y + 38], fill="#27c93f")
        draw.text((card_x + 130, card_y + 18), "bash - 80x24", fill="#94a3b8", font=font_file)

        line_start_y = card_y + 90
        line_h = 58
        for l_idx, line in enumerate(typed_lines):
            ly = line_start_y + l_idx * line_h
            if line.startswith("$"):
                draw.text((card_x + 30, ly), line, fill="#34d399", font=font_code)
            elif "[✓]" in line or "sucesso" in line.lower() or "pass" in line.lower():
                draw.text((card_x + 30, ly), line, fill="#38bdf8", font=font_code)
            else:
                draw.text((card_x + 30, ly), line, fill="#cbd5e1", font=font_code)

            if l_idx == len(typed_lines) - 1 and cursor_visible:
                tb = font_code.getbbox(line + " ")
                cx = card_x + 30 + (tb[2] - tb[0])
                draw.rectangle([cx, ly - 2, cx + 4, ly + 30], fill="#34d399")

    else:
        # LAYOUT PADRAO: CODE_EDITOR (VS Code com Syntax Highlighting)
        draw.rounded_rectangle(
            [card_x + 4, card_y + 8, card_x + card_w + 4, card_y + card_h + 8],
            radius=20, fill=(0, 0, 0)
        )
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=20, fill=(13, 17, 23), outline=(48, 54, 61), width=2
        )
        # Barra de Titulo macOS
        titlebar_h = 60
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + titlebar_h],
            radius=20, fill=(22, 27, 34)
        )
        draw.rectangle([card_x, card_y + 35, card_x + card_w, card_y + titlebar_h], fill=(22, 27, 34))
        draw.ellipse([card_x + 24, card_y + 20, card_x + 44, card_y + 40], fill="#ff5f56")
        draw.ellipse([card_x + 54, card_y + 20, card_x + 74, card_y + 40], fill="#ffbd2e")
        draw.ellipse([card_x + 84, card_y + 20, card_x + 104, card_y + 40], fill="#27c93f")
        
        tab_x = card_x + 130
        tab_w = 340
        draw.rectangle([tab_x, card_y + 12, tab_x + tab_w, card_y + titlebar_h], fill=(13, 17, 23))
        draw.line([(tab_x, card_y + 12), (tab_x + tab_w, card_y + 12)], fill="#38bdf8", width=3)
        file_name = active_scene.get("file_name", "main.ts")
        draw.text((tab_x + 20, card_y + 22), file_name, fill="#f8fafc", font=font_file)

        code_start_y = card_y + 90
        line_h = 54
        for l_idx, line in enumerate(typed_lines):
            line_y = code_start_y + l_idx * line_h
            num_str = str(l_idx + 1).rjust(2)
            draw.text((card_x + 24, line_y), num_str, fill="#475569", font=font_code)
            draw.line([(card_x + 75, card_y + titlebar_h), (card_x + 75, card_y + card_h - 20)], fill=(30, 41, 59), width=1)
            
            text_x = card_x + 95
            tokens = line.split(" ")
            curr_x = text_x
            for token in tokens:
                color = syntax_color(line, token)
                draw.text((curr_x, line_y), token + " ", fill=color, font=font_code)
                tb = font_code.getbbox(token + " ")
                curr_x += (tb[2] - tb[0])
                
            if l_idx == len(typed_lines) - 1 and cursor_visible:
                draw.rectangle([curr_x, line_y - 2, curr_x + 4, line_y + 32], fill="#38bdf8")

    # 6. LEGENDA KARAOKE SINCRONIZADA COM WHISPER AI
    active_idx = -1
    for idx_w, w in enumerate(words_list):
        if w["start"] <= t <= w["end"]:
            active_idx = idx_w
            break
            
    if active_idx != -1:
        start_sub = max(0, active_idx - 2)
        end_sub = min(len(words_list), active_idx + 4)
        sub_slice = words_list[start_sub:end_sub]
        
        sub_box_y = 1530
        sub_box_h = 110
        
        draw.rounded_rectangle(
            [50, sub_box_y, WIDTH - 50, sub_box_y + sub_box_h],
            radius=16,
            fill=(10, 15, 26),
            outline=(56, 189, 248, 120),
            width=2
        )
        
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
            w_color = "#facc15" if is_active_word else "#ffffff"
            draw.text((sub_cur_x, sub_box_y + 32), item["word"] + " ", fill=w_color, font=font_subtitle)
            sub_cur_x += word_widths[w_i]
            
    # 7. Rodapé Fixo
    footer_y = 1840
    draw.text((WIDTH // 2, footer_y), f"💡 Siga @syrius_tech para dominar tecnologia e programação", fill="#94a3b8", font=font_footer, anchor="mm")

    pipe.stdin.write(img.tobytes())

pipe.stdin.close()
pipe.wait()

print(f"🎉 VÍDEO RENDERIZADO COM SUCESSO EM: {output_mp4}")
