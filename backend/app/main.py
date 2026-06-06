import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import close_db, connect_db
from .routers import auth, discoveries, flora, voice

# Make our app loggers actually show up in `docker logs`. Without this,
# uvicorn only emits its own access lines and our pipeline/finn/flora
# logger.info/logger.exception calls are silently dropped.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s | %(message)s",
)


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await _recover_stale_discoveries()
    yield
    await close_db()


async def _recover_stale_discoveries():
    """A backend restart kills any in-flight pipeline background tasks, leaving
    their discovery docs stuck at ``status: processing`` forever (the frontend
    would poll endlessly). Flip those to ``error`` on boot so the UI can show a
    retry instead of an infinite spinner."""
    from .database import get_db

    try:
        db = get_db()
        result = await db.discoveries.update_many(
            {"status": "processing"},
            {"$set": {
                "status": "error",
                "error": "Generation was interrupted by a server restart. Please re-run.",
            }},
        )
        if result.modified_count:
            logger.warning(
                "Recovered %d stale 'processing' discoveries → 'error'",
                result.modified_count,
            )
    except Exception:
        logger.exception("Failed to recover stale discoveries on startup")


app = FastAPI(
    title="FounderOS London API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(discoveries.router)
app.include_router(flora.router)
app.include_router(voice.router)
app.include_router(auth.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
