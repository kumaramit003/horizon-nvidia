from pydantic import BaseModel

from fastapi import APIRouter

from ..agents.flora import flora_chat

router = APIRouter(prefix="/api/flora", tags=["flora"])


class ChatRequest(BaseModel):
    conversation: list[dict]


@router.post("/chat")
async def chat(body: ChatRequest):
    """Send the conversation so far and get Flora's next message."""
    result = await flora_chat(body.conversation)
    return result
