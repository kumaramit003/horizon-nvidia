"""Voice synthesis endpoints — ElevenLabs TTS proxy.

Replaces the previous standalone Node server. The frontend POSTs text +
persona and receives an MP3 stream back. API key never reaches the browser.
"""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from ..config import settings
from adapters.elevenlabs_tts import ElevenLabsTTSClient, ElevenLabsTTSError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["voice"])


class TTSRequest(BaseModel):
    text: str
    persona: Literal["flora", "finn"] = "finn"


def _client() -> ElevenLabsTTSClient | None:
    """Build the ElevenLabs client lazily. Returns None if not configured."""
    if not (
        settings.elevenlabs_api_key
        and settings.elevenlabs_voice_id_flora
        and settings.elevenlabs_voice_id_finn
    ):
        return None
    return ElevenLabsTTSClient(
        api_key=settings.elevenlabs_api_key,
        finn_voice_id=settings.elevenlabs_voice_id_finn,
        flora_voice_id=settings.elevenlabs_voice_id_flora,
        model_id=settings.elevenlabs_model_id,
    )


@router.get("/health")
async def health():
    client = _client()
    return {
        "configured": client is not None,
        "voices": {
            "flora": bool(settings.elevenlabs_voice_id_flora),
            "finn": bool(settings.elevenlabs_voice_id_finn),
        },
        "model_id": settings.elevenlabs_model_id,
    }


@router.post("/tts")
async def tts(body: TTSRequest):
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Missing text")

    client = _client()
    if client is None:
        raise HTTPException(
            503,
            "ElevenLabs is not configured. Set ELEVENLABS_API_KEY, "
            "ELEVENLABS_VOICE_ID_FLORA, ELEVENLABS_VOICE_ID_FINN in .env.",
        )

    try:
        # stream_http yields MP3 chunks synchronously; wrap in a generator
        # that FastAPI's StreamingResponse can consume.
        def iter_chunks():
            yield from client.stream_http(text, persona=body.persona)

        return StreamingResponse(
            iter_chunks(),
            media_type="audio/mpeg",
            headers={"Cache-Control": "no-store"},
        )
    except ElevenLabsTTSError as e:
        logger.error("ElevenLabs TTS error: %s", e)
        raise HTTPException(502, str(e))
