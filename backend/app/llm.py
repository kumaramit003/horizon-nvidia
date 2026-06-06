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


def _extract_json(text) -> dict:
    """Pull the first JSON object or array from an LLM response, tolerating markdown fences.
    Always returns a dict — wraps arrays and raises ValueError on truly empty/null input.
    """
    if not text or not isinstance(text, str):
        raise ValueError(f"LLM returned empty/non-string content: {text!r}")
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*\n?([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    for start in range(len(text)):
        if text[start] in "{[":
            try:
                parsed = json.loads(text[start:])
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, dict):
                return parsed
            if isinstance(parsed, list):
                return {"items": parsed}
            raise ValueError(f"LLM returned non-object JSON: {type(parsed).__name__}")
    raise ValueError(f"No valid JSON found in LLM response: {text[:200]}...")


def _content_from(choice) -> tuple[str | None, str | None]:
    """Pull text + finish_reason from a completion choice.

    Reasoning models (e.g. Nemotron *-reasoning) sometimes leave
    message.content empty and place text in a reasoning field, or run out of
    budget mid-think (finish_reason='length') and return nothing at all.
    """
    msg = choice.message
    raw = msg.content
    if not raw:
        raw = getattr(msg, "reasoning_content", None) or getattr(msg, "reasoning", None)
    finish = getattr(choice, "finish_reason", None)
    return raw, finish


async def chat_json(
    system: str,
    user: str,
    *,
    persona: str = "flora",
    temperature: float = 0.4,
    max_tokens: int = 3000,
) -> dict:
    """Send a chat completion to the given persona's model and parse JSON.

    Retries once with a larger token budget if the model truncates before it
    emits any parseable content (common with reasoning models).
    """
    client = get_client(persona)
    model = settings.llm_config_for(persona)["model"]

    async def _once(tokens: int):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=tokens,
            )
        except Exception as e:
            logger.error("LLM[%s] call failed: %s", persona, e)
            raise RuntimeError(f"LLM[{persona}] call failed: {e}") from e
        return _content_from(response.choices[0])

    raw, finish = await _once(max_tokens)

    # If the model returned nothing (or got cut off), give it more room once.
    if not raw and finish == "length":
        logger.warning("LLM[%s] empty content (finish_reason=length) — retrying with 2x tokens", persona)
        raw, finish = await _once(max_tokens * 2)

    if not raw:
        logger.error("LLM[%s] returned no usable content (finish_reason=%s, model=%s)", persona, finish, model)
        raise RuntimeError(
            f"LLM[{persona}] returned no content (finish_reason={finish}). "
            "If this is a reasoning model, increase max_tokens."
        )

    logger.debug("LLM[%s] raw response (%d chars, finish=%s): %s", persona, len(raw), finish, raw[:500])
    try:
        return _extract_json(raw)
    except ValueError as e:
        # Log what the model actually returned so we can see why it didn't
        # parse (prose wrapping, truncated JSON, refusal, etc.).
        logger.error(
            "LLM[%s] JSON parse failed (%s). finish=%s, len=%d. Raw head: %s ... tail: %s",
            persona, e, finish, len(raw), raw[:800], raw[-300:],
        )
        raise
