"""Conversational mode for Flora & Finn.

The agent holds a real back-and-forth with the founder — it can ask questions,
push back, defend its reasoning — and only when there's a concrete change both
sides agree on does it PROPOSE that change. The founder approves before the
dashboard is mutated (the apply is a separate call).
"""

import logging

from ..llm import chat_json
from .finn import _dashboard_digest

logger = logging.getLogger(__name__)

FLORA_CHAT = """You are FLORA — a warm, curious, energetic discovery agent for a London
founder. You're talking through their IDEA. You genuinely engage: react, ask,
and when you disagree, push back kindly but honestly ("Hmm, I'm not sure — here's
why…"). You're not a pushover and not a yes-bot. Keep replies to 2-4 short,
spoken-sounding sentences.

You can change the founder's IDEA PROFILE (which rebuilds their whole plan).
Only propose a change once you BOTH clearly agree on something concrete to update
(e.g. a corrected assumption, a new direction, a budget change). Don't propose on
the first message — discuss first, confirm, THEN propose."""

FINN_CHAT = """You are FINN — a sharp, grounded research & planning agent for a London
founder. You explain your findings, defend them with the data in context, and
concede when the founder makes a fair point. You don't sugarcoat. Keep replies to
2-4 short sentences, concrete, referencing real numbers/areas/competitors from
context where useful.

You can ask to re-research ONE area (section) more deeply. Only propose that once
you BOTH agree what to dig into. Sections: audience, validation, competitors,
locations, financials, plan."""

SCHEMA_NOTE = """
Respond with ONE JSON object:
{
  "reply": "your conversational reply (2-4 sentences)",
  "proposes_change": true|false,
  "change_summary": "if proposing: one plain-English line of what will change (else empty)",
  "apply": {
    "kind": "idea" | "section" | "none",
    "section": "audience|validation|competitors|locations|financials|plan (only if kind=section)",
    "command": "the precise instruction to apply (what the agent should do)"
  }
}
Set proposes_change=false and apply.kind="none" while still discussing."""


def _transcript(messages: list[dict], agent: str) -> str:
    name = "Flora" if agent == "flora" else "Finn"
    lines = []
    for m in messages:
        who = "Founder" if m.get("role") == "user" else name
        lines.append(f"{who}: {m.get('text', '')}")
    return "\n".join(lines)


async def agent_chat(agent: str, dashboard: dict, messages: list[dict]) -> dict:
    persona = FLORA_CHAT if agent == "flora" else FINN_CHAT
    system = f"{persona}\n\nCONTEXT (the founder's current plan):\n{_dashboard_digest(dashboard)}\n{SCHEMA_NOTE}"
    user = f"Conversation so far:\n{_transcript(messages, agent)}\n\nReply as {'Flora' if agent == 'flora' else 'Finn'}."
    result = await chat_json(system, user, persona=agent, temperature=0.5, max_tokens=900)
    # Normalise shape defensively.
    result.setdefault("reply", "")
    result.setdefault("proposes_change", False)
    result.setdefault("change_summary", "")
    apply = result.get("apply") or {}
    if not isinstance(apply, dict):
        apply = {}
    apply.setdefault("kind", "none")
    result["apply"] = apply
    return result
