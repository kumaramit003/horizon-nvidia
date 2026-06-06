import json
import logging
import re

from openai import AsyncOpenAI

from .config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            base_url=settings.nvidia_base_url,
            api_key=settings.nvidia_api_key,
            timeout=120.0,  # per request — fail fast instead of hanging 10 min
            max_retries=1,
        )
    return _client


def _extract_json(text: str) -> dict:
    """Pull the first JSON object or array from an LLM response, tolerating markdown fences."""
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*\n?([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    for start in range(len(text)):
        if text[start] in "{[":
            try:
                return json.loads(text[start:])
            except json.JSONDecodeError:
                continue
    raise ValueError(f"No valid JSON found in LLM response: {text[:200]}...")


async def chat_json(system: str, user: str, temperature: float = 0.4) -> dict:
    """Send a chat completion and parse a JSON response."""
    client = get_client()
    try:
        response = await client.chat.completions.create(
            model=settings.nvidia_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=4096,
        )
    except Exception as e:
        logger.error("LLM call failed: %s", e)
        raise RuntimeError(f"LLM call failed: {e}") from e

    raw = response.choices[0].message.content
    logger.debug("LLM raw response: %s", raw[:500])
    return _extract_json(raw)
