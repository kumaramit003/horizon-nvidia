import asyncio
import logging
from datetime import datetime
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..agents.pipeline import ALL_SECTIONS, SECTION_KEYS, run_streaming_pipeline
from ..agents.finn import answer_question, refine_section
from ..agents.flora import run_flora
from ..agents.converse import agent_chat
from ..database import get_db
from ..models import DiscoveryCreate, DiscoverySummary
from .auth import current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/discoveries", tags=["discoveries"])

# Keep a strong reference to in-flight background pipeline tasks so the event
# loop doesn't garbage-collect them mid-run (asyncio only holds weak refs).
_pipeline_tasks: set[asyncio.Task] = set()


def _oid(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(400, "Invalid discovery ID")


def _initial_sections() -> dict:
    """Every section starts as 'processing' so the UI shows a spinner per page."""
    return {name: "processing" for name in ALL_SECTIONS}


async def _run_pipeline_and_store(discovery_id: ObjectId, conversation: list[dict]) -> None:
    """Stream Flora → Finn into Mongo, one section at a time.

    Each section flips its own status (processing → ready|error) and writes its
    own dashboard keys the moment it completes, so the frontend can render
    sections progressively instead of waiting for the whole run.
    """
    db = get_db()

    async def on_section(name: str, status: str, patch: dict | None) -> None:
        update = {f"sections.{name}": status, "updated_at": datetime.utcnow()}
        if patch:
            for key, value in patch.items():
                update[f"dashboard.{key}"] = value
            if name == "idea":
                title = ((patch.get("idea") or {}).get("title") or "").strip()
                if title:
                    update["workspace_name"] = title[:80]
        await db.discoveries.update_one({"_id": discovery_id}, {"$set": update})
        # As soon as the idea is ready the dashboard is usable — let the UI in.
        if name == "idea":
            await db.discoveries.update_one(
                {"_id": discovery_id}, {"$set": {"status": "ready"}}
            )

    try:
        await run_streaming_pipeline(conversation, on_section)
        await db.discoveries.update_one(
            {"_id": discovery_id},
            {"$set": {"status": "dashboard_ready", "error": None, "updated_at": datetime.utcnow()}},
        )
        logger.info("Pipeline complete for %s", discovery_id)
    except Exception as e:  # noqa: BLE001 — must capture every failure
        logger.exception("Pipeline failed for %s", discovery_id)
        await db.discoveries.update_one(
            {"_id": discovery_id},
            {"$set": {"status": "error", "error": str(e), "updated_at": datetime.utcnow()}},
        )


def _spawn_pipeline(discovery_id: ObjectId, conversation: list[dict]) -> None:
    """Fire the pipeline as a background task and return immediately so the
    HTTP request doesn't block for minutes on slow LLM gateways."""
    task = asyncio.create_task(_run_pipeline_and_store(discovery_id, conversation))
    _pipeline_tasks.add(task)
    task.add_done_callback(_pipeline_tasks.discard)


@router.post("", status_code=201)
async def create_discovery(body: DiscoveryCreate, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    now = datetime.utcnow()

    doc = {
        "workspace_name": body.workspace_name,
        "user_id": user["_id"],
        "intake": body.intake.model_dump(),
        "dashboard": {},
        "sections": _initial_sections(),
        "status": "processing",
        "created_at": now,
        "updated_at": now,
    }
    result = await db.discoveries.insert_one(doc)
    discovery_id = result.inserted_id

    # Pydantic models → plain dicts so downstream agents can index t['speaker'].
    conversation = [t.model_dump() for t in body.intake.conversation]
    _spawn_pipeline(discovery_id, conversation)

    # Return immediately; the frontend polls the discovery until it's ready.
    return {"id": str(discovery_id), "status": "processing"}


@router.get("")
async def list_discoveries(user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    cursor = db.discoveries.find(
        {"user_id": user["_id"]}, {"workspace_name": 1, "status": 1, "created_at": 1}
    ).sort("created_at", -1).limit(50)
    items = []
    async for doc in cursor:
        items.append(
            DiscoverySummary(
                id=str(doc["_id"]),
                workspace_name=doc["workspace_name"],
                status=doc["status"],
                created_at=doc["created_at"],
            )
        )
    return items


@router.delete("/{discovery_id}", status_code=204)
async def delete_discovery(discovery_id: str, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    result = await db.discoveries.delete_one({"_id": _oid(discovery_id), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Discovery not found")


@router.get("/{discovery_id}")
async def get_discovery(discovery_id: str, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    doc = await db.discoveries.find_one({"_id": _oid(discovery_id), "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Discovery not found")
    # Return a JSON-safe subset. Raw Mongo docs carry ObjectId fields
    # (_id, user_id) that FastAPI's encoder can't serialize.
    return {
        "id": str(doc["_id"]),
        "workspace_name": doc.get("workspace_name"),
        "status": doc.get("status"),
        "sections": doc.get("sections") or {},
        "error": doc.get("error"),
        "dashboard": doc.get("dashboard") or {},
        "intake": doc.get("intake"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


@router.get("/{discovery_id}/dashboard")
async def get_dashboard(discovery_id: str, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    doc = await db.discoveries.find_one(
        {"_id": _oid(discovery_id), "user_id": user["_id"]}, {"dashboard": 1, "status": 1}
    )
    if not doc:
        raise HTTPException(404, "Discovery not found")
    # Return whatever's ready — sections stream in, so partial is expected.
    return doc.get("dashboard", {})


@router.patch("/{discovery_id}/dashboard")
async def update_dashboard(discovery_id: str, updates: dict, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    set_fields = {f"dashboard.{k}": v for k, v in updates.items()}
    set_fields["updated_at"] = datetime.utcnow()
    result = await db.discoveries.update_one(
        {"_id": _oid(discovery_id), "user_id": user["_id"]}, {"$set": set_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Discovery not found")
    return {"ok": True}


class RefineRequest(BaseModel):
    command: str
    persona: str | None = None  # "flora" | "finn" | None — informational only


@router.post("/{discovery_id}/refine")
async def refine_discovery(
    discovery_id: str,
    body: RefineRequest,
    user: Annotated[dict, Depends(current_user)],
):
    """Append a voice refinement to the intake and re-run the full pipeline."""
    db = get_db()
    oid = _oid(discovery_id)
    doc = await db.discoveries.find_one({"_id": oid, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Discovery not found")

    command = (body.command or "").strip()
    if not command:
        raise HTTPException(400, "Empty command")

    conversation = list((doc.get("intake") or {}).get("conversation") or [])
    persona_tag = f"[{body.persona}] " if body.persona else ""
    conversation.append({"speaker": "you", "text": f"{persona_tag}{command}"})

    await db.discoveries.update_one(
        {"_id": oid},
        {"$set": {
            "intake.conversation": conversation,
            "status": "processing",
            "sections": _initial_sections(),
            "updated_at": datetime.utcnow(),
        }},
    )

    _spawn_pipeline(oid, conversation)
    return {"ok": True, "id": discovery_id, "status": "processing"}


class SectionRefineRequest(BaseModel):
    section: str
    instruction: str = ""


async def _run_section_and_store(discovery_id: ObjectId, section: str, idea: dict, instruction: str) -> None:
    """Re-run ONE Finn section in the background and persist just its keys."""
    db = get_db()
    try:
        data = await refine_section(section, idea, instruction)
        update = {f"sections.{section}": "ready" if data else "error", "updated_at": datetime.utcnow()}
        if data:
            for k, v in data.items():
                update[f"dashboard.{k}"] = v
        await db.discoveries.update_one({"_id": discovery_id}, {"$set": update})
        # If nothing else is processing, mark the workspace fully ready again.
        doc = await db.discoveries.find_one({"_id": discovery_id}, {"sections": 1})
        secs = (doc or {}).get("sections") or {}
        if not any(s == "processing" for s in secs.values()):
            await db.discoveries.update_one({"_id": discovery_id}, {"$set": {"status": "dashboard_ready"}})
    except Exception:
        logger.exception("Section refine failed for %s/%s", discovery_id, section)
        await db.discoveries.update_one({"_id": discovery_id}, {"$set": {f"sections.{section}": "error"}})


@router.post("/{discovery_id}/refine-section")
async def refine_discovery_section(
    discovery_id: str,
    body: SectionRefineRequest,
    user: Annotated[dict, Depends(current_user)],
):
    """Ask Finn to dig deeper on ONE area — re-runs just that section."""
    section = body.section
    if section not in SECTION_KEYS or section == "idea":
        raise HTTPException(400, f"Unknown section '{section}'")
    db = get_db()
    oid = _oid(discovery_id)
    doc = await db.discoveries.find_one({"_id": oid, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Discovery not found")

    idea = (doc.get("dashboard") or {}).get("idea") or {}
    await db.discoveries.update_one(
        {"_id": oid},
        {"$set": {f"sections.{section}": "processing", "status": "processing", "updated_at": datetime.utcnow()}},
    )
    task = asyncio.create_task(_run_section_and_store(oid, section, idea, body.instruction.strip()))
    _pipeline_tasks.add(task)
    task.add_done_callback(_pipeline_tasks.discard)
    return {"ok": True, "id": discovery_id, "section": section, "status": "processing"}


class AnswerRequest(BaseModel):
    question: str
    answer: str


async def _run_flora_only(discovery_id: ObjectId, conversation: list[dict]) -> None:
    """Re-run only Flora's idea analysis (fast) after the founder answers an
    open question — refreshes clarity score + open questions, keeps the rest."""
    db = get_db()
    try:
        idea = await run_flora(conversation)
        update = {"sections.idea": "ready", "updated_at": datetime.utcnow()}
        if isinstance(idea, dict) and idea:
            update["dashboard.idea"] = idea
            title = (idea.get("title") or "").strip()
            if title:
                update["workspace_name"] = title[:80]
        await db.discoveries.update_one({"_id": discovery_id}, {"$set": update})
        doc = await db.discoveries.find_one({"_id": discovery_id}, {"sections": 1})
        secs = (doc or {}).get("sections") or {}
        if not any(s == "processing" for s in secs.values()):
            await db.discoveries.update_one({"_id": discovery_id}, {"$set": {"status": "dashboard_ready"}})
    except Exception:
        logger.exception("Flora-only re-run failed for %s", discovery_id)
        await db.discoveries.update_one({"_id": discovery_id}, {"$set": {"sections.idea": "ready"}})


class ChatRequest(BaseModel):
    agent: str  # 'flora' | 'finn'
    messages: list[dict]


@router.post("/{discovery_id}/chat")
async def chat_with_agent(discovery_id: str, body: ChatRequest, user: Annotated[dict, Depends(current_user)]):
    """Conversational turn with Flora or Finn. No mutation — the agent may
    PROPOSE a change the founder then approves via /refine|/refine-section."""
    agent = body.agent if body.agent in ("flora", "finn") else "flora"
    db = get_db()
    doc = await db.discoveries.find_one({"_id": _oid(discovery_id), "user_id": user["_id"]}, {"dashboard": 1})
    if not doc:
        raise HTTPException(404, "Discovery not found")
    try:
        return await agent_chat(agent, doc.get("dashboard") or {}, body.messages or [])
    except Exception as e:
        logger.exception("Agent chat failed")
        raise HTTPException(502, f"{agent.title()} couldn't reply: {e}")


@router.post("/{discovery_id}/answer")
async def answer_open_question(discovery_id: str, body: AnswerRequest, user: Annotated[dict, Depends(current_user)]):
    """Record the founder's answer to an open question and re-run Flora's idea
    analysis so clarity rises and the question resolves."""
    q = (body.question or "").strip()
    a = (body.answer or "").strip()
    if not a:
        raise HTTPException(400, "Empty answer")
    db = get_db()
    oid = _oid(discovery_id)
    doc = await db.discoveries.find_one({"_id": oid, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Discovery not found")

    conversation = list((doc.get("intake") or {}).get("conversation") or [])
    if q:
        conversation.append({"speaker": "flora", "text": q})
    conversation.append({"speaker": "you", "text": a})

    await db.discoveries.update_one(
        {"_id": oid},
        {"$set": {"intake.conversation": conversation, "sections.idea": "processing",
                  "status": "processing", "updated_at": datetime.utcnow()}},
    )
    task = asyncio.create_task(_run_flora_only(oid, conversation))
    _pipeline_tasks.add(task)
    task.add_done_callback(_pipeline_tasks.discard)
    return {"ok": True, "id": discovery_id, "status": "processing"}


class AskRequest(BaseModel):
    question: str


@router.post("/{discovery_id}/ask")
async def ask_finn(discovery_id: str, body: AskRequest, user: Annotated[dict, Depends(current_user)]):
    """Finn answers a question about the generated insights. No mutation."""
    q = (body.question or "").strip()
    if not q:
        raise HTTPException(400, "Empty question")
    db = get_db()
    doc = await db.discoveries.find_one({"_id": _oid(discovery_id), "user_id": user["_id"]}, {"dashboard": 1})
    if not doc:
        raise HTTPException(404, "Discovery not found")
    try:
        answer = await answer_question(doc.get("dashboard") or {}, q)
    except Exception as e:
        logger.exception("Finn Q&A failed")
        raise HTTPException(502, f"Finn couldn't answer: {e}")
    return {"answer": answer}


@router.post("/{discovery_id}/rerun")
async def rerun_discovery(discovery_id: str, user: Annotated[dict, Depends(current_user)]):
    """Re-run Flora analysis + Finn modules on the existing intake conversation."""
    db = get_db()
    oid = _oid(discovery_id)
    doc = await db.discoveries.find_one({"_id": oid, "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Discovery not found")

    conversation = (doc.get("intake") or {}).get("conversation", [])
    if not conversation:
        raise HTTPException(400, "This workspace has no intake conversation to re-run")

    await db.discoveries.update_one(
        {"_id": oid},
        {"$set": {
            "status": "processing",
            "sections": _initial_sections(),
            "updated_at": datetime.utcnow(),
        }},
    )

    _spawn_pipeline(oid, list(conversation))
    return {"ok": True, "id": discovery_id, "status": "processing"}
