import logging

from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from ..agents.flora import flora_chat

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/flora", tags=["flora"])


class ChatRequest(BaseModel):
    conversation: list[dict]


@router.post("/chat")
async def chat(body: ChatRequest):
    """Send the conversation so far and get Flora's next message."""
    try:
        return await flora_chat(body.conversation)
    except Exception as e:
        # Surface a clean, readable error to the intake UI instead of a raw
        # 500 stack trace (the frontend displays the message verbatim).
        logger.exception("Flora chat failed")
        raise HTTPException(502, f"Flora couldn't respond: {e}")
