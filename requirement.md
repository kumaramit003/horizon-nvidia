# Finn & Flora — Implementation Requirements

> Architecture and build plan for the hackathon submission.
>
> See [idea.md](./idea.md) for product context. This document is the **as-built
> architecture**, kept in sync with the code in this repo.

---

## 1. Stack as built

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **React 18 + Vite + Tailwind** | Existing UI, dashboard pages take a `dashboard` prop |
| Backend | **FastAPI + Motor (async MongoDB)** | One process, all endpoints under `/api/*` |
| LLM | **Nemotron** via NVIDIA NIM (OpenAI-compatible) | Called directly from the backend via the `openai` Python SDK |
| Orchestration | **In-process Python `pipeline.py`** | Flora → Finn modules. No separate NemoClaw runtime. |
| TTS | **ElevenLabs** (HTTP streaming) inside FastAPI | Folded in via `backend/adapters/elevenlabs_tts.py` + `/api/voice/tts` |
| STT | **Browser-side typing** (for now) | A STT adapter exists at `backend/adapters/elevenlabs_stt.py` but is not yet wired in — discovery uses text input |
| Database | **MongoDB 7** (containerised) | One `discoveries` collection; everything lives under one document per session |
| Reverse proxy (Docker) | **nginx** in front of the built frontend | Proxies `/api/*` to the FastAPI service |
| Dev proxy | **Vite** dev server | Proxies `/api` → `http://localhost:8000` |
| Hosting | All-local **Docker Compose** | No cloud services needed for the demo |

### Changes from earlier drafts

- **NemoClaw is not a separate runtime.** The "orchestration" is a plain
  Python async function (`backend/app/agents/pipeline.py`) that calls Flora's
  analysis then fans out Finn's 6 research modules in parallel via
  `asyncio.gather`. Simpler, fewer moving parts, easier to debug live on stage.
- **Discovery is request/response, not streaming.** Frontend POSTs the full
  conversation to `/api/discoveries`; the backend runs the whole pipeline
  (typically ~10–20s) and returns the dashboard. A loading screen on the
  frontend bridges the wait.
- **ElevenLabs TTS is inside FastAPI.** A separate Node TTS proxy was
  removed in favour of `/api/voice/tts` so everything is dockerised in
  one compose file.
- **No streaming WebSocket / no live audio capture in this version.** That
  remains a stretch goal once the request/response pipeline is rock solid.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Browser (React + Vite)                          │
│                                                                      │
│   Intake (text + ElevenLabs TTS playback)                            │
│        ↓ POST /api/flora/chat   (per turn)                           │
│        ↓ POST /api/discoveries  (when Flora signals done)            │
│                                                                      │
│   Dashboard (reads dashboard prop, renders 7 sections)               │
│        ← GET /api/discoveries/{id}/dashboard                         │
└──────────────────────┬────────────────────────────────┬──────────────┘
                       │ HTTP/JSON                       │ HTTP/audio (MP3)
                       ▼                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│              FastAPI gateway  (Python + asyncio + uvicorn)           │
│                                                                      │
│   /api/flora/chat     → flora.flora_chat   (next question)           │
│   /api/discoveries    → pipeline.run_discovery_pipeline              │
│                          ├── flora.run_flora   (idea profile)        │
│                          └── finn.run_finn     (6 modules in parallel)│
│   /api/discoveries/{id}/dashboard → Mongo read                       │
│   /api/voice/tts      → adapters.elevenlabs_tts.ElevenLabsTTSClient  │
│   /api/voice/health   → config check                                 │
└──────────────────────┬───────────────────────────────────┬───────────┘
                       │                                   │
                       ▼                                   ▼
            ┌──────────────────┐               ┌──────────────────────┐
            │ NVIDIA NIM        │               │ ElevenLabs HTTP API  │
            │ (OpenAI-compatible│               │ (stream MP3 chunks)  │
            │  /chat/completions)│              │                      │
            └──────────────────┘               └──────────────────────┘
                       │
                       ▼
            ┌──────────────────┐
            │ MongoDB 7         │
            │ (discoveries doc) │
            └──────────────────┘
```

---

## 3. Backend responsibilities

The FastAPI service does five things:

1. **Conversational discovery** — `POST /api/flora/chat` takes the conversation
   so far, returns Flora's next message + the running `gathered` checklist.
2. **End-to-end pipeline** — `POST /api/discoveries` runs Flora's analysis
   (idea profile) then Finn's 6 research modules in parallel and writes the
   full dashboard to MongoDB.
3. **Dashboard read** — `GET /api/discoveries/{id}/dashboard`.
4. **Dashboard mutation** — `PATCH /api/discoveries/{id}/dashboard` for voice
   refinements (not yet wired on the frontend).
5. **Voice synthesis** — `POST /api/voice/tts` streams ElevenLabs audio for a
   given text and persona. `GET /api/voice/health` reports whether voice is
   configured.

No data layer beyond MongoDB. No skill implementations — Nemotron generates
the entire dashboard payload via prompt engineering with structured-JSON
outputs.

---

## 4. Repository layout

Everything lives in this one repo. The frontend is at the root (so the
existing GitHub Pages mock deployment keeps working), the backend is in
`backend/`, and Docker Compose wires it all up.

```
horizon/
  src/                                # React frontend
    App.jsx                           # stage switch: intake → dashboard
    pages/
      Intake.jsx                      # live, calls /api/flora/chat
      IdeaProfile.jsx                 # consumes dashboard.idea
      TargetAudience.jsx              # consumes dashboard.segments + personas
      MarketValidation.jsx            # consumes dashboard.evidence + radar
      Locations.jsx                   # consumes dashboard.locations
      Financials.jsx                  # consumes dashboard.cost_bands + grants
      ActionPlan.jsx                  # consumes dashboard.days + roadmap
      AgentWorkspace.jsx              # consumes dashboard.flora_modules + finn_modules
    lib/
      api.js                          # JSON HTTP client for /api/*
      voiceApi.js                     # /api/voice/tts client
    components/                       # Card, SectionHeader, AgentBadge, etc.

  backend/
    pyproject.toml                    # poetry deps
    Dockerfile
    app/
      main.py                         # FastAPI app + lifespan + CORS
      config.py                       # pydantic-settings (env-driven)
      database.py                     # motor client
      models.py                       # full pydantic schema for the dashboard
      llm.py                          # NVIDIA NIM / OpenAI-compatible client
      routers/
        discoveries.py                # POST /api/discoveries + GET/PATCH
        flora.py                      # POST /api/flora/chat
        voice.py                      # POST /api/voice/tts + health
      agents/
        flora.py                      # CHAT_SYSTEM + ANALYSIS_SYSTEM prompts
        finn.py                       # 6 module prompts, runs in parallel
        pipeline.py                   # Flora analysis → Finn fanout
    adapters/
      elevenlabs_tts.py               # used by /api/voice/tts
      elevenlabs_stt.py               # written but not yet wired in

  Dockerfile                          # frontend (multi-stage Vite → nginx)
  nginx.conf                          # serves dist/ + proxies /api → backend:8000
  docker-compose.yml                  # mongo + backend + frontend
  .env.example                        # NVIDIA_*, ELEVENLABS_*, DATABASE_NAME
  vite.config.js                      # dev proxy /api → :8000
  justfile                            # convenience: just up, just dev, etc.
  idea.md
  requirement.md                      # ← this file
  README.md
```

---

## 5. The Discovery document (MongoDB)

One collection, `discoveries`. One document per founder session.

```jsonc
{
  "_id": ObjectId,
  "workspace_name": "Halal healthy lunch & corporate catering",
  "intake": {
    "conversation": [
      { "speaker": "flora" | "you", "text": "..." }
    ]
  },
  "dashboard": {
    "idea": { /* IdeaProfile from flora.run_flora */ },
    "audience_confidence": 62,
    "segments": [ ... ],
    "personas": [ ... ],
    "interview_questions": [ ... ],
    "validation_verdict": "...",
    "validation_description": "...",
    "evidence": [ ... ],
    "radar": [ ... ],
    "experiments": [ ... ],
    "locations": [ ... ],
    "cost_bands": [ ... ],
    "monthly_assumptions": [ ... ],
    "grants": [ ... ],
    "funding_readiness": 54,
    "days": [ ... ],
    "roadmap": [ ... ],
    "assets": [ ... ],
    "tasks": [ ... ],
    "flora_modules": [ ... ],
    "finn_modules": [ ... ],
    "agent_log": [ ... ]
  },
  "status": "processing" | "dashboard_ready" | "error",
  "created_at": ISODate,
  "updated_at": ISODate
}
```

Full schema mirrored in `backend/app/models.py` as Pydantic v2 models.

---

## 6. The two agents (prompts live in code)

Persona prompts are full text inside `backend/app/agents/flora.py` and
`backend/app/agents/finn.py`. Summary:

**Flora · chat mode** — One question at a time, conversational, warm.
Returns `{ message, done, gathered: { idea, motivation, customer,
first_version, budget, location } }`. Sets `done: true` once at least 4 of
6 fields are gathered, with a handoff message to Finn.

**Flora · analysis mode** — After the conversation completes, Flora returns
a single JSON object with the full Idea Profile (title, subtitle, business
type, stage, clarity rows, assumptions, open questions, etc).

**Finn** — Six prompts (audience, validation, locations, financials, plan,
agent log) run **in parallel** via `asyncio.gather`. Each returns a JSON
object that gets merged into the dashboard.

All Finn modules are instructed to attribute findings to specific London
Datastore datasets (Workplace Zone Statistics, Census 2021 Religion by Ward,
TfL Open Data, GLA Funding Directory, etc) so the existing `SourceChip`
component on the frontend renders the right provenance.

---

## 7. Environment variables

All required keys are listed in `.env.example`:

| Var | Required? | Purpose |
|---|---|---|
| `DATABASE_NAME` | optional (default `founderos`) | Mongo db name |
| `NVIDIA_API_KEY` | required | NVIDIA NIM auth |
| `NVIDIA_BASE_URL` | required | OpenAI-compatible LLM endpoint URL |
| `NVIDIA_MODEL` | optional | Nemotron model id |
| `ELEVENLABS_API_KEY` | optional | Without it `/api/voice/tts` returns 503 and the UI falls back to text-only |
| `ELEVENLABS_VOICE_ID_FLORA` | optional | Flora's voice |
| `ELEVENLABS_VOICE_ID_FINN` | optional | Finn's voice |
| `ELEVENLABS_MODEL_ID` | optional | Default `eleven_flash_v2_5` |

Compose reads `.env` automatically. Local dev (without Docker) reads the
same `.env` via pydantic-settings.

---

## 8. Running

**Full stack via Docker** (recommended):

```bash
cp .env.example .env   # fill in NVIDIA_API_KEY, ELEVENLABS_* keys
docker compose up --build
# Frontend  → http://localhost:3001
# Backend   → http://localhost:8000
# MongoDB   → mongodb://localhost:27017
```

**Local dev** (without containers):

```bash
just db                # spins up just MongoDB in Docker
just backend           # uvicorn on :8000
just frontend          # vite on :5173 (proxies /api → :8000)
```

---

## 9. Hackathon scope summary

**Must ship — already working:**

- Real conversational discovery with Flora (text in, ElevenLabs TTS out)
- Real Nemotron-generated dashboard for all 7 sections
- MongoDB persistence + reload from `sessionStorage`
- All-Docker single-command run

**Nice to have if ahead of schedule:**

- ElevenLabs STT for real voice input on the Intake page (adapter exists,
  not yet wired)
- Dashboard voice refinement (FAB → `PATCH /api/discoveries/{id}/dashboard`)
- Real Mapbox heatmap using Workplace Zones GeoJSON
- Second demo scenario

**Hard cuts:**

- Auth / accounts / multi-user
- Mobile responsive (desktop demo only)
- PDF / pitch deck exports — buttons remain mocked
- Streaming WebSocket audio (request/response is good enough for a 20s wait)

---

## 10. Top risks

| Risk | Mitigation |
|---|---|
| Nemotron returns malformed JSON | `llm._extract_json` is tolerant of markdown fences + leading prose; individual module failures don't break the pipeline (`return_exceptions=True` in `asyncio.gather`) |
| Pipeline takes longer than ~25s | Frontend shows the `Analysing` screen with sequenced step labels — feels intentional, not stuck |
| ElevenLabs key missing on demo machine | `/api/voice/tts` returns 503; frontend logs the error to a small pill but the rest of the flow still works |
| MongoDB connection lost mid-pipeline | Pipeline writes a `status: "error"` doc and the frontend surfaces the message; `Start over` resets |
| Demo network failure for NVIDIA NIM | Out of scope for hackathon — bring a hotspot or use self-hosted NIM (set `NVIDIA_BASE_URL=http://host.docker.internal:8080/v1`) |
