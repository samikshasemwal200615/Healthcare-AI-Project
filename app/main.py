"""Healthcare AI — FastAPI application entry point.

OS Concepts demonstrated:
- Lifespan context manager for graceful startup/shutdown
- Process identification via os.getpid()
- Startup timing measurement
- Resource initialization and cleanup
"""

import os
import time
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS, DATABASE_PATH
from app.logging_config import setup_logging
from db.connection import DatabaseManager
from db.init_db import initialize_database

from app.routes.prediction import router as prediction_router
from app.routes.system import router as system_router
from app.routes.history import router as history_router
from app.routes.patients import router as patients_router
from app.routes.workload import router as workload_router
from app.routes.compare import router as compare_router
from app.routes.database_overview import router as database_overview_router
from app.middleware.audit import AuditMiddleware
from app.services.workload_manager import WorkloadManager

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler (OS concept: graceful startup/shutdown).

    Startup:  Initialize DB connection, create schema, log process info, spawn worker pool.
    Shutdown: Close DB connections, log cleanup.
    """
    start = time.perf_counter()
    pid = os.getpid()

    # Initialize database
    db = DatabaseManager.get_instance(DATABASE_PATH)
    initialize_database(db)

    # Initialize Workload Manager (spawns 2 FCFS worker threads)
    _ = WorkloadManager.get_instance()

    startup_ms = (time.perf_counter() - start) * 1000
    logger.info(
        f"Application started | pid={pid} | "
        f"startup={startup_ms:.0f}ms | db={DATABASE_PATH}"
    )

    yield  # ← Application runs here

    # Shutdown: release resources
    db.close()
    logger.info(f"Application shutdown | pid={pid}")


app = FastAPI(
    title="Healthcare AI",
    version="1.0.0",
    description="Disease Prediction using Lab Reports",
    lifespan=lifespan,
)

# Middleware is applied in reverse order (last added = outermost)
app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prediction_router)
app.include_router(system_router)
app.include_router(history_router)
app.include_router(patients_router)
app.include_router(workload_router)
app.include_router(compare_router)
app.include_router(database_overview_router)



@app.get("/")
def root():
    return {
        "message": "Healthcare AI API is running"
    }