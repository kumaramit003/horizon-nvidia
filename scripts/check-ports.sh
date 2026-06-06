#!/usr/bin/env bash
# Pre-flight check before `docker compose up`.
# Returns non-zero if any of the host ports we need is taken by something
# OUTSIDE our own compose stack. Containers we own are fine.

set -u

ports=(3001 8001 27017)
labels=(frontend backend mongo)
fail=0

# If our compose stack already has containers running, the host ports are
# (correctly) bound by them. Don't flag those as conflicts.
own_containers=$(docker compose ps -q 2>/dev/null)

if [ -n "$own_containers" ]; then
  echo "  ℹ Stack is already running — these ports are owned by our containers:"
  for i in "${!ports[@]}"; do
    echo "    ✓ Port ${ports[$i]} (${labels[$i]})"
  done
  echo ""
  echo "  Open http://localhost:3001 to view the app."
  echo "  Run \`just down\` to stop, or \`just rebuild\` to refresh."
  exit 0
fi

for i in "${!ports[@]}"; do
  port="${ports[$i]}"
  label="${labels[$i]}"

  pid_info=""
  if command -v lsof >/dev/null 2>&1; then
    pid_info=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $1" (pid "$2")"}')
  elif command -v ss >/dev/null 2>&1; then
    pid_info=$(ss -ltnp "sport = :$port" 2>/dev/null | awk 'NR>1 {print $0}' | head -1)
  fi

  if [ -n "$pid_info" ]; then
    echo "  ✗ Port $port ($label) is taken by: $pid_info"
    fail=1
  else
    echo "  ✓ Port $port ($label) free"
  fi
done

exit $fail
