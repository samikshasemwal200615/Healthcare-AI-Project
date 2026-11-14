"""System health and monitoring endpoint.

Demonstrates OS concepts:
- Process monitoring via psutil (CPU, memory, PID)
- Thread enumeration via threading module
- Real-time system resource reporting
"""

import os
import threading

import psutil
from fastapi import APIRouter

router = APIRouter(prefix="/system", tags=["System"])


@router.get("/health")
def health_check():
    """Return system health metrics using OS-level APIs.

    Uses psutil to read real process and system metrics —
    this is actual OS interaction, not simulation.
    """
    process = psutil.Process(os.getpid())
    mem_info = process.memory_info()
    vm = psutil.virtual_memory()

    return {
        "status": "healthy",
        "process": {
            "pid": os.getpid(),
            "cpu_percent": process.cpu_percent(interval=0.1),
            "memory_rss_mb": round(mem_info.rss / 1024 / 1024, 2),
            "memory_percent": round(process.memory_percent(), 2),
            "num_threads": process.num_threads(),
        },
        "threads": {
            "active_count": threading.active_count(),
            "names": [t.name for t in threading.enumerate()],
        },
        "system": {
            "cpu_count": psutil.cpu_count(),
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "total_memory_mb": round(vm.total / 1024 / 1024, 2),
            "available_memory_mb": round(vm.available / 1024 / 1024, 2),
            "memory_used_percent": vm.percent,
        },
    }
