"""ElevenLabs text-to-speech client.

This module is intentionally backend-only. Do not expose the API key to the
browser; call this adapter from the gateway and stream bytes back to the UI.
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, AsyncIterable, AsyncIterator, Iterable, Iterator, Literal

Persona = Literal["flora", "finn"]

ELEVENLABS_TTS_HTTP_URL = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
ELEVENLABS_TTS_WS_URL = "wss://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream-input"


@dataclass(frozen=True)
class VoiceSettings:
    stability: float = 0.55
    similarity_boost: float = 0.78
    style: float = 0.1
    use_speaker_boost: bool = True

    def as_payload(self) -> dict[str, Any]:
        return {
            "stability": self.stability,
            "similarity_boost": self.similarity_boost,
            "style": self.style,
            "use_speaker_boost": self.use_speaker_boost,
        }


@dataclass(frozen=True)
class ElevenLabsTTSClient:
    api_key: str
    finn_voice_id: str
    flora_voice_id: str
    model_id: str = "eleven_flash_v2_5"
    output_format: str = "mp3_44100_128"

    @classmethod
    def from_env(cls, env_path: str | Path = ".env") -> "ElevenLabsTTSClient":
        load_dotenv(env_path)
        return cls(
            api_key=required_env("ELEVENLABS_API_KEY"),
            finn_voice_id=required_env("ELEVENLABS_VOICE_ID_FINN"),
            flora_voice_id=required_env("ELEVENLABS_VOICE_ID_FLORA"),
            model_id=os.getenv("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5"),
        )

    def voice_id_for(self, persona: Persona) -> str:
        return self.flora_voice_id if persona == "flora" else self.finn_voice_id

    def default_voice_settings(self, persona: Persona) -> VoiceSettings:
        if persona == "flora":
            return VoiceSettings(stability=0.48, similarity_boost=0.78, style=0.22)
        return VoiceSettings(stability=0.58, similarity_boost=0.78, style=0.1)

    def stream_http(
        self,
        text: str,
        *,
        persona: Persona = "finn",
        voice_settings: VoiceSettings | None = None,
        chunk_size: int = 16_384,
    ) -> Iterator[bytes]:
        """Yield MP3 audio chunks for a complete text response."""
        voice_id = self.voice_id_for(persona)
        query = urllib.parse.urlencode({"output_format": self.output_format})
        url = f"{ELEVENLABS_TTS_HTTP_URL.format(voice_id=urllib.parse.quote(voice_id))}?{query}"
        payload = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": (voice_settings or self.default_voice_settings(persona)).as_payload(),
        }
        request = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            method="POST",
            headers={
                "accept": "audio/mpeg",
                "content-type": "application/json",
                "xi-api-key": self.api_key,
            },
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise ElevenLabsTTSError(f"ElevenLabs TTS failed ({exc.code}): {body}") from exc

    async def stream_websocket(
        self,
        text_chunks: Iterable[str] | AsyncIterable[str],
        *,
        persona: Persona = "finn",
        voice_settings: VoiceSettings | None = None,
        chunk_length_schedule: list[int] | None = None,
    ) -> AsyncIterator[bytes]:
        """Yield audio chunks while text is still being produced by an LLM."""
        try:
            import websockets
        except ImportError as exc:
            raise ElevenLabsTTSError("Install backend requirements: pip install -r backend/requirements.txt") from exc

        voice_id = self.voice_id_for(persona)
        query = urllib.parse.urlencode({"model_id": self.model_id, "output_format": self.output_format})
        uri = f"{ELEVENLABS_TTS_WS_URL.format(voice_id=urllib.parse.quote(voice_id))}?{query}"
        schedule = chunk_length_schedule or [80, 120, 160, 250]

        async with websockets.connect(uri) as websocket:
            await websocket.send(json.dumps({
                "text": " ",
                "xi_api_key": self.api_key,
                "voice_settings": (voice_settings or self.default_voice_settings(persona)).as_payload(),
                "generation_config": {"chunk_length_schedule": schedule},
            }))

            async def produce() -> None:
                async for chunk in async_text_iter(text_chunks):
                    if chunk:
                        await websocket.send(json.dumps({"text": chunk, "try_trigger_generation": True}))
                await websocket.send(json.dumps({"text": ""}))

            producer = asyncio.create_task(produce())
            try:
                while True:
                    message = await websocket.recv()
                    data = json.loads(message)
                    if data.get("audio"):
                        yield base64.b64decode(data["audio"])
                    if data.get("isFinal"):
                        break
            finally:
                if not producer.done():
                    producer.cancel()
                await asyncio.gather(producer, return_exceptions=True)

    def save_http(self, text: str, path: str | Path, *, persona: Persona = "finn") -> Path:
        output_path = Path(path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("wb") as file:
            for chunk in self.stream_http(text, persona=persona):
                file.write(chunk)
        return output_path


class ElevenLabsTTSError(RuntimeError):
    pass


async def async_text_iter(chunks: Iterable[str] | AsyncIterable[str]) -> AsyncIterator[str]:
    if hasattr(chunks, "__aiter__"):
        async for chunk in chunks:  # type: ignore[union-attr]
            yield chunk
    else:
        for chunk in chunks:  # type: ignore[union-attr]
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
        raise ElevenLabsTTSError(f"Missing required environment variable: {name}")
    return value
