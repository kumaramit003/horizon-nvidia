# FounderOS London — development commands

# Show available recipes
default:
    @just --list

# ────────────────────────────────────────────────────────────────────────────
# The one command you want: bring up the entire stack and stream logs.
# Creates .env from .env.example if missing, builds + starts mongo + backend
# + frontend, waits for backend health, prints URLs, then tails logs.
# ────────────────────────────────────────────────────────────────────────────
go:
    @if [ ! -f .env ]; then \
        echo "→ No .env found. Copying from .env.example..."; \
        cp .env.example .env; \
        echo "  Edit .env and re-run \`just go\` if you need to set keys."; \
    fi
    @echo "→ Clearing any leftover containers on our ports..."
    @docker stop founderos-mongo > /dev/null 2>&1 || true
    @docker compose down --remove-orphans > /dev/null 2>&1 || true
    @./scripts/check-ports.sh || (echo ""; echo "✗ A port is already in use. Free it (e.g. \`lsof -nP -iTCP:<port> -sTCP:LISTEN\`) and re-run."; exit 1)
    @echo "→ Building and starting the stack..."
    docker compose up --build -d --force-recreate
    @echo ""
    @echo "→ Waiting for the backend to come up..."
    @until curl -fsS http://localhost:8001/api/health > /dev/null 2>&1; do sleep 1; printf "."; done
    @echo ""
    @echo "→ Backend is ready."
    @echo ""
    @echo "  Frontend  →  http://localhost:3001"
    @echo "  Backend   →  http://localhost:8001"
    @echo "  Mongo     →  mongodb://localhost:27017"
    @echo ""
    @echo "  Voice health → $$(curl -fsS http://localhost:8001/api/voice/health)"
    @echo ""
    @echo "→ Tailing logs.  Ctrl+C to stop watching (containers keep running)."
    @echo "  Stop the stack with \`just down\`."
    @echo ""
    docker compose logs -f

# ── Docker stack lifecycle ─────────────────────────────────────────────────

# Bring the full stack up in the foreground (build then attach logs).
up:
    docker compose up --build

# Bring up in the background (no log tail).
up-d:
    docker compose up --build -d

# Stop and remove containers (keeps the mongo volume).
down:
    docker compose down

# Stop, remove containers, AND delete the mongo volume (full reset).
clean:
    docker compose down -v

# Rebuild from scratch.
rebuild:
    docker compose build --no-cache
    docker compose up -d --force-recreate

# Reload .env without rebuilding (changes env vars, recreates containers).
env-reload:
    docker compose up -d --force-recreate

# ── Logs ───────────────────────────────────────────────────────────────────

logs:
    docker compose logs -f

logs-backend:
    docker compose logs -f backend

logs-frontend:
    docker compose logs -f frontend

logs-mongo:
    docker compose logs -f mongo

# ── Local dev (no Docker) ──────────────────────────────────────────────────

# Install all dependencies (frontend + backend).
install:
    npm install
    cd backend && poetry install

# Start just MongoDB in Docker (for local dev with host uvicorn/vite).
db:
    docker run --rm -d --name founderos-mongo -p 27017:27017 mongo:7
    @echo "MongoDB running on localhost:27017"

# Stop the local-dev MongoDB.
db-stop:
    docker stop founderos-mongo

# Start backend (FastAPI on :8001 — avoids NIM running on :8000).
backend:
    cd backend && MONGODB_URL=mongodb://localhost:27017 poetry run uvicorn app.main:app --reload --port 8001

# Start frontend (Vite on :5173, proxies /api → :8001).
frontend:
    npm run dev

# Build frontend for production.
build:
    npm run build

# ── Quick health checks ────────────────────────────────────────────────────

# Check whether ports 3001 / 8001 / 27017 are free.
doctor:
    @./scripts/check-ports.sh

# Show pipeline status: latest discovery docs + recent backend log lines.
status:
    @echo "→ Latest 3 discoveries in Mongo:"
    @docker compose exec -T mongo mongosh --quiet founderos --eval 'db.discoveries.find({}, {workspace_name:1, status:1, updated_at:1}).sort({created_at:-1}).limit(3).toArray()' 2>/dev/null || echo "  (mongo not reachable)"
    @echo ""
    @echo "→ Recent backend pipeline lines:"
    @docker compose logs backend --since 5m --no-log-prefix 2>/dev/null | grep -iE "pipeline|finn|flora|error" | tail -20 || echo "  (no recent activity)"

# Smoke-test the running stack.
check:
    @echo "→ /api/health"
    @curl -fsS http://localhost:8001/api/health || echo "  ✗ backend down"
    @echo ""
    @echo "→ /api/voice/health"
    @curl -fsS http://localhost:8001/api/voice/health || echo "  ✗ backend down"
    @echo ""
