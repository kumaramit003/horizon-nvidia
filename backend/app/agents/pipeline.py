"""Full discovery pipeline: Flora → Finn → combined dashboard."""

import logging

from .flora import run_flora
from .finn import run_finn

logger = logging.getLogger(__name__)


def _clean_conversation(conv) -> list[dict]:
    """Filter out anything that isn't a {speaker, text} dict."""
    if not isinstance(conv, list):
        return []
    out = []
    for t in conv:
        if isinstance(t, dict) and isinstance(t.get("speaker"), str) and isinstance(t.get("text"), str):
            out.append(t)
    return out


async def run_discovery_pipeline(conversation) -> dict:
    """Run the full Flora → Finn pipeline and return the complete dashboard dict."""
    conversation = _clean_conversation(conversation)

    # Step 1: Flora analyses the conversation
    logger.info("Pipeline: starting Flora analysis (%d turns)", len(conversation))
    try:
        idea_profile = await run_flora(conversation)
    except Exception as e:
        logger.exception("Flora analysis failed")
        idea_profile = None
    if not isinstance(idea_profile, dict):
        logger.error("Flora returned %s, falling back to empty profile", type(idea_profile).__name__)
        idea_profile = {}
    logger.info("Pipeline: Flora done — title=%s, clarity=%s",
                idea_profile.get("title"), idea_profile.get("clarity_score"))

    # Step 2: Finn runs all research modules. Per-module failures are
    # swallowed inside run_finn; we never let one bad module crash the run.
    logger.info("Pipeline: starting Finn research")
    try:
        finn_data = await run_finn(idea_profile, conversation)
    except Exception as e:
        logger.exception("Finn run failed")
        finn_data = {}
    if not isinstance(finn_data, dict):
        finn_data = {}
    logger.info("Pipeline: Finn done — %d keys returned", len(finn_data))

    dashboard = {"idea": idea_profile}
    dashboard.update(finn_data)
    return dashboard
