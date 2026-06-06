"""Full discovery pipeline: Flora → Finn → combined dashboard."""

import logging

from .flora import run_flora
from .finn import run_finn

logger = logging.getLogger(__name__)


async def run_discovery_pipeline(conversation: list[dict]) -> dict:
    """Run the full Flora → Finn pipeline and return the complete dashboard dict."""

    # Step 1: Flora analyses the conversation
    logger.info("Pipeline: starting Flora analysis")
    idea_profile = await run_flora(conversation)
    logger.info("Pipeline: Flora complete — title=%s, clarity=%s",
                idea_profile.get("title"), idea_profile.get("clarity_score"))

    # Step 2: Finn runs all research modules in parallel
    logger.info("Pipeline: starting Finn research")
    finn_data = await run_finn(idea_profile, conversation)
    logger.info("Pipeline: Finn complete — %d keys returned", len(finn_data))

    # Combine into full dashboard
    dashboard = {"idea": idea_profile}
    dashboard.update(finn_data)

    return dashboard
