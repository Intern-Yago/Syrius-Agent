import sys
import os
import asyncio
import edge_tts

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
        sys.stdin.reconfigure(encoding="utf-8")
    except Exception:
        pass

async def main():
    if len(sys.argv) < 3:
        print("Usage: python synthesize_tts.py <output_path> <voice> [text]", file=sys.stderr)
        sys.exit(1)

    output_path = os.path.abspath(sys.argv[1])
    voice = sys.argv[2] if sys.argv[2] != "default" else "pt-BR-FranciscaNeural"

    if len(sys.argv) > 3:
        text = " ".join(sys.argv[3:])
    else:
        text = sys.stdin.read().strip()

    if not text:
        text = "Olá! Teste de síntese de voz."

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"DONE:{output_path}")

if __name__ == "__main__":
    asyncio.run(main())
