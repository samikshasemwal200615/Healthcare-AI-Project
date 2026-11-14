"""Concurrent disease prediction orchestrator.

OS Concepts demonstrated:
- ThreadPoolExecutor for parallel task execution
- concurrent.futures for task coordination
- threading.current_thread() for thread identification
- time.perf_counter() for high-resolution timing

Why threads (not processes):
    The three ML models are already loaded in shared memory (~20 MB).
    Forking processes would duplicate this data. scikit-learn's predict()
    is implemented in C/Fortran and releases the GIL, making threads
    effective for this workload despite Python's GIL.
"""

import logging
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

from prediction.diabetes import predict as predict_diabetes
from prediction.liver import predict as predict_liver
from prediction.cardiovascular import predict as predict_cardiovascular

logger = logging.getLogger("healthcare.prediction")

# Thread pool with named threads for identification in logs and audit
_executor = ThreadPoolExecutor(max_workers=3, thread_name_prefix="predictor")


def _run_prediction(name, fn, patient):
    """Wrapper that executes a single prediction and logs the thread."""
    thread = threading.current_thread()
    start = time.perf_counter()

    result = fn(patient)

    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"  {name:20s} completed | {elapsed_ms:6.1f}ms | "
        f"thread={thread.name}"
    )
    return name, result


def predict_all(patient):
    """Run all three disease predictions concurrently.

    Submits each prediction to the ThreadPoolExecutor and collects
    results via futures. Each prediction runs on a separate thread,
    demonstrating concurrent task execution.

    Returns:
        dict[str, PredictionResult] — keyed by disease name.
    """
    tasks = {
        "diabetes": predict_diabetes,
        "liver": predict_liver,
        "cardiovascular": predict_cardiovascular,
    }

    start = time.perf_counter()

    # Submit all predictions to the thread pool
    futures = [
        _executor.submit(_run_prediction, name, fn, patient)
        for name, fn in tasks.items()
    ]

    # Collect results as they complete (may arrive out of order)
    results = {}
    for future in as_completed(futures):
        name, result = future.result()  # re-raises if prediction failed
        results[name] = result

    total_ms = (time.perf_counter() - start) * 1000
    logger.info(f"All 3 predictions completed in {total_ms:.1f}ms (concurrent)")

    return results