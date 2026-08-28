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

VALID_VOICES = {
    "pt-BR-FranciscaNeural": "pt-BR-FranciscaNeural",
    "pt-BR-ThalitaMultilingualNeural": "pt-BR-ThalitaMultilingualNeural",
    "pt-BR-ThalitaNeural": "pt-BR-ThalitaMultilingualNeural",
    "pt-BR-AntonioNeural": "pt-BR-AntonioNeural",
    "pt-PT-RaquelNeural": "pt-PT-RaquelNeural",
    "pt-PT-DuarteNeural": "pt-PT-DuarteNeural",
}

def normalize_voice(requested_voice: str) -> str:
    if requested_voice in VALID_VOICES:
        return VALID_VOICES[requested_voice]
    
    if any(m in requested_voice for m in ["Antonio", "Donato", "Fabio", "Humberto", "Julio", "Nicolau", "Valerio", "Duarte"]):
        return "pt-BR-AntonioNeural"
    elif "Thalita" in requested_voice:
        return "pt-BR-ThalitaMultilingualNeural"
    elif "Raquel" in requested_voice:
        return "pt-PT-RaquelNeural"
    
    return "pt-BR-FranciscaNeural"

import re

def phonetic_clean_for_tts(text: str) -> str:
    # Corrige pronúncia de @syrius_tech para o português neural não soletrar estranho
    text = re.sub(r"@syrius_tech\b", "Sírius Ték", text, flags=re.IGNORECASE)
    text = re.sub(r"@syrius\b", "Sírius", text, flags=re.IGNORECASE)
    text = re.sub(r"\bsyrius\s*tech\b", "Sírius Ték", text, flags=re.IGNORECASE)
    text = re.sub(r"\bsyrius\b", "Sírius", text, flags=re.IGNORECASE)
    
    # Termos técnicos comuns para fonética natural em português
    text = re.sub(r"\bCI/CD\b", "C-I C-D", text, flags=re.IGNORECASE)
    text = re.sub(r"\bCLI\b", "C-L-I", text)
    text = re.sub(r"\btry/catch\b", "try catch", text, flags=re.IGNORECASE)
    return text

async def main():
    if len(sys.argv) < 3:
        print("Usage: python synthesize_tts.py <output_path> <voice> [text]", file=sys.stderr)
        sys.exit(1)

    output_path = os.path.abspath(sys.argv[1])
    raw_voice = sys.argv[2] if sys.argv[2] != "default" else "pt-BR-FranciscaNeural"
    target_voice = normalize_voice(raw_voice)

    if len(sys.argv) > 3:
        text = " ".join(sys.argv[3:])
    else:
        text = sys.stdin.read().strip()

    if not text:
        text = "Olá! Teste de síntese de voz."

    # Aplica normalização fonética
    clean_text = phonetic_clean_for_tts(text)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    try:
        communicate = edge_tts.Communicate(clean_text, target_voice)
        await communicate.save(output_path)
        print(f"DONE:{output_path}")
    except Exception as err:
        if target_voice != "pt-BR-FranciscaNeural":
            communicate = edge_tts.Communicate(clean_text, "pt-BR-FranciscaNeural")
            await communicate.save(output_path)
            print(f"DONE:{output_path}")
        else:
            raise err

if __name__ == "__main__":
    asyncio.run(main())
