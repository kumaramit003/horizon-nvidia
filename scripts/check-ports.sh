#!/usr/bin/env bash
# Pre-flight check before `docker compose up`.
# Returns non-zero if any of the host ports we need is already taken.

set -u

ports=(3000 8001 27017)
labels=(frontend backend mongo)
fail=0

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
