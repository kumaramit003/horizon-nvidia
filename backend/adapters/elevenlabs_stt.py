"""ElevenLabs realtime speech-to-text client.

The expected input is 16 kHz PCM audio chunks from the browser gateway. The
client yields normalized events for partial and committed transcripts.
"""

from __future__ import annotations

import asyncio
import base64
import inspect
import json
import os
import urllib.parse
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterable, AsyncIterator, Iterable, Literal

CommitStrategy = Literal["manual", "vad"]

ELEVENLABS_STT_WS_URL = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"


@dataclass(frozen=True)
class STTEvent:
    type: str
    text: str = ""
    raw: dict[str, Any] | None = None

    @property
    def is_partial(self) -> bool:
        return self.type == "partial_transcript"

    @property
    def is_final(self) -> bool:
        return self.type in {"committed_transcript", "committed_transcript_with_timestamps"}


@dataclass(frozen=True)
class ElevenLabsSTTClient:
    api_key: str
    model_id: str = "scribe_v2_realtime"
    audio_format: str = "pcm_16000"
    sample_rate: int = 16_000
    language_code: str = "en"
    include_timestamps: bool = True
    include_language_detection: bool = False
    commit_strategy: CommitStrategy = "vad"
    vad_silence_threshold_secs: float = 1.2

    @classmethod
    def from_env(cls, env_path: str | Path = ".env") -> "ElevenLabsSTTClient":
        load_dotenv(env_path)
        return cls(
            api_key=required_env("ELEVENLABS_API_KEY"),
            model_id=os.getenv("ELEVENLABS_STT_MODEL_ID", "scribe_v2_realtime"),
            language_code=os.getenv("ELEVENLABS_STT_LANGUAGE", "en"),
            commit_strategy=os.getenv("ELEVENLABS_STT_COMMIT_STRATEGY", "vad"),  # type: ignore[arg-type]
        )

    async def transcribe_stream(
        self,
        audio_chunks: Iterable[bytes] | AsyncIterable[bytes],
        *,
        previous_text: str | None = None,
        commit_final_chunk: bool = True,
    ) -> AsyncIterator[STTEvent]:
        """Send PCM chunks to ElevenLabs and yield transcript events."""
        try:
            import websockets
        except ImportError as exc:
            raise ElevenLabsSTTError("Install backend requirements: pip install -r backend/requirements.txt") from exc

        query = urllib.parse.urlencode({
            "model_id": self.model_id,
            "audio_format": self.audio_format,
            "sample_rate": self.sample_rate,
            "language_code": self.language_code,
            "include_timestamps": str(self.include_timestamps).lower(),
            "include_language_detection": str(self.include_language_detection).lower(),
            "commit_strategy": self.commit_strategy,
            "vad_silence_threshold_secs": self.vad_silence_threshold_secs,
        })
        uri = f"{ELEVENLABS_STT_WS_URL}?{query}"

        header_kwargs = websocket_header_kwargs(websockets.connect, {"xi-api-key": self.api_key})
        async with websockets.connect(uri, **header_kwargs) as websocket:
            async def produce() -> None:
                saw_chunk = False
                async for chunk in async_bytes_iter(audio_chunks):
                    saw_chunk = True
                    await websocket.send(json.dumps({
                        "message_type": "input_audio_chunk",
                        "audio_base_64": base64.b64encode(chunk).decode("ascii"),
                        "sample_rate": self.sample_rate,
                        "commit": False,
                        **({"previous_text": previous_text} if previous_text else {}),
                    }))

                if saw_chunk and commit_final_chunk:
                    await websocket.send(json.dumps({
                        "message_type": "input_audio_chunk",
                        "audio_base_64": "",
                        "sample_rate": self.sample_rate,
                        "commit": True,
                    }))

            producer = asyncio.create_task(produce())
            try:
                async for event in self._receive_events(websocket):
                    yield event
                    if producer.done() and event.is_final:
                        break
            finally:
                if not producer.done():
                    producer.cancel()
                await asyncio.gather(producer, return_exceptions=True)

    async def _receive_events(self, websocket: Any) -> AsyncIterator[STTEvent]:
        while True:
            raw_message = await websocket.recv()
            payload = json.loads(raw_message)
            message_type = payload.get("message_type", "unknown")

            if message_type == "session_started":
                yield STTEvent(type=message_type, raw=payload)
            elif message_type in {
                "partial_transcript",
                "committed_transcript",
                "committed_transcript_with_timestamps",
            }:
                yield STTEvent(type=message_type, text=payload.get("text", ""), raw=payload)
            elif message_type == "error":
                raise ElevenLabsSTTError(payload.get("message", json.dumps(payload)))
            else:
                yield STTEvent(type=message_type, raw=payload)


class ElevenLabsSTTError(RuntimeError):
    pass


async def async_bytes_iter(chunks: Iterable[bytes] | AsyncIterable[bytes]) -> AsyncIterator[bytes]:
    if hasattr(chunks, "__aiter__"):
        async for chunk in chunks:  # type: ignore[union-attr]
            if chunk:
                yield chunk
    else:
        for chunk in chunks:  # type: ignore[union-attr]
            if chunk:
                yield chunk


def load_dotenv(env_path: str | Path = ".env") -> None:
    path = Path(env_path)
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key.strip(), value)


def required_env(name: str) -> str:
    value = os.getenv(name)
    if not value or value.startswith("replace_with_"):
        raise ElevenLabsSTTError(f"Missing required environment variable: {name}")
    return value


def websocket_header_kwargs(connect: Any, headers: dict[str, str]) -> dict[str, dict[str, str]]:
    parameters = inspect.signature(connect).parameters
    if "additional_headers" in parameters:
        return {"additional_headers": headers}
    return {"extra_headers": headers}
