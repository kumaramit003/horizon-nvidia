# Finn & Flora · FounderOS London

An agentic startup advisor for early-stage London founders. Flora conducts an intelligent intake conversation to understand your idea, then Finn analyses London Datastore data to build a validated launch plan — audience, market validation, locations, financials, and a 7-day action plan.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────┐
│   Frontend   │────▶│   Backend (API)   │────▶│ MongoDB │
│  React/Vite  │◀────│  FastAPI/Python   │◀────│         │
│  port 5173   │     │    port 8000      │     │  27017  │
└─────────────┘     └──────┬───────────┘     └─────────┘
                           │
                    ┌──────▼───────┐
                    │  NVIDIA NIM  │
                    │  Nemotron    │
                    │  (local LLM) │
                    └──────────────┘
```

- **Frontend** — React 18 + Vite + Tailwind CSS + Lucide icons
- **Backend** — FastAPI + Motor (async MongoDB) + OpenAI-compatible SDK
- **LLM** — NVIDIA NIM / Nemotron (runs locally, OpenAI-compatible API)
- **Database** — MongoDB 7 for storing discoveries and agent-generated data
- **Containerised** — Docker Compose for the full stack

## Agents

**Flora** (Discovery Agent) — Conducts an adaptive intake conversation. She asks 3–10 questions depending on how much the founder shares, tracking coverage across 6 dimensions (idea, motivation, customer, format, budget, location). When she has enough context, she hands off to Finn.

**Finn** (Research & Planning Agent) — Runs 6 parallel analysis modules against London Datastore data:
1. Target Audience — segments, personas, interview questions
2. Market Validation — evidence cards, risk radar, experiments
3. Location Intelligence — scored London areas with map data
4. Financials — cost bands, monthly breakdown, grant matching
5. Action Plan — 7-day sprint, 30/60/90 roadmap, generated assets
6. Agent Workspace — module status, activity log, confidence notes

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.12+
- Poetry
- Docker (for MongoDB, or run it natively)
- A running NVIDIA NIM / Nemotron server

### Local Development

```bash
# Install dependencies
just install

# Start MongoDB
just db

# Set your NIM server URL (in backend/.env)
echo "NVIDIA_BASE_URL=http://localhost:8080/v1" > backend/.env

# Start backend + frontend
just backend &   # terminal 1
just frontend    # terminal 2
```

Then open http://localhost:5173

## ElevenLabs voice

Copy real credentials into `.env`:

```bash
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID_FINN=...
ELEVENLABS_VOICE_ID_FLORA=...
```

Run the voice API in one terminal:

```bash
npm run voice:server
```

Run the web app in another terminal:

```bash
npm run dev
```

The Vite dev server proxies `/api/voice/*` to `http://localhost:8787`, keeping the API key server-side.

## Build
### Docker Compose (full stack)

```bash
# Set your NIM server URL
export NVIDIA_BASE_URL=http://host.docker.internal:8080/v1

# Build and run
just up
```

Then open http://localhost:3001

### All Commands

| Command | Description |
|---|---|
| `just install` | Install all deps (npm + poetry) |
| `just db` | Start MongoDB in Docker |
| `just db-stop` | Stop MongoDB |
| `just backend` | Start FastAPI on :8000 |
| `just frontend` | Start Vite on :5173 |
| `just dev` | Start backend + frontend together |
| `just up` | Full stack via docker-compose |
| `just down` | Tear down containers |
| `just clean` | Tear down + delete volumes |
| `just logs` | Tail all container logs |

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/flora/chat` | Send conversation, get Flora's next response |
| `POST` | `/api/discoveries` | Create discovery (runs full Flora → Finn pipeline) |
| `GET` | `/api/discoveries` | List all discoveries |
| `GET` | `/api/discoveries/:id` | Get full discovery document |
| `GET` | `/api/discoveries/:id/dashboard` | Get dashboard data only |
| `PATCH` | `/api/discoveries/:id/dashboard` | Partial update dashboard |
| `GET` | `/api/health` | Health check |

## Configuration

Create `backend/.env` (see `backend/.env.example`):

```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=founderos
NVIDIA_BASE_URL=http://localhost:8080/v1
NVIDIA_MODEL=nvidia/llama-3.1-nemotron-70b-instruct
```

## Data Sources

All research is anchored to public datasets on the [London Datastore](https://data.london.gov.uk/dataset/):

- Workplace Zone Statistics
- London Business Demography
- 2021 Census · Religion by Ward
- London Borough Profiles
- High Streets Health Check
- TfL Open Data
- Survey of Londoners
- VOA Floor Space & Property
- Planning Applications
- GLA Funding & Support Directory
- Food Business Establishments
- London Air Quality Data

## Project Structure

```
├── src/                    # React frontend
│   ├── components/         # Shared UI components
│   ├── pages/              # Dashboard pages (7 sections)
│   ├── lib/api.js          # API client
│   └── data/               # London dataset index
├── backend/                # FastAPI backend
│   └── app/
│       ├── agents/         # Flora + Finn LLM agents
│       ├── routers/        # API routes
│       ├── llm.py          # NVIDIA NIM client
│       ├── models.py       # Pydantic schemas
│       └── database.py     # MongoDB connection
├── docker-compose.yml      # Full stack containerisation
├── Dockerfile              # Frontend (multi-stage → nginx)
├── nginx.conf              # Reverse proxy config
└── justfile                # Development commands
```
