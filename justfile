# FounderOS London — development commands

# Show available recipes
default:
    @just --list

# Install all dependencies (frontend + backend)
install:
    npm install
    cd backend && poetry install

# Start MongoDB in Docker
db:
    docker run --rm -d --name founderos-mongo -p 27017:27017 mongo:7
    @echo "MongoDB running on localhost:27017"

# Stop MongoDB
db-stop:
    docker stop founderos-mongo

# Start backend (FastAPI on :8001 — avoids NIM running on :8000)
backend:
    cd backend && MONGODB_URL=mongodb://localhost:27017 poetry run uvicorn app.main:app --reload --port 8001

# Start frontend (Vite on :5173)
frontend:
    npm run dev

# Start everything locally (requires db running separately)
dev:
    @echo "Starting backend and frontend..."
    @just backend &
    @just frontend

# Build frontend for production
build:
    npm run build

# Docker compose up (full stack)
up:
    docker compose up --build

# Docker compose down
down:
    docker compose down

# Docker compose down + remove volumes
clean:
    docker compose down -v

# Run the full stack in Docker (detached)
up-d:
    docker compose up --build -d

# View backend logs
logs-backend:
    docker compose logs -f backend

# View all logs
logs:
    docker compose logs -f
