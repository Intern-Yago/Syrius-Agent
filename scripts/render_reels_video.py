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

# Configurações do Vídeo
WIDTH = 1080
HEIGHT = 1920
FPS = 30

VOICE_PATH = os.path.abspath("output/reels-audio/reels_humanizado.mp3")
BG_MUSIC_PATH = os.path.abspath("output/reels-audio/background_music.mp3")
MIXED_AUDIO_PATH = os.path.abspath("output/reels-audio/reels_final_mixed.mp3")
OUTPUT_DIR = os.path.abspath("output/reels-video")
os.makedirs(OUTPUT_DIR, exist_ok=True)
OUTPUT_MP4 = os.path.join(OUTPUT_DIR, "reels_legado_sem_testes.mp4")

# Cenas do Roteiro
SCENES = [
    {
        "title": "CENA 1: O GANCHO CRÍTICO",
        "badge": "⚡ ALERTA DE PRODUÇÃO",
        "badge_color": "#ef4444",
        "header_tag": "CRITICAL_BUG",
        "code_snippet": "// ⚠️ Gateway de Pagamento (600 linhas sem testes)\nfunction processarCheckout(pedido) {\n  const taxa = calcularTaxaLegada(pedido);\n  return gateway.cobrar(pedido.total + taxa);\n}",
        "time_start": 0.0,
        "time_end": 7.5,
    },
    {
        "title": "CENA 2: A ARMADILHA DO DEV",
        "badge": "⚠️ RISCO DE EFEITO COLATERAL",
        "badge_color": "#f59e0b",
        "header_tag": "REGRESSION_RISK",
        "code_snippet": "// 💥 Alterar código na sorte = Roleta Russa!\n-  if (pedido.cupom) aplicarDesconto(pedido);\n+  if (pedido.cupomValido) aplicarDesconto(pedido);\n// Quebrou silenciosamente a emissão de nota fiscal...",
        "time_start": 7.5,
        "time_end": 17.5,
    },
    {
        "title": "CENA 3: TESTE DE CARACTERIZAÇÃO",
        "badge": "🛡️ ENGENHARIA DE SOFTWARE",
        "badge_color": "#10b981",
        "header_tag": "CHARACTERIZATION_TEST",
        "code_snippet": "// 🟢 Passo 1: Capture o comportamento atual\ndescribe('Characterization Test - Pagamento', () => {\n  it('deve preservar o payload legado exato', async () => {\n    const res = await processarCheckout(mockPedido);\n    expect(res.status).toBe('APROVADO'); // 🟢 PASS\n  });\n});\n// Agora você tem uma rede de proteção pra refatorar!",
        "time_start": 17.5,
        "time_end": 31.0,
    },
    {
        "title": "CENA 4: DOMINE ENGENHARIA",
        "badge": "🚀 ESTRATÉGIA > SORTE",
        "badge_color": "#8b5cf6",
        "header_tag": "SYRIUS_TECH",
        "code_snippet": "const mindset = {\n  seguranca: 'Testes de Caracterização',\n  refatoracao: 'Sem Medo de Quebrar',\n  autoridade: '@syrius_tech'\n};\n\n// Salva para a sua próxima emergência de código!",
        "time_start": 31.0,
        "time_end": 42.0,
    },
]

def get_font(size, bold=False):
    font_names = ["segoeui.ttf", "arial.ttf", "calibri.ttf"]
    if bold:
        font_names = ["segoeuib.ttf", "arialbd.ttf", "calibrib.ttf"]
    for fn in font_names:
        fp = os.path.join("C:\\Windows\\Fonts", fn)
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except:
                pass
    return ImageFont.load_default()

def wrap_text(text, font, max_width, draw):
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))
    return lines

def ensure_mixed_audio():
    print("🎵 Mixando Locução da ElevenLabs com Trilha Lo-Fi de Fundo...")
    cmd = [
        ffmpeg_exe, "-y",
        "-i", VOICE_PATH,
        "-i", BG_MUSIC_PATH,
        "-filter_complex", "[0:a]volume=1.20[v];[1:a]volume=0.18[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        "-map", "[aout]",
        "-c:a", "libmp3lame",
        "-b:a", "192k",
        MIXED_AUDIO_PATH
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("✅ Áudio final mixado com sucesso!")

def main():
    print("🎬 ========================================================")
    print("🎬 PRODUÇÃO COMPLETA DE VÍDEO REELS (VÍDEO + VOZ + MÚSICA)")
    print("🎬 ========================================================\n")

    if not os.path.exists(VOICE_PATH):
        print(f"❌ Erro: Áudio de voz não encontrado em {VOICE_PATH}")
        sys.exit(1)

    # 1. Garante a mixagem com a trilha sonora
    ensure_mixed_audio()

    # 2. Transcrição com Whisper
    print("\n🔍 Analisando sincronização de legendas com Whisper AI...")
    try:
        model = whisper.load_model("tiny")
        transcribe_result = model.transcribe(VOICE_PATH, language="pt", word_timestamps=False, fp16=False)
        segments = transcribe_result.get("segments", [])
        print(f"✅ {len(segments)} segmentos de fala sincronizados com precisão.")
    except Exception as e:
        print(f"⚠️ Fallback de legendas: {e}")
        segments = [
            {"start": 0.0, "end": 7.5, "text": "Sabe quando você herda um sistema legado de pagamentos... totalmente sem testes unitários?"},
            {"start": 7.5, "end": 17.5, "text": "E pra piorar, o seu primeiro chamado no trabalho... é consertar um bug crítico em produção hoje!"},
            {"start": 17.5, "end": 31.0, "text": "O maior erro aqui é tentar arrumar na sorte. Sem testes, qualquer linha mexida pode quebrar outras regras."},
            {"start": 31.0, "end": 40.0, "text": "Antes de tocar no código, faça um Teste de Caracterização! Salva este vídeo e me segue pra dominar engenharia de software!"},
        ]

    # 3. Informações do Áudio
    audio_info = sf.SoundFile(MIXED_AUDIO_PATH)
    audio_data, sr = sf.read(MIXED_AUDIO_PATH)
    if len(audio_data.shape) > 1:
        audio_mono = np.mean(audio_data, axis=1)
    else:
        audio_mono = audio_data

    duration_sec = len(audio_mono) / sr
    total_frames = int(duration_sec * FPS)
    samples_per_frame = int(sr / FPS)

    print(f"⏱️ Duração total do vídeo: {duration_sec:.2f}s ({total_frames} frames a {FPS} FPS)")
    print(f"📁 Destino do vídeo MP4: {OUTPUT_MP4}")

    # 4. Inicializa encoder FFmpeg
    cmd = [
        ffmpeg_exe,
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",  # Entrada dos frames pelo stdin
        "-i", MIXED_AUDIO_PATH,  # Áudio mixado com voz + música
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        OUTPUT_MP4
    ]

    print("\n🚀 Inicializando encoder de vídeo H.264 + AAC...")
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    # Fontes
    font_title = get_font(40, bold=True)
    font_badge = get_font(22, bold=True)
    font_subtitle = get_font(44, bold=True)
    font_code = get_font(26, bold=False)
    font_brand = get_font(30, bold=True)
    font_small = get_font(20, bold=False)
    font_pill = get_font(18, bold=True)

    print("🎨 Renderizando efeitos visuais, espectro de áudio e legendas...")

    for frame_idx in range(total_frames):
        current_time = frame_idx / FPS

        # Encontra a cena atual
        current_scene = SCENES[-1]
        for sc in SCENES:
            if sc["time_start"] <= current_time < sc["time_end"]:
                current_scene = sc
                break

        # Encontra a legenda ativa
        current_subtitle = ""
        for seg in segments:
            if seg["start"] <= current_time <= seg["end"]:
                current_subtitle = seg["text"].strip()
                break

        # Amplitude do áudio neste frame para o espectro sonoro reativo
        s_start = frame_idx * samples_per_frame
        s_end = min(s_start + samples_per_frame, len(audio_mono))
        frame_chunk = audio_mono[s_start:s_end]
        rms_amp = np.sqrt(np.mean(frame_chunk**2)) if len(frame_chunk) > 0 else 0.0
        amp_scale = min(rms_amp * 8.0, 1.0)

        # 1. Cria frame base com gradiente escuro e grade cyberpunk sutil
        img = Image.new("RGB", (WIDTH, HEIGHT), color=(9, 13, 22))
        draw = ImageDraw.Draw(img)

        # Gradiente sutil
        for y in range(0, HEIGHT, 4):
            alpha = y / HEIGHT
            r = int(9 * (1 - alpha) + 4 * alpha)
            g = int(13 * (1 - alpha) + 6 * alpha)
            b = int(22 * (1 - alpha) + 12 * alpha)
            draw.rectangle([(0, y), (WIDTH, y + 4)], fill=(r, g, b))

        # Linhas de grade cyberpunk no fundo
        grid_alpha = int(15 + 10 * np.sin(frame_idx * 0.05))
        grid_color = (20 + grid_alpha // 2, 35 + grid_alpha, 55 + grid_alpha)
        for gx in range(0, WIDTH, 120):
            draw.line([(gx, 0), (gx, HEIGHT)], fill=grid_color, width=1)
        for gy in range(0, HEIGHT, 120):
            draw.line([(0, gy), (WIDTH, gy)], fill=grid_color, width=1)

        # 2. Header / Branding com Badge Syrius Tech
        header_top = 90
        draw.rounded_rectangle([(70, header_top), (WIDTH - 70, header_top + 85)], radius=18, fill=(15, 23, 42), outline=(38, 50, 75), width=2)
        
        # Logo / Badge
        draw.ellipse([(95, header_top + 18), (145, header_top + 68)], fill=(56, 189, 248))
        draw.text((160, header_top + 16), "@syrius_tech", font=font_brand, fill=(255, 255, 255))
        draw.text((160, header_top + 48), "Engenharia de Software & Arquitetura", font=font_small, fill=(148, 163, 184))

        # Tag de Formato / Música
        draw.rounded_rectangle([(WIDTH - 270, header_top + 24), (WIDTH - 95, header_top + 62)], radius=10, fill=(30, 41, 59), outline=(56, 189, 248), width=1)
        draw.text((WIDTH - 255, header_top + 32), "🎵 Lo-Fi Tech Beat", font=font_pill, fill=(56, 189, 248))

        # 3. Badge da Cena & Alerta
        badge_text = current_scene["badge"]
        badge_bbox = draw.textbbox((0, 0), badge_text, font=font_badge)
        badge_w = badge_bbox[2] - badge_bbox[0] + 32
        badge_h = 42
        badge_x = 70
        badge_y = 205
        draw.rounded_rectangle([(badge_x, badge_y), (badge_x + badge_w, badge_y + badge_h)], radius=10, fill=(24, 32, 47), outline=current_scene["badge_color"], width=2)
        draw.text((badge_x + 16, badge_y + 8), badge_text, font=font_badge, fill=current_scene["badge_color"])

        # Título da Cena
        draw.text((70, 260), current_scene["title"], font=font_title, fill=(241, 245, 249))

        # 4. Box Central (Cenas 1..3: VS Code / Cena 4: Outro Instagram Syrius Tech)
        code_box_top = 340
        code_box_height = 680

        if current_time < 31.0:
            # VS Code Mockup
            draw.rounded_rectangle([(70, code_box_top), (WIDTH - 70, code_box_top + code_box_height)], radius=20, fill=(15, 23, 42), outline=(51, 65, 85), width=2)
            
            # Header do VS Code
            draw.ellipse([(95, code_box_top + 18), (111, code_box_top + 34)], fill=(239, 68, 68))
            draw.ellipse([(121, code_box_top + 18), (137, code_box_top + 34)], fill=(245, 158, 11))
            draw.ellipse([(147, code_box_top + 18), (163, code_box_top + 34)], fill=(16, 185, 129))
            draw.text((185, code_box_top + 16), f"checkout-gateway.ts • [{current_scene['header_tag']}]", font=font_small, fill=(148, 163, 184))

            # Linhas de Código com Syntax Highlighting
            code_lines = current_scene["code_snippet"].split("\n")
            cy = code_box_top + 65
            for cline in code_lines:
                line_color = (226, 232, 240)
                if cline.startswith("//"):
                    line_color = (100, 116, 139)
                elif cline.startswith("-"):
                    line_color = (248, 113, 113)
                elif cline.startswith("+"):
                    line_color = (74, 222, 128)
                elif "function" in cline or "describe" in cline or "const" in cline or "return" in cline:
                    line_color = (56, 189, 248)
                elif "expect" in cline or "PASS" in cline:
                    line_color = (52, 211, 153)
                draw.text((95, cy), cline, font=font_code, fill=line_color)
                cy += 44
        else:
            # Outro Final Oficial Instagram Syrius Tech
            draw.rounded_rectangle([(70, code_box_top), (WIDTH - 70, code_box_top + code_box_height)], radius=24, fill=(15, 23, 42), outline=(56, 189, 248), width=3)
            
            # Glow central de branding
            pulse_ring = int(12 + 6 * np.sin(frame_idx * 0.3))
            draw.ellipse([(WIDTH//2 - 60 - pulse_ring, code_box_top + 60 - pulse_ring), (WIDTH//2 + 60 + pulse_ring, code_box_top + 180 + pulse_ring)], outline=(56, 189, 248), width=2)
            draw.ellipse([(WIDTH//2 - 50, code_box_top + 70), (WIDTH//2 + 50, code_box_top + 170)], fill=(56, 189, 248))
            
            # Texto da Logo
            draw.text((WIDTH//2 - 40, code_box_top + 92), "ST", font=get_font(48, bold=True), fill=(10, 14, 23))

            # Nome do Canal / Perfil
            brand_title = "Syrius Tech"
            bt_bbox = draw.textbbox((0, 0), brand_title, font=get_font(42, bold=True))
            draw.text(((WIDTH - (bt_bbox[2] - bt_bbox[0])) // 2, code_box_top + 195), brand_title, font=get_font(42, bold=True), fill=(255, 255, 255))
            
            handle_text = "@syrius_tech"
            ht_bbox = draw.textbbox((0, 0), handle_text, font=get_font(26, bold=True))
            draw.text(((WIDTH - (ht_bbox[2] - ht_bbox[0])) // 2, code_box_top + 245), handle_text, font=get_font(26, bold=True), fill=(56, 189, 248))

            tagline = "Engenharia de Software • Dicas Práticas & Arquitetura"
            tg_bbox = draw.textbbox((0, 0), tagline, font=get_font(20, bold=False))
            draw.text(((WIDTH - (tg_bbox[2] - tg_bbox[0])) // 2, code_box_top + 285), tagline, font=get_font(20, bold=False), fill=(148, 163, 184))

            # Linha divisória
            draw.line([(120, code_box_top + 330), (WIDTH - 120, code_box_top + 330)], fill=(38, 50, 75), width=2)

            # Barra de Ações do Instagram (Curtir, Comentar, Compartilhar, Salvar)
            actions_y = code_box_top + 360
            action_items = [
                {"icon": "❤️", "label": "Curtir", "color": "#ef4444"},
                {"icon": "💬", "label": "Comentar", "color": "#38bdf8"},
                {"icon": "🚀", "label": "Compartilhar", "color": "#f59e0b"},
                {"icon": "🔖", "label": "Salvar", "color": "#10b981", "highlight": True},
            ]

            act_w = 200
            act_gap = 25
            total_act_w = len(action_items) * act_w + (len(action_items) - 1) * act_gap
            start_act_x = (WIDTH - total_act_w) // 2

            for a_idx, act in enumerate(action_items):
                ax = start_act_x + a_idx * (act_w + act_gap)
                bg_color = (20, 30, 48) if not act.get("highlight") else (16, 185, 129, 40)
                border_c = act["color"] if act.get("highlight") else (51, 65, 85)
                
                # Card da Ação
                draw.rounded_rectangle([(ax, actions_y), (ax + act_w, actions_y + 110)], radius=16, fill=(24, 32, 47), outline=border_c, width=2)
                
                # Ícone
                draw.text((ax + 80, actions_y + 16), act["icon"], font=get_font(32))
                # Label
                l_bbox = draw.textbbox((0, 0), act["label"], font=get_font(20, bold=True))
                draw.text((ax + (act_w - (l_bbox[2] - l_bbox[0])) // 2, actions_y + 68), act["label"], font=get_font(20, bold=True), fill=(241, 245, 249))

            # Chamada final de Salvamento
            cta_box_y = code_box_top + 510
            draw.rounded_rectangle([(110, cta_box_y), (WIDTH - 110, cta_box_y + 120)], radius=18, fill=(30, 41, 59), outline=(56, 189, 248), width=2)
            
            cta_line1 = "📌 Gostou dessa técnica de sobrevivência?"
            cta_line2 = "👉 SALVA AGORA para consultar na sua próxima emergência!"
            c1_b = draw.textbbox((0, 0), cta_line1, font=get_font(24, bold=True))
            c2_b = draw.textbbox((0, 0), cta_line2, font=get_font(22, bold=True))
            
            draw.text(((WIDTH - (c1_b[2] - c1_b[0])) // 2, cta_box_y + 24), cta_line1, font=get_font(24, bold=True), fill=(255, 255, 255))
            draw.text(((WIDTH - (c2_b[2] - c2_b[0])) // 2, cta_box_y + 66), cta_line2, font=get_font(22, bold=True), fill=(56, 189, 248))

        # 5. Espectro de Áudio Reativo (Visualizador Sonoro Neon)
        spec_y = 1050
        num_bars = 28
        bar_spacing = (WIDTH - 140) / num_bars
        for b_i in range(num_bars):
            # Altura da barra baseada na amplitude do áudio + seno
            bh = int(8 + (35 * amp_scale) * (0.5 + 0.5 * np.sin(b_i * 0.6 + frame_idx * 0.4)))
            bx = 70 + int(b_i * bar_spacing)
            # Gradiente de cor nas barras (Cyan para Roxo)
            b_color = (
                int(56 * (1 - b_i/num_bars) + 168 * (b_i/num_bars)),
                int(189 * (1 - b_i/num_bars) + 85 * (b_i/num_bars)),
                int(248 * (1 - b_i/num_bars) + 247 * (b_i/num_bars))
            )
            draw.rounded_rectangle([(bx, spec_y - bh // 2), (bx + int(bar_spacing - 6), spec_y + bh // 2)], radius=3, fill=b_color)

        # 6. Box de Legenda Sincronizada (Karaokê / Subtitles)
        sub_box_top = 1110
        sub_box_height = 490
        draw.rounded_rectangle([(70, sub_box_top), (WIDTH - 70, sub_box_top + sub_box_height)], radius=22, fill=(18, 24, 38), outline=(56, 189, 248), width=2)
        
        # Header da Legenda com Indicador de Voz
        draw.text((95, sub_box_top + 28), "🎙️ LOCUÇÃO (VOZ DE YAGO):", font=font_badge, fill=(56, 189, 248))

        if current_subtitle:
            sub_lines = wrap_text(current_subtitle, font_subtitle, WIDTH - 200, draw)
            sy = sub_box_top + 85
            for sline in sub_lines[:4]:
                # Sombra sutil no texto
                draw.text((97, sy + 2), sline, font=font_subtitle, fill=(0, 0, 0))
                draw.text((95, sy), sline, font=font_subtitle, fill=(255, 255, 255))
                sy += 65
        else:
            draw.text((95, sub_box_top + 100), "...", font=font_subtitle, fill=(148, 163, 184))

        # 7. Barra de Progresso no Rodapé
        progress = current_time / duration_sec
        bar_y = HEIGHT - 110
        draw.rounded_rectangle([(70, bar_y), (WIDTH - 70, bar_y + 12)], radius=6, fill=(30, 41, 59))
        draw.rounded_rectangle([(70, bar_y), (70 + int((WIDTH - 140) * progress), bar_y + 12)], radius=6, fill=(56, 189, 248))

        # Tempo (ex: 0:18 / 0:39)
        time_text = f"{int(current_time // 60)}:{int(current_time % 60):02d} / {int(duration_sec // 60)}:{int(duration_sec % 60):02d}"
        draw.text((WIDTH - 230, bar_y - 35), time_text, font=font_small, fill=(148, 163, 184))

        # Envia frame RGB para o FFmpeg
        proc.stdin.write(img.tobytes())

        if frame_idx % 150 == 0:
            pct = (frame_idx / total_frames) * 100
            print(f"⏳ Processando vídeo: {pct:.1f}% ({frame_idx}/{total_frames} frames)...", flush=True)

    proc.stdin.close()
    proc.wait()

    # Copia para o post ID também
    post_id_target = os.path.join(OUTPUT_DIR, "reels_cmsyz5gyo0000fct8v9scoy2i.mp4")
    shutil.copyfile(OUTPUT_MP4, post_id_target)

    print(f"\n========================================================")
    print(f"🎉 PRODUÇÃO COMPLETA DO VÍDEO REELS FINALIZADA!")
    print(f"📁 Arquivo Master: {OUTPUT_MP4}")
    print(f"📁 Arquivo do Post: {post_id_target}")
    if os.path.exists(OUTPUT_MP4):
        size_mb = os.path.getsize(OUTPUT_MP4) / (1024 * 1024)
        print(f"📊 Tamanho do arquivo: {size_mb:.2f} MB")
    print(f"========================================================\n")

if __name__ == "__main__":
    main()
