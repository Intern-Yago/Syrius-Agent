import sys

print("Python version:", sys.version)

try:
    import torch
    print("PyTorch version:", torch.__version__)
    print("CUDA available:", torch.cuda.is_available())
    if torch.cuda.is_available():
        print("Device name:", torch.cuda.get_device_name(0))
except ImportError:
    print("PyTorch: NOT INSTALLED")

try:
    import TTS
    print("Coqui TTS version:", TTS.__version__)
except ImportError:
    print("Coqui TTS: NOT INSTALLED")

try:
    import edge_tts
    print("Edge-TTS: INSTALLED")
except ImportError:
    print("Edge-TTS: NOT INSTALLED")
