import json
import os
import sys
import subprocess

def get_hardware_info():
    info = {
        "gpu_available": False,
        "gpu_name": "Não detectada",
        "gpu_vram_total_mb": 0,
        "gpu_vram_free_mb": 0,
        "gpu_utilization_percent": 0,
        "cuda_torch_available": False,
        "cuda_version": None,
        "cpu_name": "Processador",
        "cpu_cores": os.cpu_count() or 4,
        "ram_total_gb": 0,
        "ram_free_gb": 0,
        "ram_usage_percent": 0,
        "recommended_device": "cpu",
        "warning": None,
    }

    # 1. Detect GPU via nvidia-smi
    try:
        smi_out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free,utilization.gpu", "--format=csv,noheader,nounits"],
            encoding="utf-8",
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )
        lines = smi_out.strip().split("\n")
        if lines and lines[0]:
            parts = [p.strip() for p in lines[0].split(",")]
            if len(parts) >= 4:
                info["gpu_available"] = True
                info["gpu_name"] = parts[0]
                info["gpu_vram_total_mb"] = int(parts[1])
                info["gpu_vram_free_mb"] = int(parts[2])
                info["gpu_utilization_percent"] = int(parts[3])
    except Exception:
        pass

    # 2. Check PyTorch CUDA support
    try:
        import torch
        info["cuda_torch_available"] = torch.cuda.is_available()
        if torch.cuda.is_available():
            info["cuda_version"] = torch.version.cuda
            info["gpu_name"] = torch.cuda.get_device_name(0)
    except Exception:
        pass

    # 3. Check System RAM and CPU via psutil or Windows WMIC / PowerShell
    try:
        import psutil
        vm = psutil.virtual_memory()
        info["ram_total_gb"] = round(vm.total / (1024 ** 3), 1)
        info["ram_free_gb"] = round(vm.available / (1024 ** 3), 1)
        info["ram_usage_percent"] = vm.percent
    except ImportError:
        # Fallback to ctypes for RAM on Windows
        try:
            import ctypes
            class MEMORYSTATUSEX(ctypes.Structure):
                _fields_ = [
                    ("dwLength", ctypes.c_ulong),
                    ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong),
                    ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong),
                    ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong),
                    ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("sullAvailExtendedVirtual", ctypes.c_ulonglong),
                ]
            stat = MEMORYSTATUSEX()
            stat.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(stat))
            info["ram_total_gb"] = round(stat.ullTotalPhys / (1024 ** 3), 1)
            info["ram_free_gb"] = round(stat.ullAvailPhys / (1024 ** 3), 1)
            info["ram_usage_percent"] = stat.dwMemoryLoad
        except Exception:
            pass

    # 4. Determine Recommended Device & Safety Warnings
    if info["gpu_available"] and info["cuda_torch_available"]:
        if info["gpu_vram_free_mb"] >= 1500 and info["gpu_utilization_percent"] < 90:
            info["recommended_device"] = "cuda"
        else:
            info["recommended_device"] = "cpu"
            info["warning"] = f"GPU com uso elevado ({info['gpu_utilization_percent']}%) ou VRAM livre baixa ({info['gpu_vram_free_mb']}MB). Usando CPU para evitar travamento."
    elif info["gpu_available"] and not info["cuda_torch_available"]:
        info["recommended_device"] = "cpu"
        info["warning"] = f"GPU {info['gpu_name']} detectada no sistema, porém o PyTorch atual está em modo CPU. Aceleração CUDA pronta para ser ativada."
    else:
        info["recommended_device"] = "cpu"

    if info["ram_free_gb"] > 0 and info["ram_free_gb"] < 1.5:
        info["warning"] = "Memória RAM livre baixa (< 1.5GB). O sistema liberará cache automaticamente antes da síntese."

    return info

if __name__ == "__main__":
    data = get_hardware_info()
    print(json.dumps(data, indent=2))
