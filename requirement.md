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
| LLM | **Nemotron** | Likely NVIDIA Llama-3.1-Nemotron-70B or comparable; tool-calling required |
| Agent orchestration | **NemoClaw** | Persona routing (Flora/Finn), skill registry, conversation state |
| Skills | **One per London Datastore source** | Each = typed function with citations |
| Frontend | React 18 + Vite + Tailwind + **Zustand** | Existing mock UI; add live state via WebSocket |
| Backend | **Node + Hono + `ws`** | Single process gateway, holds WebSocket sessions |
| Data cache | **SQLite or DuckDB** | Pre-baked, normalised, queried at <10ms |
| Session store | **Upstash Redis** | Transcripts, profile draft, skill trace |
| Hosting | **Fly.io / Railway** (backend) + **GitHub Pages** (frontend) | Persistent WS sessions needed for backend |

---

## 2. Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Browser (React + Vite)                          │
│                                                                        │
│   Mic capture ───► PCM frames                                          │
│   Audio playback ◄── PCM chunks                                        │
│   Zustand store ◄── UI events (skill outputs, transcript, agent state) │
└────────────┬─────────────────────────────┬─────────────────────────────┘
             │ WebSocket (audio bidirectional + UI events)
             ▼                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Backend gateway (Node + Hono + ws)                         │
│                                                                        │
│   ┌──────────────┐    ┌──────────────────────┐    ┌────────────────┐   │
│   │ ElevenLabs   │    │      NemoClaw        │    │  ElevenLabs    │   │
│   │ STT          │───►│   (orchestrator)     │───►│  TTS streaming │   │
│   │ (streaming)  │    │                      │    │                │   │
│   └──────────────┘    │  ┌────────────────┐  │    └────────────────┘   │
│                       │  │ Flora persona  │  │                         │
│                       │  │ Finn persona   │  │                         │
│                       │  │ Router         │  │                         │
│                       │  │                │  │                         │
│                       │  │ Nemotron LLM ──┼──┼──► Skill registry      │
│                       │  └────────────────┘  │    (London datasets)    │
│                       └──────────────────────┘                         │
└────────────────────────────────────────────────────────────────────────┘
                                                       │
                                                       ▼
                                       ┌──────────────────────────────┐
                                       │ Skills (one per dataset)      │
                                       │  workplace_zone_density       │
                                       │  census_religion_share        │
                                       │  business_demography          │
                                       │  high_street_health           │
                                       │  tfl_station_flow             │
                                       │  voa_rent_proxy               │
                                       │  gla_grants_match             │
                                       │  food_business_density        │
                                       │  planning_apps_recent         │
                                       │  air_quality                  │
                                       │  → score_location (composite) │
                                       │  → generate_launch_plan       │
                                       └──────────────────────────────┘
```

---

## 3. The audio loop

ElevenLabs is not WebRTC-native (unlike OpenAI Realtime). Turn-taking is
manual. Target end-to-end latency from user-stops-speaking → Flora-starts-
responding: **< 1.2s**.

1. **Browser** captures mic at 16kHz → 20ms PCM frames → WebSocket up to backend
2. **Backend** streams audio to **ElevenLabs Scribe**. Receive `partial` + `final`
   transcripts.
3. On `final` transcript, hand the text to **NemoClaw**. Mark any in-flight
   TTS as `pending_interrupt`.
4. NemoClaw selects persona (Flora vs Finn), picks the skill subset, calls
   Nemotron with the system prompt + history + tool schemas.
5. As Nemotron streams tokens, NemoClaw forwards **sentence-by-sentence**
   into **ElevenLabs TTS streaming** — do not wait for the full response.
6. TTS chunks stream back to the browser → `AudioContext` playback queue.
7. **In parallel**, every skill invocation emits a structured UI event over
   the same WebSocket → Zustand store → dashboard section re-renders live.

### Interrupt handling

There is no built-in interrupt primitive. Implement it:

- Each turn gets a `tts_request_id`
- On any new partial transcript activity from STT, cancel the previous
  TTS stream server-side and send a `flush_audio` event to the browser
- The browser's audio queue clears immediately on `flush_audio`

---

## 4. Skill registry

Skills are first-class. Each skill is a typed function with:

```ts
type Skill = {
  name: string
  description: string          // shown to the LLM via tool schema
  parameters: ZodSchema        // input shape
  returns: ZodSchema           // output shape (with citations)
  owner: 'flora' | 'finn' | 'meta'
  execute: (params, ctx) => Promise<{ data: any, citations: Citation[] }>
}

type Citation = {
  slug: string                 // e.g. 'workplace-zone-statistics'
  name: string                 // e.g. 'Workplace Zone Statistics'
  url: string                  // https://data.london.gov.uk/dataset/<slug>
  retrieved_at: string         // ISO timestamp
}
```

### Catalog → dashboard mapping

| Dashboard section | Owning agent | Skills called |
|---|---|---|
| The idea | Flora | `update_profile`, `mark_assumption`, `score_clarity`, `handoff_to_finn` |
| Who buys | Finn | `census_religion_share`, `workplace_zone_density`, `survey_of_londoners`, `rank_segments` |
| Worth doing? | Finn | `business_demography`, `food_business_density`, `risk_radar`, `recommend_first_wedge` |
| Where | Finn | `workplace_zone_density`, `tfl_station_flow`, `high_street_health`, `voa_rent_proxy`, `score_location` |
| Money & grants | Finn | `voa_rent_proxy`, `gla_grants_match`, `funding_readiness_score` |
| Your next 7 days | Finn | `generate_launch_plan` (consumes the outputs above) |
| Flora & Finn | meta | exposes the live skill trace |

Every skill output flows into the existing `SourceChip` component on the
frontend automatically — no per-section wiring once the skill returns
citations.

### Required skills (minimum viable set)

The 12 we mocked in `src/data/londonDatasets.js`. For hackathon, focus on
these **6 essentials** first — the rest can be stubbed:

1. `workplace_zone_density` — Workplace Zone Statistics
2. `census_religion_share` — 2021 Census · Religion by Ward
3. `business_demography` — London Business Demography
4. `high_street_health` — High Streets Health Check
5. `gla_grants_match` — GLA Funding & Support Directory
6. `tfl_station_flow` — TfL Open Data

Composite skills (built on top of the essentials):

- `score_location` — weighted combination across workplace zones, TfL,
  high streets, VOA, business demography. Returns ranked candidates +
  per-area pros/cons.
- `generate_launch_plan` — takes the founder profile + all Finn's
  research outputs, returns the 7-day + 30/60/90 plan as structured data.

---

## 5. NemoClaw orchestration logic

NemoClaw is the brain. Pseudo-contract:

```
on user_transcript:
  persona = route(transcript, current_context)
    # rules:
    # - "Flora, ..." → flora
    # - "Finn, ..." → finn
    # - if no profile yet → flora
    # - else → flora for idea-shape questions, finn for everything else

  skills = registry.skillsFor(persona)
  system_prompt = personaPrompt(persona)
  response = await nemotron.chat({
    system: system_prompt,
    history: session.history,
    tools: skills.map(toToolSchema),
    stream: true,
  })

  for chunk in response:
    if chunk.type === 'text':
      ttsStream.push(chunk.text)        # voice
    if chunk.type === 'tool_call':
      result = await registry.execute(chunk.name, chunk.args, ctx)
      session.history.push(toolResult(chunk.id, result))
      ws.send({ event: 'skill_result', skill: chunk.name, data: result })
      # then continue the Nemotron stream with the tool result fed back
```

### Persona system prompts (essence)

**Flora**
> You are Flora, a warm, conversational discovery agent. Your only job
> is to extract the founder's idea, motivation, constraints, and risk
> tolerance through natural conversation. You speak in short, warm
> sentences. You ask one question at a time. When you have enough,
> call `handoff_to_finn`. Never speculate about analysis — that's Finn's job.

**Finn**
> You are Finn, an analytical research and planning agent. You have access
> to London Datastore skills. Always cite the dataset slug you used.
> Never invent numbers. Speak in concise, structured updates. Be honest
> about confidence levels. Default to "potentially relevant" not "you
> are eligible". When the user asks a question outside your skill set,
> hand back to Flora.

---

## 6. Data layer

### Strategy

Pre-bake datasets at build time. Don't query London Datastore live during
the demo — it's too slow and brittle. Download once, normalise, ship.

```
backend/
  data/
    raw/                          # downloaded CSVs (gitignored)
      workplace_zone_stats.csv
      census_2021_religion_ward.csv
      business_demography.csv
      high_streets_health.csv
      tfl_station_flow.csv
      gla_funding_directory.json
    normalised/                   # checked in
      workplace_zones.sqlite
      ...
    scripts/
      bake.ts                     # ETL pipeline
```

### Per-skill data requirements

| Skill | Source dataset | Index keys |
|---|---|---|
| `workplace_zone_density` | Workplace Zone Statistics 2011/2021 | by ward + WPZ id |
| `census_religion_share` | Census 2021 TS030 | by ward code |
| `business_demography` | ONS Business Demography UK | by borough + SIC (food = 56) |
| `high_street_health` | GLA High Streets dataset | by high-street name |
| `tfl_station_flow` | TfL Annual Origin-Destination | by station NAPTAN code |
| `voa_rent_proxy` | VOA Floor Space + rateable value | by postcode prefix |
| `gla_grants_match` | GLA Funding Directory (manually curated for demo) | filterable by sector, founder profile |

### Citations

Every skill response includes the source citation. The frontend's existing
`SourceChip` component already renders the link to the Datastore page.

---

## 7. Frontend changes from the mock

The current frontend is fully built; the work is **swapping mocked data
for live agent state**.

### Add

- **Zustand store** (`src/store/index.js`) with slices per dashboard section
- **WebSocket client** (`src/lib/socket.js`) connecting to backend gateway
- **Audio capture + playback** (`src/lib/audio.js`) with `AudioContext`
- **Event handlers** mapping backend events → store mutations:
  - `transcript_partial` → update intake live caption
  - `transcript_final` → push to conversation history
  - `agent_speaking` → switch orb state, voice activity indicator
  - `skill_result` → mutate matching dashboard slice + add to trace
  - `flush_audio` → clear playback queue on interrupt
  - `handoff` → swap active persona + orb gradient

### Remove

- All hardcoded conversation arrays
- All mocked dataset content (already in `src/data/londonDatasets.js` —
  keep the structure, replace values at runtime)
- Hardcoded clarity scores, segment lists, location comparisons

### Keep as-is

- All visual components (Card, SectionHeader, Tag, Confidence, Progress,
  AgentBadge, Wordmark, LeafMark, gradient orbs, animations)
- The 7-page navigation structure
- The voice modal UI — only its data needs to be live

---

## 8. Build plan (chronological)

### Phase 0 — De-risk (first 2 hours)

Spike each high-risk integration independently. **If any fail, switch
strategies before building around them.**

- [ ] **Audio loop**: browser mic → ElevenLabs Scribe → text in console
- [ ] **TTS streaming**: text in → ElevenLabs TTS websocket → audio playback
- [ ] **Nemotron tool call**: send a prompt + one tool schema, get back a
  valid tool invocation (validate against JSON schema)
- [ ] **One real skill**: load Workplace Zone Stats into SQLite, query
  "offices within 500m of Liverpool Street", return structured + citation
- [ ] **WebSocket UI update**: backend emits `skill_result`, frontend
  Zustand store updates, one dashboard section rerenders

If all five pass, you're 80% de-risked.

### Phase 1 — Flora end-to-end (hours 2–10)

- [ ] NemoClaw skeleton: persona router, system prompts, skill registry
- [ ] Flora persona implemented with: `update_profile`, `mark_assumption`,
  `score_clarity`, `handoff_to_finn`
- [ ] Full audio loop with interrupt handling
- [ ] Intake screen's typewriter wired to real partial transcript
- [ ] Founder profile sidebar populates from `update_profile` calls
- [ ] Conversation history persists to Redis per session

### Phase 2 — Finn's research workflow (hours 10–24)

- [ ] All 6 essential skills implemented (Workplace Zones, Census, Business
  Demography, High Streets, TfL, GLA Funding)
- [ ] Composite skills: `score_location`, `generate_launch_plan`
- [ ] Each skill result wired to its dashboard section via WebSocket events
- [ ] Agent Workspace timeline = live trace of skill calls
- [ ] Voice handoff Flora → Finn works without breaking audio continuity

### Phase 3 — Dashboard voice refinement (hours 24–32)

- [ ] Router: "Flora, X" / "Finn, Y" / generic intent classifier
- [ ] Partial re-runs (e.g. just `score_location` when adding a new area)
- [ ] Live "Your plan, updating" modal — real backend events, not scripted
- [ ] Suggestion chips fire real flows when clicked

### Phase 4 — Polish & demo prep (hours 32–end)

- [ ] One drilled "happy path" demo (the halal lunch scenario, end-to-end)
- [ ] Pre-warmed data cache so first query is instant
- [ ] Recording fallback: browser TTS + scripted text in case the live
  API fails on stage
- [ ] One stretch path: judge gives a different idea, see how it handles
  (only if Phase 3 is fully done)

---

## 9. Cut list — do NOT build

- Auth, accounts, user management
- Persistence beyond the active session
- Real OAuth to GLA, Companies House, or any provider
- Mobile responsive — desktop demo only
- Generated PDF / pitch deck exports — keep buttons as mocked
- More than the halal lunch demo scenario (unless time permits)
- More than 1 founder profile in memory at a time
- Live Datastore CKAN queries — use baked cache
- Voice languages other than English

---

## 10. Top risks

| Risk | Mitigation |
|---|---|
| Nemotron tool-call drift vs Claude/GPT-4 schemas | Validate every tool call against JSON schema. Retry with stricter system prompt + 1-shot example. Fall back to a guarded reprompt if invalid. |
| ElevenLabs interrupt handling races | Track `tts_request_id` per turn. On any new STT activity, cancel previous TTS server-side + send `flush_audio` to browser. Test with rapid-fire interruptions before demo. |
| NemoClaw persona handoff feels broken on voice | Keep voice stream continuous — Flora literally says "let me hand you to Finn" while the system prompt swaps mid-stream. Optionally swap voice ID at the handoff word boundary. |
| Dataset query latency on first request | Pre-build SQLite/DuckDB indices in CI. Warm the connection at session start. Never query raw CSVs at runtime. |
| Skill ↔ dashboard contract drift | Shared Zod schemas between backend and frontend (`packages/contracts` or generate types from the skill registry). Break the build if shapes diverge. |
| Demo network failure | Cache all skill outputs from the rehearsal run. Have a "replay last session" toggle that runs the demo with zero network calls. |

---

## 11. Open decisions

Before scaffolding, confirm:

1. **NemoClaw provenance** — is this a tool you've already built, an existing
   NVIDIA orchestration product you're using, or building from scratch this
   hackathon? Affects whether the skill-registry pattern below needs to be
   written or assumes one exists.
2. **Voice IDs** — separate ElevenLabs voice for Flora vs Finn? Strongly
   recommended; the personality differentiation is the product.
3. **Nemotron hosting** — NVIDIA NIM hosted, OpenRouter, or self-hosted on
   GPU? Affects latency budget and cost model.
4. **Whether to deploy backend** for the demo or run it locally during the
   pitch. Local is more reliable but a deployed URL impresses judges.
5. **Session persistence** — do we want a founder to come back and continue,
   or is "fresh session every time" fine for hackathon?

---

## 12. Repository structure (proposed)

Current state is frontend-only. Recommend converting to a monorepo as you
add the backend:

```
horizon/
  apps/
    web/                        # current Vite app
      src/
        App.jsx
        store/                  # NEW — Zustand slices
        lib/
          socket.js             # NEW — WebSocket client
          audio.js              # NEW — mic + playback
        pages/
        components/
    gateway/                    # NEW — backend
      src/
        index.ts                # Hono + ws entrypoint
        nemoclaw/               # orchestrator
          personas/
            flora.ts
            finn.ts
          router.ts
        skills/                 # skill implementations
          workplace_zone_density.ts
          census_religion_share.ts
          ...
        adapters/
          elevenlabs_stt.ts
          elevenlabs_tts.ts
          nemotron.ts
        data/
          bake.ts               # ETL
          normalised/           # checked-in SQLite
      package.json
  packages/
    contracts/                  # shared schemas (Zod)
      src/
        skills.ts
        events.ts
  pnpm-workspace.yaml           # or npm workspaces
```

Keep the GitHub Pages deployment for `apps/web` — backend deploys
separately to Fly.io. Frontend connects to backend URL via env var.

---

## 13. Hackathon scope summary

**Must ship for a credible demo:**

- Real voice conversation with Flora (audio in + out, interrupt handling)
- 6 working Finn skills against real London Datastore data
- Live dashboard updates from skill outputs
- One end-to-end demo scenario that survives a judge's "what if I change X?"

**Nice to have if ahead of schedule:**

- Real Mapbox heatmap of Workplace Zones
- Companies House API for live competitor analysis
- Second demo scenario (different industry / area)
- Voice ID swap at persona handoff

**Hard cuts:**

- Anything outside London
- Anything requiring user accounts
- Anything that requires more than 1 founder session in memory
