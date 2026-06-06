import json
import logging
import re

from openai import AsyncOpenAI

from .config import settings

logger = logging.getLogger(__name__)

# One client per persona — each persona has its own API key + model.
_clients: dict[str, AsyncOpenAI] = {}


def get_client(persona: str = "flora") -> AsyncOpenAI:
    if persona not in _clients:
        cfg = settings.llm_config_for(persona)
        _clients[persona] = AsyncOpenAI(
            base_url=cfg["base_url"],
            api_key=cfg["api_key"],
            timeout=170.0,
            max_retries=0,
        )
        logger.info("LLM[%s] init: base=%s model=%s", persona, cfg["base_url"], cfg["model"])
    return _clients[persona]


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


async def chat_json(
    system: str,
    user: str,
    *,
    persona: str = "flora",
    temperature: float = 0.4,
    max_tokens: int = 1500,
) -> dict:
    """Send a chat completion to the given persona's model and parse JSON."""
    client = get_client(persona)
    model = settings.llm_config_for(persona)["model"]
    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
        )
    except Exception as e:
        logger.error("LLM[%s] call failed: %s", persona, e)
        raise RuntimeError(f"LLM[{persona}] call failed: {e}") from e

    raw = response.choices[0].message.content
    logger.debug("LLM[%s] raw response: %s", persona, raw[:500])
    return _extract_json(raw)
