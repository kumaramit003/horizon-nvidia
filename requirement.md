# Finn & Flora — Implementation Requirements

> Architecture and build plan for taking the mockup at
> https://khiz-dev.github.io/horizon/ to a working hackathon submission.
>
> See [idea.md](./idea.md) for product context. This document covers
> **how to build it**, not what it is.

---

## 1. Confirmed stack

| Layer | Choice | Notes |
|---|---|---|
| Speech-to-text | **ElevenLabs Scribe (streaming)** | WebSocket, partial + final transcripts |
| Text-to-speech | **ElevenLabs TTS (streaming)** | Separate voice IDs for Flora vs Finn (recommended) |
| LLM | **Nemotron** | Runs **inside NemoClaw**, not called directly by backend |
| Agent orchestration | **NemoClaw** | External runtime. Owns Nemotron, skills, and dataset access. |
| Skills | **Implemented inside NemoClaw** | Each skill wraps a London Datastore source. **Backend never touches CSVs.** |
| Backend | **FastAPI + asyncio + uvicorn** | Thin gateway. Audio + event broker only. No data layer. |
| Frontend | React 18 + Vite + Tailwind + **Zustand** | Existing mock UI; add live state via WebSocket |
| Session store | **Upstash Redis** (optional) | Transcripts + UI state per session |
| Hosting | **Fly.io / Railway** (backend) + **GitHub Pages** (frontend) | Persistent WS sessions on backend |

### What changed from earlier drafts

- **Backend is FastAPI / Python**, not Node. Aligns with broader AI tooling
  (Pydantic, httpx, official ElevenLabs SDK, NVIDIA libraries).
- **Datasets are NOT exposed directly to the website.** The agent runtime
  (NemoClaw) owns all dataset access via its skills. The backend's job is
  to call NemoClaw and forward results — not to query data.
- **No local SQLite / DuckDB / CSV layer in the backend.** Dataset baking,
  caching, normalisation all happen inside NemoClaw.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       Browser (React + Vite)                          │
│                                                                      │
│   Mic capture ───► PCM frames                                        │
│   Audio playback ◄── PCM chunks                                      │
│   Zustand store ◄── UI events (skill outputs, transcript, agent)     │
└──────────────┬──────────────────────────────────────────┬─────────────┘
               │ WebSocket (PCM audio + UI events)        │
               ▼                                          ▲
┌──────────────────────────────────────────────────────────────────────┐
│              FastAPI gateway (Python + asyncio + uvicorn)            │
│                                                                      │
│   ┌──────────────┐    ┌──────────────────────┐    ┌──────────────┐  │
│   │ ElevenLabs   │───►│ Coordinator          │◄───│ ElevenLabs   │  │
│   │ STT client   │    │ (asyncio task graph) │    │ TTS client   │  │
│   └──────────────┘    └──────────┬───────────┘    └──────────────┘  │
│                                  │                                   │
│                                  ▼                                   │
│                         NemoClaw client                              │
│                       (the only "smart" call)                        │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ session protocol (HTTP+SSE / WS / SDK)
                                   ▼
                       ┌────────────────────────┐
                       │   NemoClaw runtime     │
                       │                        │
                       │   • Nemotron LLM       │
                       │   • Persona routing    │
                       │   • Skill registry     │◄── London Datastore
                       │   • Dataset access     │    (workplace zones,
                       │                        │     census, TfL, GLA
                       │                        │     funding, etc.)
                       └────────────────────────┘
```

The backend has no data libraries. The "intelligence" lives entirely inside
NemoClaw. The backend's only job is to be a fast, reliable audio + event
broker between the browser and the agent runtime.

---

## 3. What the FastAPI backend is responsible for

Narrow. Five things:

1. **Audio I/O over WebSocket** — accept PCM frames from the browser, send
   PCM chunks back
2. **ElevenLabs STT coordination** — stream mic audio in, surface partial
   and final transcripts
3. **ElevenLabs TTS coordination** — stream Nemotron text out, sentence by
   sentence, with interrupt handling
4. **NemoClaw session lifecycle** — open a session per founder, send user
   turns, stream events back, close cleanly on disconnect
5. **Event multiplexing to the browser** — forward every skill result,
   persona switch, and turn boundary to the browser WebSocket so the
   dashboard can react live

That's it. No data processing, no skill implementations, no scoring logic.

---

## 4. The audio loop

ElevenLabs is not WebRTC-native. Turn-taking is manual. Target end-to-end
latency from user-stops-speaking → Flora-starts-responding: **< 1.2s**.

1. **Browser** captures mic at 16kHz → 20ms PCM frames → WebSocket up to backend
2. **Backend** streams audio to **ElevenLabs Scribe**. Receive `partial` + `final`
   transcripts.
3. On `final` transcript, hand text to **NemoClaw**. Mark any in-flight TTS
   as `pending_interrupt`.
4. NemoClaw orchestrates internally (persona selection, skill calls, Nemotron
   generation) and streams **events** back to the backend (text deltas,
   sentence boundaries, skill results, persona switches).
5. As each `sentence_boundary` event arrives, the backend pushes that sentence
   into **ElevenLabs TTS streaming** — do not wait for the full response.
6. TTS chunks stream back to the browser → `AudioContext` playback queue.
7. **In parallel**, every `skill_result` event is forwarded to the browser
   WebSocket → Zustand store → dashboard section re-renders live.

### Interrupt handling

There is no built-in interrupt primitive. Implement it:

- Each turn gets a `turn_id`
- On any new partial transcript activity from STT, cancel the previous turn:
  - Send `interrupt(turn_id)` to NemoClaw
  - Drain the TTS queue
  - Send `flush_audio` event to the browser to clear playback

If NemoClaw doesn't have a native interrupt endpoint, simulate it by
ignoring all subsequent events from the interrupted `turn_id`.

---

## 5. The NemoClaw client contract

This is the most important interface in the system. The FastAPI backend
needs five things from NemoClaw:

### 5.1 Session lifecycle

Open a session per founder. Close on browser disconnect. Sessions hold:

- Conversation history
- Active persona (Flora / Finn)
- Founder profile draft
- Skill trace

### 5.2 Request schema — what the backend sends

```python
from typing import Optional, Literal
from pydantic import BaseModel

class SessionInit(BaseModel):
    session_id: str
    locale: str = "en-GB"
    founder_hint: Optional[dict] = None

class UserTurn(BaseModel):
    session_id: str
    transcript: str
    turn_id: str
    persona_hint: Optional[Literal["flora", "finn"]] = None  # explicit routing

class Interrupt(BaseModel):
    session_id: str
    turn_id: str  # the turn being cancelled
```

### 5.3 Event schema — what NemoClaw streams back

```python
class TextDelta(BaseModel):
    type: Literal["text_delta"]
    turn_id: str
    persona: Literal["flora", "finn"]
    delta: str

class SentenceBoundary(BaseModel):
    type: Literal["sentence_boundary"]  # cue: send this to TTS now
    turn_id: str
    sentence: str

class SkillInvoked(BaseModel):
    type: Literal["skill_invoked"]
    turn_id: str
    skill: str                    # e.g. "workplace_zone_density"
    arguments: dict

class SkillResult(BaseModel):
    type: Literal["skill_result"]
    turn_id: str
    skill: str
    data: dict                    # structured output for the dashboard
    citations: list[Citation]     # London Datastore slugs + URLs

class PersonaSwitch(BaseModel):
    type: Literal["persona_switch"]
    from_: Literal["flora", "finn"]
    to: Literal["flora", "finn"]

class TurnComplete(BaseModel):
    type: Literal["turn_complete"]
    turn_id: str

class ErrorEvent(BaseModel):
    type: Literal["error"]
    code: str
    message: str

class Citation(BaseModel):
    slug: str                     # e.g. "workplace-zone-statistics"
    name: str                     # display name
    url: str                      # full data.london.gov.uk URL
    retrieved_at: str             # ISO timestamp
```

The backend forwards every `skill_result` straight to the browser WebSocket.
The dashboard's existing `SourceChip` component renders citations natively.

### 5.4 Transport — to be confirmed

NemoClaw probably exposes one of:

- **HTTP + Server-Sent Events** (recommended for hackathon — easy to consume
  with `httpx.AsyncClient.stream`)
- **WebSocket** (bidirectional, lower latency)
- **gRPC streaming** (typed but heavier setup)
- **Python SDK** (best if it wraps the above)

See §11 open decisions.

### 5.5 Coordination loop (FastAPI pseudo-code)

```python
async def handle_browser_ws(ws: WebSocket):
    session_id = new_session_id()
    stt = await elevenlabs.stt.connect(language="en-GB")
    nemoclaw = NemoClawClient(api_key=...)
    tts_queue = asyncio.Queue()

    await nemoclaw.session_init(SessionInit(session_id=session_id))

    await asyncio.gather(
        pump_mic_to_stt(ws, stt),
        pump_stt_to_nemoclaw(stt, nemoclaw, ws, tts_queue),
        pump_nemoclaw_to_outputs(nemoclaw, ws, tts_queue),
        pump_tts_to_browser(tts_queue, ws),
    )

async def pump_nemoclaw_to_outputs(nemoclaw, ws, tts_queue):
    async for event in nemoclaw.stream_events():
        match event.type:
            case "sentence_boundary":
                await tts_queue.put(event.sentence)
            case "skill_result":
                await ws.send_json(event.dict())
            case "persona_switch":
                await ws.send_json(event.dict())
                # optionally swap TTS voice_id mid-stream
            case "turn_complete":
                await ws.send_json(event.dict())
```

Everything is asyncio queues + `httpx.AsyncClient.stream` for parsing SSE.
No threads, no sync code in the hot path.

---

## 6. Skill catalog (lives inside NemoClaw)

Skills are implemented inside the NemoClaw runtime. The backend doesn't
implement them, but it does need to know:

- Which skills exist (to know how to forward their results to dashboard sections)
- The output shape of each skill (to validate before forwarding)

### Dashboard → skill mapping

| Dashboard section | Owning agent | Skills called (inside NemoClaw) |
|---|---|---|
| The idea | Flora | `update_profile`, `mark_assumption`, `score_clarity`, `handoff_to_finn` |
| Who buys | Finn | `census_religion_share`, `workplace_zone_density`, `survey_of_londoners`, `rank_segments` |
| Worth doing? | Finn | `business_demography`, `food_business_density`, `risk_radar`, `recommend_first_wedge` |
| Where | Finn | `workplace_zone_density`, `tfl_station_flow`, `high_street_health`, `voa_rent_proxy`, `score_location` |
| Money & grants | Finn | `voa_rent_proxy`, `gla_grants_match`, `funding_readiness_score` |
| Your next 7 days | Finn | `generate_launch_plan` (consumes outputs above) |
| Flora & Finn | meta | exposes the live skill trace |

### Citation requirement

Every skill result NemoClaw returns **must** include the London Datastore
citation(s) it used. The frontend's `SourceChip` component depends on this.

If NemoClaw doesn't include citations natively, the backend maintains a
local lookup `skill_name → dataset_slug` and enriches the event before
forwarding. (See §11 open decisions.)

### Minimum viable skill set

NemoClaw must support at least these **6 essentials** for a credible demo:

1. `workplace_zone_density` — Workplace Zone Statistics
2. `census_religion_share` — 2021 Census · Religion by Ward
3. `business_demography` — London Business Demography
4. `high_street_health` — High Streets Health Check
5. `gla_grants_match` — GLA Funding & Support Directory
6. `tfl_station_flow` — TfL Open Data

Plus the two composites:

- `score_location` — weighted ranking across multiple datasets
- `generate_launch_plan` — synthesises everything into the 7-day + 30/60/90 plan

---

## 7. NemoClaw persona logic (for context, not for backend to implement)

These are properties of the NemoClaw runtime, not the FastAPI backend.
Including here so the backend's expectations are clear.

### Persona system prompts (essence)

**Flora**
> You are Flora, a warm, conversational discovery agent. Your only job is
> to extract the founder's idea, motivation, constraints, and risk tolerance
> through natural conversation. You speak in short, warm sentences. You ask
> one question at a time. When you have enough, call `handoff_to_finn`.
> Never speculate about analysis — that's Finn's job.

**Finn**
> You are Finn, an analytical research and planning agent. You have access
> to London Datastore skills. Always cite the dataset slug you used. Never
> invent numbers. Speak in concise, structured updates. Be honest about
> confidence levels. Default to "potentially relevant" not "you are
> eligible". When the user asks a question outside your skill set, hand
> back to Flora.

### Routing rules NemoClaw should implement

- `"Flora, ..."` → flora persona
- `"Finn, ..."` → finn persona
- No founder profile yet → flora
- Profile present → flora for idea-shape questions, finn for everything else

---

## 8. Python dependencies (backend)

```
fastapi
uvicorn[standard]
websockets
httpx[http2]              # async streaming HTTP (for SSE consumption)
pydantic
elevenlabs                # official SDK has WS streaming for TTS
python-dotenv
redis                     # session state (Upstash) — optional
structlog                 # structured logs for debugging event flow
```

**Notably absent:** no pandas, no sqlite3, no DuckDB, no NumPy, no data
processing libraries. NemoClaw owns all of that.

---

## 9. Frontend changes from the mock

The current frontend is fully built; the work is **swapping mocked data
for live agent state**.

### Add

- **Zustand store** (`src/store/index.js`) with slices per dashboard section
- **WebSocket client** (`src/lib/socket.js`) connecting to FastAPI gateway
- **Audio capture + playback** (`src/lib/audio.js`) using `AudioContext`
- **Event handlers** mapping backend events → store mutations:
  - `transcript_partial` → update intake live caption
  - `transcript_final` → push to conversation history
  - `agent_speaking` → switch orb state, voice activity indicator
  - `skill_result` → mutate matching dashboard slice + add to trace
  - `flush_audio` → clear playback queue on interrupt
  - `persona_switch` → swap active persona + orb gradient

### Remove

- All hardcoded conversation arrays in `Intake.jsx`
- All mocked dataset content (already in `src/data/londonDatasets.js` —
  keep the structure, replace values at runtime)
- Hardcoded clarity scores, segment lists, location comparisons

### Keep as-is

- All visual components (Card, SectionHeader, Tag, Confidence, Progress,
  AgentBadge, Wordmark, LeafMark, gradient orbs, animations)
- The 7-page navigation structure
- The voice modal UI — only its data needs to be live

---

## 10. Build plan (chronological)

### Phase 0 — De-risk (first 2 hours)

Spike each high-risk integration independently. **If any fail, switch
strategies before building around them.**

- [ ] **Audio in**: browser mic → FastAPI WebSocket → ElevenLabs Scribe →
  printed transcript in server logs
- [ ] **Audio out**: hardcoded text → ElevenLabs TTS websocket → browser
  audio playback
- [ ] **NemoClaw call**: send a hardcoded transcript to NemoClaw, stream
  back at least one `text_delta` and one `skill_result`
- [ ] **WebSocket UI update**: backend emits a fake `skill_result`,
  frontend Zustand store updates, one dashboard section rerenders
- [ ] **Interrupt**: clicking a "stop" button on the browser cancels an
  in-flight TTS stream cleanly

If all five pass, you're 80% de-risked.

### Phase 1 — Flora end-to-end (hours 2–10)

- [ ] FastAPI gateway with `WebSocket /ws/session/{id}` endpoint
- [ ] `NemoClawClient` class implemented against the confirmed protocol
- [ ] Pydantic event schemas in a shared module
- [ ] Full audio loop: mic → STT → NemoClaw → TTS → speaker
- [ ] Interrupt handling proven with rapid-fire user speech
- [ ] Intake screen's typewriter wired to real `text_delta` stream
- [ ] Founder profile sidebar populated by `update_profile` skill results
- [ ] Conversation history persisted to Redis per session

### Phase 2 — Finn's research workflow (hours 10–24)

- [ ] All 6 essential skills working inside NemoClaw with real London
  Datastore queries (this work happens in the NemoClaw repo, not here)
- [ ] Composite skills (`score_location`, `generate_launch_plan`) returning
  full structured outputs with citations
- [ ] Each `skill_result` event in the backend is forwarded to the browser
  with no transformation
- [ ] Dashboard sections render from live skill data
- [ ] Agent Workspace timeline = live trace of `skill_invoked` +
  `skill_result` events

### Phase 3 — Dashboard voice refinement (hours 24–32)

- [ ] Voice on dashboard pages works (FAB triggers a new turn)
- [ ] NemoClaw routes "Flora, X" / "Finn, Y" / generic intents correctly
- [ ] Partial re-runs work (e.g. just `score_location` when adding a new area)
- [ ] Live "Your plan, updating" modal — real backend events, not scripted
- [ ] Suggestion chips fire real flows when clicked

### Phase 4 — Polish & demo prep (hours 32–end)

- [ ] One drilled "happy path" demo (halal lunch scenario, end-to-end)
- [ ] Backend health check + reconnect on transient failures
- [ ] Recording fallback: browser TTS + scripted text in case ElevenLabs
  fails on stage
- [ ] One stretch path: judge gives a different idea, see how it handles
  (only if Phase 3 is fully done)

---

## 11. Open decisions

These need to be answered before scaffolding the `NemoClawClient`:

1. **NemoClaw transport** — does it expose HTTP+SSE, raw WebSocket, gRPC,
   or a Python SDK? Affects `httpx` vs `websockets` vs `grpcio` choice.
2. **Auth** — API key (header), OAuth, mTLS, or session token? Affects
   client initialisation.
3. **Streaming format** — JSON lines, SSE `data:` frames, or protobuf?
   Affects the parser in `stream_events()`.
4. **Skill catalog discovery** — static (known at session start) or dynamic
   (advertised in the response)? Affects validation strategy.
5. **Citations** — does NemoClaw include London Datastore slugs in skill
   outputs natively, or does the backend need to enrich from a local
   `skill_name → dataset_slug` map?
6. **Voice IDs** — separate ElevenLabs voice for Flora vs Finn? Strongly
   recommended; the personality differentiation is the product.
7. **Session persistence** — do we want a founder to come back and continue,
   or is "fresh session every time" fine for hackathon?

---

## 12. Repository structure (proposed)

Current state is frontend-only. Recommend converting to a monorepo as you
add the FastAPI backend:

```
horizon/
  apps/
    web/                              # current Vite app
      src/
        App.jsx
        store/                        # NEW — Zustand slices
        lib/
          socket.js                   # NEW — WebSocket client
          audio.js                    # NEW — mic + playback
        pages/
        components/
      package.json
      vite.config.js

    gateway/                          # NEW — FastAPI backend (Python)
      pyproject.toml
      uv.lock                         # or requirements.txt
      src/
        finn_flora_gateway/
          __init__.py
          main.py                     # FastAPI app + uvicorn entrypoint
          ws.py                       # WebSocket endpoint
          coordinator.py              # asyncio task graph
          nemoclaw/
            __init__.py
            client.py                 # NemoClawClient (HTTP+SSE or WS)
            schemas.py                # Pydantic models (Session, Turn, Events)
          adapters/
            elevenlabs_stt.py
            elevenlabs_tts.py
          sessions/
            __init__.py
            store.py                  # Redis-backed session state
            models.py                 # SessionState, Transcript, ProfileDraft
          config.py                   # env-driven settings
          logging.py                  # structlog setup
      tests/
        test_coordinator.py
        test_nemoclaw_client.py

  packages/
    contracts/                        # NEW — shared event schemas
      src/
        events.py                     # Pydantic models (Python)
        events.ts                     # mirrored TypeScript (or generated)
      package.json

  .github/workflows/
    deploy-web.yml                    # existing → GitHub Pages
    deploy-gateway.yml                # NEW → Fly.io / Railway
```

The frontend continues to deploy to GitHub Pages. The FastAPI backend
deploys separately (Fly.io recommended — persistent WS support, free tier
generous enough for demo). Frontend connects to backend URL via
`VITE_GATEWAY_URL` env var.

---

## 13. Hackathon scope summary

**Must ship for a credible demo:**

- Real voice conversation with Flora (audio in + out, interrupt handling)
- 6 working skills inside NemoClaw against real London Datastore data
- Live dashboard updates driven by NemoClaw `skill_result` events
- One end-to-end demo scenario that survives a judge's "what if I change X?"

**Nice to have if ahead of schedule:**

- Real Mapbox heatmap using Workplace Zones GeoJSON
- Live competitor data (e.g. via web search inside a NemoClaw skill)
- Second demo scenario (different industry / area)
- Voice ID swap at persona handoff

**Hard cuts:**

- Anything outside London
- Auth, accounts, multi-user
- Persistence beyond a single session
- Mobile responsive (desktop demo only)
- PDF / pitch deck exports — keep buttons as mocked

---

## 14. Top risks

| Risk | Mitigation |
|---|---|
| NemoClaw protocol unknowns block backend scaffolding | Answer §11 open decisions before starting Phase 1. If transport is unclear, stub the `NemoClawClient` with a fake event stream so backend dev can proceed in parallel. |
| Nemotron tool-call drift inside NemoClaw | Out of backend scope — handled inside the NemoClaw runtime. Backend validates incoming events against Pydantic schemas defensively. |
| ElevenLabs interrupt handling races | Track `turn_id` per turn. On any new STT activity, cancel previous turn server-side and send `flush_audio` to browser. Test with rapid-fire interruptions before demo. |
| Persona handoff feels broken on voice | Keep voice stream continuous — Flora literally says "let me hand you to Finn" while NemoClaw swaps persona mid-stream. Optionally swap voice ID at the handoff word boundary. |
| Citation drift between skills and frontend | Either: (a) NemoClaw includes citations natively in skill results (preferred), or (b) backend maintains a `skill_name → dataset_slug` enrichment table. Either way: Pydantic validation enforces the contract. |
| Demo network failure | Cache the last successful skill_result stream from rehearsal. Backend has a "replay last session" mode that runs the demo with zero network calls. |
