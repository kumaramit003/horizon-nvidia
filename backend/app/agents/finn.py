"""Finn — the Research & Planning Agent.

Finn turns Flora's structured idea profile into the dashboard research
sections. Two design choices keep this fast and cheap:

1. CONTEXT REUSE — Flora already distilled the (long) intake conversation
   into a compact idea profile. Finn reuses that small "brief" for every
   module instead of re-sending the full transcript 6 times. That cuts
   input tokens dramatically.

2. INDEPENDENT MODULES — each section is its own small request with a tight
   prompt and a focused JSON shape, so they can run concurrently and stream
   into the UI one at a time (see pipeline.run_streaming_pipeline).
"""

import asyncio
import logging
import time

from ..config import settings
from ..llm import chat_json

logger = logging.getLogger(__name__)


def build_brief(idea_profile: dict) -> str:
    """Compact, reusable context built from Flora's structured profile.

    This replaces re-sending the whole transcript to every Finn module.
    """
    ip = idea_profile if isinstance(idea_profile, dict) else {}
    lines = []

    def add(label, value):
        v = (value or "").strip() if isinstance(value, str) else value
        if v:
            lines.append(f"{label}: {v}")

    add("Idea", ip.get("title"))
    add("Summary", ip.get("subtitle"))
    add("Type", ip.get("business_type"))
    add("Stage", ip.get("stage"))
    add("Physical site", ip.get("physical_site"))
    add("Revenue", ip.get("revenue"))
    add("Read", ip.get("flora_note"))

    assumptions = ip.get("assumptions") or []
    texts = [a.get("text", "") for a in assumptions if isinstance(a, dict) and a.get("text")]
    if texts:
        lines.append("Assumptions: " + "; ".join(texts[:6]))

    if not lines:
        lines.append("Idea: (the founder's idea — infer from any available context)")

    return (
        "London startup idea profile. Be specific to THIS idea and the London "
        "market. Reference real London areas, datasets and economics.\n\n"
        + "\n".join(lines)
    )


# ── Module prompts (terse on purpose — keys must match the frontend) ─────────
# Every prompt ends by demanding a single JSON object and nothing else.

SYSTEM_AUDIENCE = """You are Finn, a London startup research analyst.
From the idea profile, produce the Target Audience analysis as ONE JSON object:
{
 "audience_confidence": <int 0-100>,
 "segments": [ {"name","need","pay":"High|Medium|Low","channel","conf":"High|Medium|Low|Low-Medium|Medium-High","icon":"Building2|Users|HeartPulse|CalendarDays|Briefcase|ShoppingCart|Globe|Utensils","tone":"peach|lavender|mint|butter|sky|rose"} ] (3-4, ranked by demand x willingness-to-pay),
 "personas": [ {"name","title","role","pain","trigger","offer","tone":"peach|lavender|mint|butter","initials"} ] (2),
 "interview_questions": [ ... ] (5)
}
Keep every string under 16 words. Output JSON only."""

SYSTEM_VALIDATION = """You are Finn, a London startup research analyst.
From the idea profile, produce Market Validation as ONE JSON object:
{
 "validation_verdict": "one punchy line with an em dash, e.g. 'Promising — but you'll have to earn it.'",
 "validation_description": "2 sentences with specific London evidence",
 "evidence": [ {"signal":"<=8 words","impact":"Positive|Risk|Opportunity|Neutral","conf":"High|Medium|Low","source_name","source_slug":"workplace-zone-statistics|business-demography|census-2021-religion|high-streets-health|tfl-open-data|food-business-est|voa-floorspace|borough-profiles|gla-funding-support|survey-of-londoners|planning-applications|air-quality","tone":"mint|rose|lavender|butter|sky|peach","icon":"TrendingUp|ShieldAlert|Lightbulb|Database|BarChart3|Users"} ] (4),
 "radar": [ {"label":"Demand","value":0.0-1.0},{"label":"Competition","value":..},{"label":"Cost","value":..},{"label":"Location","value":..},{"label":"Licensing","value":..},{"label":"Operational","value":..},{"label":"Funding","value":..} ] (higher=riskier),
 "experiments": [ {"title":"<=14 words","impact":"High|Medium|Low","effort":"High|Medium|Low","days":"e.g. 3 days"} ] (4, best impact/effort first)
}
Output JSON only."""

SYSTEM_LOCATIONS = """You are Finn, a London location analyst.
From the idea profile, recommend real London areas as ONE JSON object:
{
 "locations": [ {"id":"slug","name","demand":"High|Medium|Medium-High|Low","compete":"High|Medium|Low","transport":"High|Medium|Low","cost":"High|Medium|Low","b2b":"High|Medium|Low","reco":"<=10 words","score":0-100,"x":0-100,"y":0-100,"primary":true|false} ] (4, sorted by score desc, exactly one primary=true)
}
x: east London 70-90, central 45-65, west 10-40. y: north 20-35, central 35-55, south 55-75.
Output JSON only."""

SYSTEM_FINANCIALS = """You are Finn, a London startup finance analyst. GBP only, realistic 2024-25 London rates.
From the idea profile, produce financials as ONE JSON object:
{
 "cost_bands": [ {"title","range":"£Xk – £Yk","subtitle":"<=8 words","tone":"peach|mint|sky|rose","tag":"Recommended|Opportunity|Neutral|Risk","fill":0-100} ] (4, lean to full; Recommended on the band matching their budget),
 "monthly_assumptions": [ {"row","range":"£X / mo or £X one-off","notes":"<=10 words","icon":"ChefHat|PoundSterling|FileText|Sparkles|Megaphone|ShieldCheck|Truck|Globe|Users"} ] (6-8),
 "grants": [ {"name","fit":0-100,"why":"<=16 words","notes":"<=10 words","deadline":"Rolling|Quarterly|date","docs":["..."],"tone":"mint|peach|lavender|butter"} ] (3, real UK/London schemes),
 "funding_readiness": 0-100
}
Output JSON only."""

SYSTEM_PLAN = """You are Finn, a London startup planning analyst.
From the idea profile, produce an action plan as ONE JSON object:
{
 "days": [ {"d":"01","title":"<=10 words","status":"done|doing|todo","owner":"You|You + <agent>"} ] (exactly 7; day 01 done, 02 doing, rest todo),
 "roadmap": [ {"window":"30 days","goal","tone":"peach","detail":["..","..",".."]},{"window":"60 days","goal","tone":"lavender","detail":[..]},{"window":"90 days","goal","tone":"mint","detail":[..]} ],
 "assets": [ {"title","icon":"ClipboardList|Globe|Mail|FileText|Building2|Presentation|MapPin|Users|BarChart3","tone":"peach|sky|lavender|butter|mint|rose"} ] (6),
 "tasks": [ {"t":"<=10 words","status":"in_progress|todo","tag":"Recommended|Opportunity|Neutral"} ] (5)
}
Realistic for a founder doing this alongside a day job. Output JSON only."""

SYSTEM_AGENTS = """You are Finn. Produce the agent workspace log as ONE JSON object:
{
 "flora_modules": [ {"name","desc":"<=12 words","icon":"Mic|MessageSquare|ShieldAlert|Users|Lightbulb","status":"done","time":"Xm ago","sources":0} ] (3),
 "finn_modules": [ {"name","desc":"<=12 words","icon":"Users|BarChart3|MapPin|PoundSterling|ShieldAlert|ListChecks","status":"done","time":"Xm ago","sources":0-8} ] (5),
 "agent_log": [ {"text":"<=16 words honest caveat","conf":"High|Medium|Low","who":"Flora|Finn"} ] (4)
}
Be specific to this idea. Output JSON only."""


# Registry — each entry is one independent, streamable module.
FINN_MODULES = [
    {"name": "audience",   "system": SYSTEM_AUDIENCE,   "temp": 0.3, "max_tokens": 2200},
    {"name": "validation", "system": SYSTEM_VALIDATION, "temp": 0.3, "max_tokens": 2600},
    {"name": "locations",  "system": SYSTEM_LOCATIONS,  "temp": 0.3, "max_tokens": 1800},
    {"name": "financials", "system": SYSTEM_FINANCIALS, "temp": 0.3, "max_tokens": 2400},
    {"name": "plan",       "system": SYSTEM_PLAN,       "temp": 0.3, "max_tokens": 2200},
    {"name": "agents",     "system": SYSTEM_AGENTS,     "temp": 0.2, "max_tokens": 2200},
]

FINN_MODULE_BY_NAME = {m["name"]: m for m in FINN_MODULES}


async def run_finn_module(module: dict, brief: str) -> dict | None:
    """Run a single Finn module against the compact brief. Returns the parsed
    dict, or None on timeout/failure (caller decides how to mark it)."""
    name = module["name"]
    start = time.time()
    logger.info("[finn:%s] starting (max_tokens=%d)", name, module["max_tokens"])
    try:
        result = await asyncio.wait_for(
            chat_json(
                module["system"], brief,
                persona="finn",
                temperature=module["temp"],
                max_tokens=module["max_tokens"],
            ),
            timeout=settings.finn_module_timeout,
        )
        logger.info("[finn:%s] OK in %.1fs (%d keys)", name, time.time() - start, len(result))
        return result
    except asyncio.TimeoutError:
        logger.error("[finn:%s] TIMED OUT after %.1fs", name, time.time() - start)
        return None
    except Exception as e:  # noqa: BLE001
        logger.error("[finn:%s] FAILED in %.1fs: %s", name, time.time() - start, e)
        return None


async def run_finn(idea_profile, conversation=None) -> dict:
    """Run all Finn modules and merge into one dashboard dict.

    Kept for callers that want the whole thing at once. The streaming path
    in pipeline.run_streaming_pipeline is preferred for the live UI.
    """
    brief = build_brief(idea_profile if isinstance(idea_profile, dict) else {})
    semaphore = asyncio.Semaphore(max(1, settings.finn_concurrency))

    async def _guarded(module):
        async with semaphore:
            return await run_finn_module(module, brief)

    results = await asyncio.gather(*[_guarded(m) for m in FINN_MODULES])
    dashboard, ok = {}, 0
    for module, result in zip(FINN_MODULES, results):
        if result:
            dashboard.update(result)
            ok += 1
    logger.info("[finn] %d/%d modules succeeded", ok, len(FINN_MODULES))
    return dashboard
