from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ConversationTurn(BaseModel):
    speaker: str
    text: str


class ClarityRow(BaseModel):
    label: str
    value: int
    level: str  # High | Medium | Low


class Assumption(BaseModel):
    text: str
    tag: str
    tone: str


class Segment(BaseModel):
    name: str
    need: str
    pay: str
    channel: str
    conf: str
    icon: str
    tone: str


class Persona(BaseModel):
    name: str
    title: str
    role: str
    pain: str
    trigger: str
    offer: str
    tone: str
    initials: str


class EvidenceCard(BaseModel):
    signal: str
    impact: str
    conf: str
    source_name: str
    source_slug: str
    tone: str
    icon: str


class RadarCategory(BaseModel):
    label: str
    value: float


class Experiment(BaseModel):
    title: str
    impact: str
    effort: str
    days: str


class Location(BaseModel):
    id: str
    name: str
    demand: str
    compete: str
    transport: str
    cost: str
    b2b: str
    reco: str
    score: int
    x: float
    y: float
    primary: bool = False


class CostBand(BaseModel):
    title: str
    range: str
    subtitle: str
    tone: str
    tag: str
    fill: int


class MonthlyAssumption(BaseModel):
    row: str
    range: str
    notes: str
    icon: str


class Grant(BaseModel):
    name: str
    fit: int
    why: str
    notes: str
    deadline: str
    docs: list[str]
    tone: str


class DayTask(BaseModel):
    d: str
    title: str
    status: str
    owner: str


class RoadmapItem(BaseModel):
    window: str
    goal: str
    tone: str
    detail: list[str]


class Asset(BaseModel):
    title: str
    icon: str
    tone: str


class PriorityTask(BaseModel):
    t: str
    status: str
    tag: str


class AgentModule(BaseModel):
    name: str
    desc: str
    icon: str
    status: str
    time: str
    sources: int = 0


class LogEntry(BaseModel):
    text: str
    conf: str
    who: str


# --- Idea Profile section ---
class IdeaProfile(BaseModel):
    title: str = ""
    subtitle: str = ""
    description: str = ""
    business_type: str = ""
    stage: str = ""
    physical_site: str = ""
    revenue: str = ""
    clarity_score: int = 0
    clarity_rows: list[ClarityRow] = []
    flora_note: str = ""
    assumptions: list[Assumption] = []
    open_questions: list[str] = []
    tags: list[dict[str, str]] = []


# --- Full dashboard data ---
class DashboardData(BaseModel):
    idea: IdeaProfile = Field(default_factory=IdeaProfile)
    audience_confidence: int = 0
    segments: list[Segment] = []
    personas: list[Persona] = []
    interview_questions: list[str] = []
    validation_verdict: str = ""
    validation_description: str = ""
    evidence: list[EvidenceCard] = []
    radar: list[RadarCategory] = []
    experiments: list[Experiment] = []
    locations: list[Location] = []
    cost_bands: list[CostBand] = []
    monthly_assumptions: list[MonthlyAssumption] = []
    grants: list[Grant] = []
    funding_readiness: int = 0
    days: list[DayTask] = []
    roadmap: list[RoadmapItem] = []
    assets: list[Asset] = []
    tasks: list[PriorityTask] = []
    flora_modules: list[AgentModule] = []
    finn_modules: list[AgentModule] = []
    agent_log: list[LogEntry] = []


# --- Discovery document (top-level MongoDB document) ---
class IntakeInput(BaseModel):
    conversation: list[ConversationTurn]


class DiscoveryCreate(BaseModel):
    workspace_name: str
    intake: IntakeInput


class Discovery(BaseModel):
    id: str = Field(alias="_id", default="")
    workspace_name: str
    intake: IntakeInput
    dashboard: DashboardData = Field(default_factory=DashboardData)
    status: str = "intake_complete"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"populate_by_name": True}


class DiscoverySummary(BaseModel):
    id: str
    workspace_name: str
    status: str
    created_at: datetime
