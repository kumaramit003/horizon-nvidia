import asyncio
import logging
from datetime import datetime
from typing import Annotated

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..agents.pipeline import run_discovery_pipeline
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


async def _run_pipeline_and_store(discovery_id: ObjectId, conversation: list[dict]) -> None:
    """Run Flora → Finn and persist the result. Always leaves the doc in a
    terminal state (``dashboard_ready`` or ``error``) so the frontend never
    polls forever."""
    db = get_db()
    try:
        dashboard = await run_discovery_pipeline(conversation)
        # Promote the LLM-generated idea title to the workspace name so the
        # sidebar/switcher don't show the founder's raw transcript.
        title = ((dashboard.get("idea") or {}).get("title") or "").strip()
        update = {
            "dashboard": dashboard,
            "status": "dashboard_ready",
            "error": None,
            "updated_at": datetime.utcnow(),
        }
        if title:
            update["workspace_name"] = title[:80]
        await db.discoveries.update_one({"_id": discovery_id}, {"$set": update})
        logger.info("Pipeline complete for %s", discovery_id)
    except Exception as e:  # noqa: BLE001 — must capture every failure
        logger.exception("Pipeline failed for %s", discovery_id)
        await db.discoveries.update_one(
            {"_id": discovery_id},
            {"$set": {
                "status": "error",
                "error": str(e),
                "updated_at": datetime.utcnow(),
            }},
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


@router.get("/{discovery_id}")
async def get_discovery(discovery_id: str, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    doc = await db.discoveries.find_one({"_id": _oid(discovery_id), "user_id": user["_id"]})
    if not doc:
        raise HTTPException(404, "Discovery not found")
    doc["_id"] = str(doc["_id"])
    return doc


@router.get("/{discovery_id}/dashboard")
async def get_dashboard(discovery_id: str, user: Annotated[dict, Depends(current_user)]):
    db = get_db()
    doc = await db.discoveries.find_one(
        {"_id": _oid(discovery_id), "user_id": user["_id"]}, {"dashboard": 1, "status": 1}
    )
    if not doc:
        raise HTTPException(404, "Discovery not found")
    if doc.get("status") == "processing":
        raise HTTPException(202, "Dashboard is still being generated")
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
            "updated_at": datetime.utcnow(),
        }},
    )

    _spawn_pipeline(oid, conversation)
    return {"ok": True, "id": discovery_id, "status": "processing"}


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
        {"_id": oid}, {"$set": {"status": "processing", "updated_at": datetime.utcnow()}}
    )

    _spawn_pipeline(oid, list(conversation))
    return {"ok": True, "id": discovery_id, "status": "processing"}
