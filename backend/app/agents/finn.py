"""Finn — the Research & Planning Agent.

Takes Flora's idea profile and the intake conversation, then generates
all research sections: audience, validation, locations, financials, and action plan.
"""

import logging

from ..llm import chat_json

logger = logging.getLogger(__name__)

SYSTEM_AUDIENCE = """\
You are Finn, a sharp London startup research agent. You have access to London Datastore datasets
(workplace zone statistics, census data, business demography, TfL flows, etc.).

Given an idea profile from Flora, generate the Target Audience analysis.
Respond with a single JSON object:

{
  "audience_confidence": 0-100 integer,
  "segments": [
    {
      "name": "Segment name",
      "need": "What they need from this business",
      "pay": "High|Medium|Low",
      "channel": "How to reach them",
      "conf": "High|Medium|Low|Low-Medium|Medium-High",
      "icon": "Building2|Users|HeartPulse|CalendarDays|Briefcase|ShoppingCart|Globe|Utensils",
      "tone": "peach|lavender|mint|butter|sky|rose"
    }
    ... (generate 3-5 segments, ranked by combined demand × willingness to pay)
  ],
  "personas": [
    {
      "name": "First name",
      "title": "Professional title",
      "role": "Role · Location context",
      "pain": "Their main pain point in one sentence",
      "trigger": "What triggers their buying decision",
      "offer": "What this business offers them",
      "tone": "peach|lavender|mint|butter",
      "initials": "First letter of name"
    }
    ... (generate 2-3 personas)
  ],
  "interview_questions": ["Question 1", ...] (generate 4-6 customer discovery questions)
}

Be specific to the London market. Reference real London areas, demographics, and business patterns.
Do NOT use generic advice — make it feel like you've actually read London data.
"""

SYSTEM_VALIDATION = """\
You are Finn, a London startup research agent with access to London Datastore datasets.

Given an idea profile, generate Market Validation analysis.
Respond with a single JSON object:

{
  "validation_verdict": "One punchy sentence with an em dash for dramatic split (e.g. 'Promising — but you'll have to earn it.')",
  "validation_description": "2-3 sentences explaining the verdict with specific London market evidence",
  "evidence": [
    {
      "signal": "What the data shows (short)",
      "impact": "Positive|Risk|Opportunity|Neutral",
      "conf": "High|Medium|Low",
      "source_name": "Name of the London Datastore dataset or public data source",
      "source_slug": "slug-for-data-london-gov-uk (e.g. workplace-zone-statistics, business-demography, census-2021-religion, high-streets-health, tfl-open-data, food-business-est, voa-floorspace, borough-profiles, gla-funding-support, survey-of-londoners, planning-applications, air-quality)",
      "tone": "mint|rose|lavender|butter|sky|peach",
      "icon": "TrendingUp|ShieldAlert|Lightbulb|Database|BarChart3|Users"
    }
    ... (generate 4-6 evidence cards)
  ],
  "radar": [
    {"label": "Demand", "value": 0.0-1.0},
    {"label": "Competition", "value": 0.0-1.0},
    {"label": "Cost", "value": 0.0-1.0},
    {"label": "Location", "value": 0.0-1.0},
    {"label": "Licensing", "value": 0.0-1.0},
    {"label": "Operational", "value": 0.0-1.0},
    {"label": "Funding", "value": 0.0-1.0}
  ],
  "experiments": [
    {"title": "Experiment description", "impact": "High|Medium|Low", "effort": "High|Medium|Low", "days": "Time estimate"},
    ... (generate 4-6 experiments, ordered by impact/effort ratio)
  ]
}

Higher radar values = more concerning/risky. Be specific to the London context.
Reference real London areas, datasets, and market realities.
"""

SYSTEM_LOCATIONS = """\
You are Finn, a London startup research agent. Given an idea profile, recommend London locations.
Respond with a single JSON object:

{
  "locations": [
    {
      "id": "short-id",
      "name": "Area name",
      "demand": "High|Medium|Medium-High|Low",
      "compete": "High|Medium|Low",
      "transport": "High|Medium|Low",
      "cost": "High|Medium|Low",
      "b2b": "High|Medium|Low",
      "reco": "One-line recommendation",
      "score": 0-100 fit score,
      "x": 0-100 approximate x position on a London map (east London ~70-90, central ~45-65, west ~10-40),
      "y": 0-100 approximate y position (north ~20-35, central ~35-55, south ~55-75),
      "primary": true for top pick only, false for others
    }
    ... (generate 3-5 locations, sorted by score descending)
  ]
}

Only recommend real London areas. Be specific about WHY each area fits or doesn't.
Consider the business type, target audience, and budget from the idea profile.
"""

SYSTEM_FINANCIALS = """\
You are Finn, a London startup financial advisor. Given an idea profile, generate financial analysis.
Respond with a single JSON object:

{
  "cost_bands": [
    {"title": "Band name", "range": "£Xk – £Yk", "subtitle": "What this gets you", "tone": "peach|mint|sky|rose", "tag": "Recommended|Opportunity|Neutral|Risk", "fill": 0-100 visual fill percentage},
    ... (generate 3-4 bands from lean to full, with Recommended on the one matching their budget)
  ],
  "monthly_assumptions": [
    {"row": "Line item", "range": "£X / mo or £X one-off", "notes": "Explanation", "icon": "ChefHat|PoundSterling|FileText|Sparkles|Megaphone|ShieldCheck|Truck|Globe|Users"},
    ... (generate 6-10 realistic monthly cost items for this specific business in London)
  ],
  "grants": [
    {
      "name": "Grant or support scheme name",
      "fit": 0-100 match percentage,
      "why": "Why this scheme fits this founder",
      "notes": "Eligibility notes",
      "deadline": "Rolling|Quarterly|specific deadline",
      "docs": ["Required doc 1", "Required doc 2"],
      "tone": "mint|peach|lavender|butter"
    }
    ... (generate 3-5 real or realistic London/UK grants and support schemes)
  ],
  "funding_readiness": 0-100 integer (how ready the founder is to apply for funding based on what they've shared)
}

All costs MUST be in GBP (£) and realistic for London 2024-2025 market rates.
Reference real London support schemes where possible (GLA programmes, Start Up Loans, local enterprise schemes).
"""

SYSTEM_PLAN = """\
You are Finn, a London startup planning agent. Given an idea profile, generate an action plan.
Respond with a single JSON object:

{
  "days": [
    {"d": "01", "title": "Task for day 1", "status": "done|doing|todo", "owner": "You|You + Agent Name"},
    ... (generate exactly 7 days, day 01 = done, day 02 = doing, rest = todo)
  ],
  "roadmap": [
    {"window": "30 days", "goal": "Goal statement", "tone": "peach", "detail": ["Milestone 1", "Milestone 2", "Milestone 3"]},
    {"window": "60 days", "goal": "Goal statement", "tone": "lavender", "detail": ["Milestone 1", "Milestone 2", "Milestone 3"]},
    {"window": "90 days", "goal": "Goal statement", "tone": "mint", "detail": ["Milestone 1", "Milestone 2", "Milestone 3"]}
  ],
  "assets": [
    {"title": "Asset name", "icon": "ClipboardList|Globe|Mail|FileText|Building2|Presentation|MapPin|Users|BarChart3", "tone": "peach|sky|lavender|butter|mint|rose"},
    ... (generate 6-8 downloadable assets Finn would generate for this founder)
  ],
  "tasks": [
    {"t": "Task description", "status": "in_progress|todo", "tag": "Recommended|Opportunity|Neutral"},
    ... (generate 4-6 priority tasks for this week)
  ]
}

Make the plan specific to THIS business in London. Days should be realistic for a founder
who may be doing this alongside a day job. Focus on validation before commitment.
"""

SYSTEM_AGENTS = """\
You are generating the agent workspace metadata. Given an idea profile, produce the agent activity log.
Respond with a single JSON object:

{
  "flora_modules": [
    {"name": "Module name", "desc": "What this module did, specific to this idea", "icon": "Mic|MessageSquare|ShieldAlert|Users|Lightbulb", "status": "done", "time": "Xm ago", "sources": 0},
    ... (generate 3 Flora modules — she does discovery, profiling, assumption probing)
  ],
  "finn_modules": [
    {"name": "Module name", "desc": "What this module did, specific to this idea", "icon": "Users|BarChart3|MapPin|PoundSterling|ShieldAlert|ListChecks", "status": "done|running|queued", "time": "Xm ago|now|queued", "sources": 0-8},
    ... (generate 5-6 Finn modules — audience, market, location, funding, risk, launch plan)
  ],
  "agent_log": [
    {"text": "Specific assumption or caveat from the analysis", "conf": "High|Medium|Low", "who": "Flora|Finn"},
    ... (generate 4-6 honest log entries about what the agents are uncertain about)
  ]
}

Make descriptions specific to THIS idea, not generic. Log entries should be honest about
what data was used as a proxy and where confidence is lower.
"""


async def run_finn(idea_profile, conversation) -> dict:
    """Run all Finn research modules and return combined dashboard data."""
    # Defensive: pipeline cleans these but belt-and-braces.
    if not isinstance(idea_profile, dict):
        idea_profile = {}
    if not isinstance(conversation, list):
        conversation = []
    safe_turns = [t for t in conversation if isinstance(t, dict) and "speaker" in t and "text" in t]

    transcript = "\n".join(
        f"{'Flora' if t.get('speaker') == 'flora' else 'Founder'}: {t.get('text', '')}"
        for t in safe_turns
    )
    context = (
        f"Idea Profile:\n"
        f"Title: {idea_profile.get('title', 'Unknown')}\n"
        f"Description: {idea_profile.get('subtitle', '')}\n"
        f"Business type: {idea_profile.get('business_type', '')}\n"
        f"Stage: {idea_profile.get('stage', '')}\n"
        f"Revenue: {idea_profile.get('revenue', '')}\n"
        f"Flora's note: {idea_profile.get('flora_note', '')}\n"
        f"\nOriginal conversation:\n{transcript}"
    )

    logger.info("Finn running 6 research modules")

    import asyncio
    import time

    from ..config import settings

    # Per-module timeout + concurrency are configurable. Low concurrency suits
    # a single-GPU NIM; raise FINN_CONCURRENCY when Finn uses a scalable
    # gateway. Slow gateways (e.g. openclaw) need a longer timeout.
    MODULE_TIMEOUT = settings.finn_module_timeout
    semaphore = asyncio.Semaphore(max(1, settings.finn_concurrency))

    async def _run_module(label, system, temp, max_tokens):
        async with semaphore:
            start = time.time()
            logger.info("[finn:%s] starting (max_tokens=%d, temp=%s)", label, max_tokens, temp)
            try:
                result = await asyncio.wait_for(
                    chat_json(system, context, persona="finn", temperature=temp, max_tokens=max_tokens),
                    timeout=MODULE_TIMEOUT,
                )
                elapsed = time.time() - start
                logger.info("[finn:%s] OK in %.1fs (%d top-level keys)", label, elapsed, len(result))
                return result
            except asyncio.TimeoutError:
                elapsed = time.time() - start
                logger.error("[finn:%s] TIMED OUT after %.1fs", label, elapsed)
                return None
            except Exception as e:
                elapsed = time.time() - start
                logger.error("[finn:%s] FAILED in %.1fs: %s", label, elapsed, e)
                return None

    # max_tokens needs to cover thinking AND JSON output for a reasoning model.
    # Too low → JSON gets truncated mid-stream and parsing fails. 2500–3500
    # is the sweet spot for these prompts.
    results = await asyncio.gather(
        _run_module("audience",   SYSTEM_AUDIENCE,   0.3, max_tokens=3000),
        _run_module("validation", SYSTEM_VALIDATION, 0.3, max_tokens=3500),
        _run_module("locations",  SYSTEM_LOCATIONS,  0.3, max_tokens=2500),
        _run_module("financials", SYSTEM_FINANCIALS, 0.3, max_tokens=3000),
        _run_module("plan",       SYSTEM_PLAN,       0.3, max_tokens=3000),
        _run_module("agents",     SYSTEM_AGENTS,     0.2, max_tokens=2000),
    )

    dashboard = {}
    succeeded = 0
    for label, result in zip(["audience","validation","locations","financials","plan","agents"], results):
        if result is not None:
            dashboard.update(result)
            succeeded += 1
    logger.info("[finn] %d/6 modules succeeded", succeeded)

    return dashboard
