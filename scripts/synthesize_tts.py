import sys
import asyncio
import edge_tts

async def main():
    if len(sys.argv) < 3:
        print("Usage: python synthesize_tts.py <output_path> <voice> [text]", file=sys.stderr)
        sys.exit(1)

    output_path = sys.argv[1]
    voice = sys.argv[2] if sys.argv[2] != "default" else "pt-BR-AntonioNeural"
    
    if len(sys.argv) > 3:
        text = " ".join(sys.argv[3:])
    else:
        text = sys.stdin.read().strip()

    if not text:
        text = "Olá! Teste de síntese de voz."

    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)
    print(f"DONE:{output_path}")

if __name__ == "__main__":
    asyncio.run(main())
