"""Discovery pipeline: Flora → Finn.

Two entry points:
- run_discovery_pipeline(): runs everything, returns the full dashboard dict
  (used where a single blocking result is wanted).
- run_streaming_pipeline(): runs Flora first, then every Finn module
  concurrently, invoking an async callback as EACH section completes so the
  caller can persist + the UI can stream it in.
"""

import asyncio
import logging

from ..config import settings
from .flora import run_flora
from .finn import FINN_MODULES, build_brief, run_finn_module, run_finn

logger = logging.getLogger(__name__)

# Section name → the dashboard keys that section owns. Used by callers to know
# what each module writes. "idea" is special (owned by Flora).
SECTION_KEYS = {
    "idea":       ["idea"],
    "audience":   ["audience_confidence", "segments", "personas", "interview_questions"],
    "validation": ["validation_verdict", "validation_description", "evidence", "radar", "experiments"],
    "competitors": ["competition_level", "openness_score", "competition_summary", "competitors", "your_edges", "matrix"],
    "locations":  ["locations"],
    "financials": ["cost_bands", "monthly_assumptions", "grants", "funding_readiness"],
    "plan":       ["days", "roadmap", "assets", "tasks"],
    "agents":     ["flora_modules", "finn_modules", "agent_log"],
}

ALL_SECTIONS = list(SECTION_KEYS.keys())


def _clean_conversation(conv) -> list[dict]:
    if not isinstance(conv, list):
        return []
    return [
        t for t in conv
        if isinstance(t, dict) and isinstance(t.get("speaker"), str) and isinstance(t.get("text"), str)
    ]


async def run_streaming_pipeline(conversation, on_section) -> None:
    """Run Flora then all Finn modules, calling on_section as each completes.

    on_section(name: str, status: "ready"|"error", patch: dict|None) is awaited.
    `patch` holds the dashboard.* values for that section (None on error).
    """
    conversation = _clean_conversation(conversation)

    # ── Flora first — the idea profile is the shared context for everything ──
    logger.info("Pipeline: Flora analysis (%d turns)", len(conversation))
    try:
        idea_profile = await run_flora(conversation)
    except Exception:
        logger.exception("Flora analysis failed")
        idea_profile = None
    if not isinstance(idea_profile, dict) or not idea_profile:
        idea_profile = {}
        await on_section("idea", "error", None)
    else:
        await on_section("idea", "ready", {"idea": idea_profile})
    logger.info("Pipeline: Flora done — title=%s", idea_profile.get("title"))

    # ── Finn modules concurrently, each streamed as it lands ──
    brief = build_brief(idea_profile)
    semaphore = asyncio.Semaphore(max(1, settings.finn_concurrency))

    async def _one(module):
        async with semaphore:
            data = await run_finn_module(module, brief)
        if data:
            await on_section(module["name"], "ready", data)
        else:
            await on_section(module["name"], "error", None)

    await asyncio.gather(*[_one(m) for m in FINN_MODULES])
    logger.info("Pipeline: all sections complete")


async def run_discovery_pipeline(conversation) -> dict:
    """Run the full pipeline and return the combined dashboard dict."""
    conversation = _clean_conversation(conversation)
    try:
        idea_profile = await run_flora(conversation)
    except Exception:
        logger.exception("Flora analysis failed")
        idea_profile = {}
    if not isinstance(idea_profile, dict):
        idea_profile = {}

    try:
        finn_data = await run_finn(idea_profile)
    except Exception:
        logger.exception("Finn run failed")
        finn_data = {}

    dashboard = {"idea": idea_profile}
    dashboard.update(finn_data if isinstance(finn_data, dict) else {})
    return dashboard
