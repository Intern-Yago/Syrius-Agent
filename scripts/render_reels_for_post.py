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
        "layout": s.get("layout", "CODE_EDITOR"),
        "badge": s.get("badge", f"CENA {i+1}"),
        "badge_color": s.get("badge_color", "#38bdf8"),
        "file_name": s.get("file_name", s.get("header_title", f"module_{i+1}.ts")),
        "header_title": s.get("header_title", s.get("file_name", "https://syrius.dev")),
        "headline": s.get("headline", ""),
        "tag": s.get("tag", "CODE"),
        "metrics": s.get("metrics", []),
        "lines": safe_lines,
        "time_start": s_start,
        "time_end": s_end,
        "type_duration": s_type,
    })

# Carrega fontes TTF do Windows
font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 36)
font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 22)
font_headline = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 40)
font_file = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 24)
font_text = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
font_text_bold = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 26)
font_code = ImageFont.truetype("C:/Windows/Fonts/consola.ttf", 28)
font_subtitle = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 36)
font_footer = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 22)
font_stat_val = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 48)
font_stat_lbl = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)

def draw_checkmark(draw, cx, cy, radius=14, color="#34d399"):
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=color)
    draw.line([(cx - 7, cy), (cx - 2, cy + 5), (cx + 7, cy - 5)], fill="#ffffff", width=3)

def draw_lock_icon(draw, x, y):
    draw.rounded_rectangle([x, y + 6, x + 16, y + 20], radius=3, fill="#34d399")
    draw.arc([x + 3, y, x + 13, y + 10], start=180, end=0, fill="#34d399", width=2)

def draw_aurora_background(img):
    draw = ImageDraw.Draw(img)
    # Smooth vertical gradient (Navy -> Slate)
    for y in range(HEIGHT):
        r = int(10 + (20 - 10) * (y / HEIGHT))
        g = int(15 + (28 - 15) * (y / HEIGHT))
        b = int(30 + (50 - 30) * (y / HEIGHT))
        draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
    
    # Modern subtle dot grid
    for y in range(0, HEIGHT, 50):
        for x in range(0, WIDTH, 50):
            draw.point((x, y), fill=(45, 60, 95))

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
    
    # 1. Canvas Fundo Aurora Wallpaper Moderno
    img = Image.new("RGB", (WIDTH, HEIGHT), "#0a0e1a")
    draw_aurora_background(img)
    draw = ImageDraw.Draw(img)
    
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
    header_y = 65
    draw.text((60, header_y + 8), "@syrius_tech", fill="#38bdf8", font=font_title)
    
    badge_text = active_scene["badge"]
    bbox = font_badge.getbbox(badge_text)
    badge_w = (bbox[2] - bbox[0]) + 36
    badge_h = 44
    badge_x = WIDTH - 60 - badge_w
    
    draw.rounded_rectangle(
        [badge_x, header_y + 4, badge_x + badge_w, header_y + 4 + badge_h],
        radius=12,
        fill=active_scene["badge_color"]
    )
    draw.text((badge_x + 18, header_y + 14), badge_text, fill="#ffffff", font=font_badge)

    # 4. RENDERIZADOR MULTI-LAYOUT
    card_x = 45
    card_y = 140
    card_w = WIDTH - 90
    card_h = 1360

    # Window Drop Shadow
    for s_i in range(12, 0, -2):
        draw.rounded_rectangle(
            [card_x - s_i, card_y - s_i + 12, card_x + card_w + s_i, card_y + card_h + s_i + 12],
            radius=28, fill=(0, 0, 0)
        )

    if layout == "ALT_TAB_SWITCHING":
        # CHROME / ARC BROWSER WINDOW COM TROCA REAL DE PÁGINAS NO ALT-TAB
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=24, fill=(18, 20, 28), outline=(239, 68, 68), width=3
        )
        
        # Browser Top Bar
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 75],
            radius=24, fill=(30, 33, 46)
        )
        draw.rectangle([card_x, card_y + 35, card_x + card_w, card_y + 75], fill=(30, 33, 46))
        
        # Mac buttons
        draw.ellipse([card_x + 24, card_y + 24, card_x + 46, card_y + 46], fill="#ff5f56")
        draw.ellipse([card_x + 56, card_y + 24, card_x + 78, card_y + 46], fill="#ffbd2e")
        draw.ellipse([card_x + 88, card_y + 24, card_x + 110, card_y + 46], fill="#27c93f")
        
        # Tabs animadas (0: ChatGPT, 1: Stack Overflow, 2: GitHub Docs)
        tab_y = card_y + 14
        active_tab_idx = int(t * 1.8) % 3
        
        draw.rounded_rectangle([card_x + 130, tab_y, card_x + 360, tab_y + 52], radius=8, fill=(18, 20, 28) if active_tab_idx == 0 else (38, 42, 58), outline=(239, 68, 68) if active_tab_idx == 0 else None, width=2)
        draw.ellipse([card_x + 144, tab_y + 16, card_x + 164, tab_y + 36], fill="#10a37f")
        draw.text((card_x + 174, tab_y + 14), "ChatGPT (IA)", fill="#ffffff" if active_tab_idx == 0 else "#94a3b8", font=font_file)

        draw.rounded_rectangle([card_x + 375, tab_y, card_x + 600, tab_y + 52], radius=8, fill=(18, 20, 28) if active_tab_idx == 1 else (38, 42, 58), outline=(239, 68, 68) if active_tab_idx == 1 else None, width=2)
        draw.text((card_x + 395, tab_y + 14), "Stack Overflow", fill="#ffffff" if active_tab_idx == 1 else "#94a3b8", font=font_file)

        draw.rounded_rectangle([card_x + 615, tab_y, card_x + 830, tab_y + 52], radius=8, fill=(18, 20, 28) if active_tab_idx == 2 else (38, 42, 58), outline=(239, 68, 68) if active_tab_idx == 2 else None, width=2)
        draw.text((card_x + 635, tab_y + 14), "GitHub Docs", fill="#ffffff" if active_tab_idx == 2 else "#94a3b8", font=font_file)

        # URL Bar Dinâmica
        url_y = card_y + 90
        urls = [
            "https://chatgpt.com/c/senior-dev-assistant",
            "https://stackoverflow.com/questions/92841/deploy-cli",
            "https://docs.github.com/en/actions/deployment/pipeline"
        ]
        draw.rounded_rectangle([card_x + 24, url_y, card_x + card_w - 24, url_y + 54], radius=10, fill=(13, 15, 22), outline=(55, 65, 81), width=1)
        draw_lock_icon(draw, card_x + 40, url_y + 16)
        draw.text((card_x + 68, url_y + 12), urls[active_tab_idx], fill="#94a3b8", font=font_file)

        # Warning Context Switch Banner
        warn_y = card_y + 165
        draw.rounded_rectangle([card_x + 24, warn_y, card_x + card_w - 24, warn_y + 95], radius=14, fill=(45, 16, 22), outline=(239, 68, 68), width=2)
        draw.text((card_x + 44, warn_y + 14), "PERDA DE FOCO: ALT-TAB CONTÍNUO", fill="#ef4444", font=font_badge)
        draw.text((card_x + 44, warn_y + 48), "40% do dia perdido alternando entre 10 abas do navegador e a IDE", fill="#fca5a5", font=font_text)

        # CONTEÚDO DINÂMICO QUE REALMENTE TROCA COM A ABA:
        if active_tab_idx == 0:
            # TELA 1: CHATGPT WEB
            u_chat_y = card_y + 285
            draw.rounded_rectangle([card_x + 140, u_chat_y, card_x + card_w - 24, u_chat_y + 110], radius=16, fill=(38, 44, 62), outline=(56, 189, 248), width=1)
            draw.text((card_x + 160, u_chat_y + 16), "Você (Dev no Navegador):", fill="#38bdf8", font=font_file)
            draw.text((card_x + 160, u_chat_y + 54), "\"Como configuro essa pipeline sem quebrar?\"", fill="#ffffff", font=font_text_bold)

            ai_chat_y = card_y + 420
            draw.rounded_rectangle([card_x + 24, ai_chat_y, card_x + card_w - 100, ai_chat_y + 240], radius=16, fill=(26, 30, 42), outline=(16, 185, 129), width=2)
            draw.ellipse([card_x + 44, ai_chat_y + 20, card_x + 84, ai_chat_y + 60], fill="#10a37f")
            draw.text((card_x + 54, ai_chat_y + 26), "IA", fill="#ffffff", font=font_badge)
            draw.text((card_x + 98, ai_chat_y + 26), "ChatGPT 4o:", fill="#34d399", font=font_file)
            draw.text((card_x + 44, ai_chat_y + 80), "1. Copie este bloco longo de script...", fill="#cbd5e1", font=font_text)
            draw.text((card_x + 44, ai_chat_y + 125), "2. Abra seu editor, cole e ajuste o contexto...", fill="#cbd5e1", font=font_text)
            draw.text((card_x + 44, ai_chat_y + 175), "-> Aí você dá Alt-Tab de novo e perdeu o foco!", fill="#f87171", font=font_text_bold)

            input_y = card_y + 685
            draw.rounded_rectangle([card_x + 24, input_y, card_x + card_w - 24, input_y + 65], radius=12, fill=(13, 15, 22), outline=(75, 85, 99), width=1)
            draw.text((card_x + 44, input_y + 18), "Mensagem para o ChatGPT...", fill="#64748b", font=font_text)
            draw.rounded_rectangle([card_x + card_w - 85, input_y + 10, card_x + card_w - 35, input_y + 55], radius=8, fill="#38bdf8")
            draw.text((card_x + card_w - 68, input_y + 16), ">", fill="#000000", font=font_badge)

        elif active_tab_idx == 1:
            # TELA 2: STACK OVERFLOW
            so_box_y = card_y + 285
            draw.rounded_rectangle([card_x + 24, so_box_y, card_x + card_w - 24, so_box_y + 465], radius=16, fill=(24, 26, 38), outline=(249, 115, 22), width=2)
            draw.text((card_x + 44, so_box_y + 20), "STACK OVERFLOW — PERGUNTA DA COMUNIDADE", fill="#f97316", font=font_badge)
            draw.text((card_x + 44, so_box_y + 65), "Q: Como rodar deploy via CLI sem erros de OOM?", fill="#ffffff", font=font_text_bold)
            
            # Tags
            draw.rounded_rectangle([card_x + 44, so_box_y + 115, card_x + 160, so_box_y + 155], radius=6, fill=(40, 48, 70))
            draw.text((card_x + 58, so_box_y + 122), "[docker]", fill="#38bdf8", font=font_file)
            draw.rounded_rectangle([card_x + 175, so_box_y + 115, card_x + 280, so_box_y + 155], radius=6, fill=(40, 48, 70))
            draw.text((card_x + 190, so_box_y + 122), "[linux]", fill="#38bdf8", font=font_file)

            # Resposta Aceita
            ans_y = so_box_y + 180
            draw.rounded_rectangle([card_x + 44, ans_y, card_x + card_w - 44, ans_y + 160], radius=12, fill=(18, 35, 30), outline=(52, 211, 153), width=2)
            draw_checkmark(draw, card_x + 72, ans_y + 30, 14, "#10b981")
            draw.text((card_x + 100, ans_y + 18), "Resposta Aceita (248 votos):", fill="#34d399", font=font_file)
            draw.text((card_x + 70, ans_y + 65), "$ docker compose up --build --force-recreate -d", fill="#f8fafc", font=font_code)
            draw.text((card_x + 70, ans_y + 110), "-> Aviso: Este comando foi deprecado em 2024!", fill="#f87171", font=font_text)

            draw.text((card_x + 44, so_box_y + 375), "Comentários: 'Testei aqui e travou toda a VPS...'", fill="#94a3b8", font=font_text)

        else:
            # TELA 3: GITHUB DOCS
            doc_box_y = card_y + 285
            draw.rounded_rectangle([card_x + 24, doc_box_y, card_x + card_w - 24, doc_box_y + 465], radius=16, fill=(20, 24, 38), outline=(168, 85, 247), width=2)
            draw.text((card_x + 44, doc_box_y + 20), "DOCUMENTAÇÃO OFICIAL — MANUAL DE FLAGS", fill="#c084fc", font=font_badge)
            draw.text((card_x + 44, doc_box_y + 65), "Dezenas de flags complexas para lembrar de cabeça:", fill="#ffffff", font=font_text_bold)

            # Bloco de código longo e confuso
            code_b_y = doc_box_y + 120
            draw.rounded_rectangle([card_x + 44, code_b_y, card_x + card_w - 44, code_b_y + 220], radius=12, fill=(12, 14, 22), outline=(55, 65, 81), width=1)
            doc_lines = [
                "$ cli-engine deploy \\",
                "  --env=production \\",
                "  --concurrency=8 \\",
                "  --timeout=3600 \\",
                "  --secrets-provider=vault"
            ]
            for d_idx, d_line in enumerate(doc_lines):
                draw.text((card_x + 64, code_b_y + 16 + d_idx * 38), d_line, fill="#38bdf8" if d_idx == 0 else "#94a3b8", font=font_code)

            draw.text((card_x + 44, doc_box_y + 375), "-> Quem consegue memorizar isso todo dia?", fill="#f87171", font=font_text_bold)

        # Highlight Solution Banner no Rodapé
        sol_y = card_y + 775
        draw.rounded_rectangle([card_x + 24, sol_y, card_x + card_w - 24, card_y + card_h - 24], radius=18, fill=(16, 26, 46), outline=(56, 189, 248), width=3)
        draw.text((card_x + 44, sol_y + 26), "A SOLUÇÃO DOS DEVS SENIORES", fill="#38bdf8", font=font_badge)
        draw.text((card_x + 44, sol_y + 70), "Trazer a IA direto para o seu Terminal!", fill="#ffffff", font=font_headline)
        
        b_y = sol_y + 150
        benefits = [
            "Zero troca de janelas ou distração com abas",
            "A IA lê o contexto git e gera o comando na hora",
            "Execução e testes em 1 único clique no CLI"
        ]
        for b_i, b_text in enumerate(benefits):
            by = b_y + b_i * 90
            draw_checkmark(draw, card_x + 60, by + 18, 14, "#38bdf8")
            draw.text((card_x + 95, by + 4), b_text, fill="#e2e8f0", font=font_text)

    elif layout == "TECH_NEWS":
        # LAYOUT: TECH NEWS (Manchete + Bullets + Metricas)
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=24, fill=(16, 20, 32), outline=(56, 189, 248), width=3
        )
        # Top banner
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 75],
            radius=24, fill=(24, 34, 56)
        )
        draw.rectangle([card_x, card_y + 40, card_x + card_w, card_y + 75], fill=(24, 34, 56))
        draw.text((card_x + 36, card_y + 24), "BREAKING TECH UPDATE / RELEASE", fill="#38bdf8", font=font_file)
        
        # Headline
        headline = active_scene.get("headline", active_scene.get("header_title", "Novidade Tech"))
        draw.text((card_x + 36, card_y + 115), headline[:38], fill="#ffffff", font=font_headline)

        # Bullets / Lines
        line_start_y = card_y + 240
        for l_idx, line in enumerate(typed_lines):
            ly = line_start_y + l_idx * 75
            draw.ellipse([card_x + 36, ly + 10, card_x + 50, ly + 24], fill="#38bdf8")
            draw.text((card_x + 70, ly), line[:40], fill="#e2e8f0", font=font_code)

        # Metrics box (se houver)
        metrics = active_scene.get("metrics", [])
        if metrics:
            m = metrics[0]
            m_box_y = card_y + card_h - 220
            draw.rounded_rectangle(
                [card_x + 30, m_box_y, card_x + card_w - 30, m_box_y + 160],
                radius=16, fill=(24, 32, 54), outline=(56, 189, 248), width=2
            )
            draw.text((card_x + 50, m_box_y + 24), str(m.get("value", "")), fill="#38bdf8", font=font_stat_val)
            draw.text((card_x + 50, m_box_y + 90), str(m.get("label", "")).upper(), fill="#94a3b8", font=font_stat_lbl)

    elif layout == "BROWSER_MOCKUP":
        # LAYOUT: BROWSER MOCKUP (WebUI / Documentacao / GitHub Repo)
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=24, fill=(18, 20, 32), outline=(147, 51, 234), width=3
        )
        # Browser top bar
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 70],
            radius=24, fill=(28, 32, 48)
        )
        draw.rectangle([card_x, card_y + 40, card_x + card_w, card_y + 70], fill=(28, 32, 48))
        # Dots
        draw.ellipse([card_x + 24, card_y + 24, card_x + 44, card_y + 44], fill="#ff5f56")
        draw.ellipse([card_x + 54, card_y + 24, card_x + 74, card_y + 44], fill="#ffbd2e")
        draw.ellipse([card_x + 84, card_y + 24, card_x + 104, card_y + 44], fill="#27c93f")
        # URL bar
        url_text = active_scene.get("header_title", "https://github.com/syrius/ai-tools")
        draw.rounded_rectangle(
            [card_x + 130, card_y + 14, card_x + card_w - 30, card_y + 56],
            radius=10, fill=(15, 18, 28), outline=(55, 65, 81), width=1
        )
        draw_lock_icon(draw, card_x + 145, card_y + 24)
        draw.text((card_x + 172, card_y + 20), url_text[:38], fill="#94a3b8", font=font_file)

        # Repo / Doc Header Card
        doc_header_y = card_y + 90
        draw.rounded_rectangle(
            [card_x + 24, doc_header_y, card_x + card_w - 24, doc_header_y + 90],
            radius=14, fill=(28, 32, 50), outline=(147, 51, 234), width=2
        )
        draw.text((card_x + 44, doc_header_y + 16), "REPOSITÓRIO OFICIAL & DOCUMENTAÇÃO", fill="#c084fc", font=font_badge)
        draw.text((card_x + 44, doc_header_y + 50), "18.4k stars  •  v3.2.0  •  MIT License", fill="#94a3b8", font=font_file)

        # Content area
        headline = active_scene.get("headline", "Interface & Documentação")
        draw.text((card_x + 36, card_y + 210), headline[:38], fill="#ffffff", font=font_headline)

        line_start_y = card_y + 300
        for l_idx, line in enumerate(typed_lines):
            ly = line_start_y + l_idx * 80
            draw.rounded_rectangle(
                [card_x + 24, ly, card_x + card_w - 24, ly + 65],
                radius=12, fill=(20, 24, 38), outline=(55, 65, 81), width=1
            )
            draw.text((card_x + 44, ly + 18), "• " + line[:38], fill="#cbd5e1", font=font_code)

    elif layout == "TERMINAL_CLI":
        # LAYOUT: TERMINAL CLI (Modern Hacker / Warp / Zsh Terminal)
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=24, fill=(12, 16, 26), outline=(56, 189, 248), width=3
        )
        # Terminal top bar (Warp/macOS Style)
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 65],
            radius=24, fill=(22, 28, 44)
        )
        draw.rectangle([card_x, card_y + 35, card_x + card_w, card_y + 65], fill=(22, 28, 44))
        draw.ellipse([card_x + 24, card_y + 22, card_x + 44, card_y + 42], fill="#ff5f56")
        draw.ellipse([card_x + 54, card_y + 22, card_x + 74, card_y + 42], fill="#ffbd2e")
        draw.ellipse([card_x + 84, card_y + 22, card_x + 104, card_y + 42], fill="#27c93f")
        
        terminal_header = active_scene.get("header_title", "zsh — ~/developer/ai-tools — (main)")
        draw.text((card_x + 130, card_y + 20), terminal_header[:40], fill="#94a3b8", font=font_file)

        # Prompt directory header (Starship / Oh My Zsh style)
        prompt_dir_y = card_y + 90
        draw.text((card_x + 30, prompt_dir_y), "➜  ~/projects/ai-cli  git:(main) ✗", fill="#c084fc", font=font_file)
        
        line_start_y = card_y + 150
        line_h = 60
        for l_idx, line in enumerate(typed_lines):
            ly = line_start_y + l_idx * line_h
            if line.startswith("$ ") or line.startswith("➜ ") or line.startswith("❯ "):
                draw.text((card_x + 30, ly), line, fill="#34d399", font=font_code)
            elif line.startswith("+ "):
                draw.rectangle([card_x + 20, ly - 2, card_x + card_w - 20, ly + 40], fill=(22, 101, 52, 70))
                draw.text((card_x + 30, ly), line, fill="#4ade80", font=font_code)
            elif line.startswith("- "):
                draw.rectangle([card_x + 20, ly - 2, card_x + card_w - 20, ly + 40], fill=(153, 27, 27, 70))
                draw.text((card_x + 30, ly), line, fill="#f87171", font=font_code)
            elif "[✓]" in line or "✓" in line or "pass" in line.lower() or "concluído" in line.lower() or "sucesso" in line.lower():
                draw.text((card_x + 30, ly), line, fill="#38bdf8", font=font_code)
            elif "[AI]" in line or "🤖" in line or "⚡" in line or "aider" in line.lower():
                draw.text((card_x + 30, ly), line, fill="#e879f9", font=font_code)
            elif "[!]" in line or "warn" in line.lower() or "aviso" in line.lower():
                draw.text((card_x + 30, ly), line, fill="#fbbf24", font=font_code)
            else:
                draw.text((card_x + 30, ly), line, fill="#cbd5e1", font=font_code)

            if l_idx == len(typed_lines) - 1 and cursor_visible:
                tb = font_code.getbbox(line + " ")
                cx = card_x + 30 + (tb[2] - tb[0])
                draw.rectangle([cx, ly - 2, cx + 4, ly + 34], fill="#38bdf8")

    elif layout == "OUTPUT_SHOWCASE":
        # ASSINATURA OFICIAL SYRIUS TECH: DASHBOARD DE VEREDITO & TAKEAWAYS
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=24, fill=(16, 20, 36), outline=(192, 132, 252), width=3
        )
        # Top banner roxo/ciano neon
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + 85],
            radius=24, fill=(35, 25, 65)
        )
        draw.rectangle([card_x, card_y + 40, card_x + card_w, card_y + 85], fill=(35, 25, 65))
        
        outro_badge = active_scene.get("badge", "VEREDITO SYRIUS TECH")
        draw.text((card_x + 36, card_y + 28), outro_badge.upper(), fill="#c084fc", font=font_badge)

        headline_text = active_scene.get("headline", active_scene.get("header_title", "Takeaways & Veredito Final"))
        headline_y = card_y + 115
        draw.text((card_x + 36, headline_y), headline_text[:38], fill="#ffffff", font=font_headline)

        # Big Stat Cards Dinâmicos (vindos de active_scene["metrics"])
        metrics = active_scene.get("metrics", [])
        m1_val = str(metrics[0].get("value", "100%")) if len(metrics) > 0 else "100%"
        m1_lbl = str(metrics[0].get("label", "EFICIÊNCIA")).upper() if len(metrics) > 0 else "EFICIÊNCIA"
        
        m2_val = str(metrics[1].get("value", "PROD")) if len(metrics) > 1 else "OFICIAL"
        m2_lbl = str(metrics[1].get("label", "STATUS")).upper() if len(metrics) > 1 else "STATUS"

        box1_y = card_y + 200
        box1_w = (card_w - 80) // 2
        
        # Stat 1 Card
        draw.rounded_rectangle(
            [card_x + 30, box1_y, card_x + 30 + box1_w, box1_y + 150],
            radius=18, fill=(24, 32, 58), outline=(56, 189, 248), width=2
        )
        draw.text((card_x + 50, box1_y + 24), m1_val[:12], fill="#38bdf8", font=font_stat_val)
        draw.text((card_x + 50, box1_y + 96), m1_lbl[:22], fill="#94a3b8", font=font_stat_lbl)

        # Stat 2 Card
        draw.rounded_rectangle(
            [card_x + 50 + box1_w, box1_y, card_x + card_w - 30, box1_y + 150],
            radius=18, fill=(24, 32, 58), outline=(52, 211, 153), width=2
        )
        draw.text((card_x + 70 + box1_w, box1_y + 24), m2_val[:12], fill="#34d399", font=font_stat_val)
        draw.text((card_x + 70 + box1_w, box1_y + 96), m2_lbl[:22], fill="#94a3b8", font=font_stat_lbl)

        # Checklist de Takeaways Dinâmicos (vindos de typed_lines)
        takeaways = typed_lines if len(typed_lines) > 0 else ["Consulte as novidades na legenda", "Aplicável em produção hoje", "Testado e aprovado"]
        chk_start_y = card_y + 390
        for l_idx, line in enumerate(takeaways[:4]):
            ly = chk_start_y + l_idx * 115
            draw.rounded_rectangle(
                [card_x + 30, ly, card_x + card_w - 30, ly + 90],
                radius=16, fill=(22, 28, 48), outline=(55, 65, 81), width=1
            )
            # Green check icon
            draw_checkmark(draw, card_x + 65, ly + 45, 16, "#059669")
            draw.text((card_x + 105, ly + 30), line[:38], fill="#f3f4f6", font=font_text_bold)

        # Botão Oficial Syrius Tech de CTA no final
        cta_btn_y = card_y + card_h - 170
        draw.rounded_rectangle(
            [card_x + 30, cta_btn_y, card_x + card_w - 30, cta_btn_y + 110],
            radius=22, fill=(147, 51, 234), outline=(236, 72, 153), width=3
        )
        draw.text((card_x + 55, cta_btn_y + 34), "🔖 Salve este Reel  •  Siga @syrius_tech", fill="#ffffff", font=font_title)

    else:
        # LAYOUT PADRAO: CODE_EDITOR (VS Code Pro IDE com Syntax Highlighting)
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + card_h],
            radius=24, fill=(18, 22, 34), outline=(55, 65, 81), width=2
        )
        # Barra de Titulo macOS
        titlebar_h = 65
        draw.rounded_rectangle(
            [card_x, card_y, card_x + card_w, card_y + titlebar_h],
            radius=24, fill=(26, 32, 48)
        )
        draw.rectangle([card_x, card_y + 35, card_x + card_w, card_y + titlebar_h], fill=(26, 32, 48))
        draw.ellipse([card_x + 24, card_y + 22, card_x + 44, card_y + 42], fill="#ff5f56")
        draw.ellipse([card_x + 54, card_y + 22, card_x + 74, card_y + 42], fill="#ffbd2e")
        draw.ellipse([card_x + 84, card_y + 22, card_x + 104, card_y + 42], fill="#27c93f")
        
        tab_x = card_x + 130
        tab_w = 340
        draw.rectangle([tab_x, card_y + 14, tab_x + tab_w, card_y + titlebar_h], fill=(18, 22, 34))
        draw.line([(tab_x, card_y + 14), (tab_x + tab_w, card_y + 14)], fill="#38bdf8", width=3)
        file_name = active_scene.get("file_name", "main.ts")
        draw.text((tab_x + 20, card_y + 22), "TS  " + file_name, fill="#f8fafc", font=font_file)

        code_start_y = card_y + 95
        line_h = 56
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
    draw.text((WIDTH // 2, footer_y), "Siga @syrius_tech para dominar tecnologia e programação", fill="#94a3b8", font=font_footer, anchor="mm")

    pipe.stdin.write(img.tobytes())

pipe.stdin.close()
pipe.wait()

print(f"🎉 VÍDEO RENDERIZADO COM SUCESSO EM: {output_mp4}")
