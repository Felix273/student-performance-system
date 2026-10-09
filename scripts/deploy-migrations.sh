#!/usr/bin/env bash
set -uo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set; skipping Prisma migrations for this build."
  exit 0
fi

direct_url="${DIRECT_URL:-${DATABASE_URL_UNPOOLED:-}}"
if [[ -z "$direct_url" && "${DATABASE_URL,,}" =~ -pooler\.|\.pooler\.|pooler- ]]; then
  echo "Error: DATABASE_URL points to a pooled PostgreSQL endpoint." >&2
  echo "Set DIRECT_URL (or DATABASE_URL_UNPOOLED) to the database's direct, unpooled URL for Prisma migrations; keep DATABASE_URL for runtime traffic." >&2
  exit 1
fi

max_attempts=3
log_file="$(mktemp)"
trap 'rm -f "$log_file"' EXIT

for ((attempt = 1; attempt <= max_attempts; attempt++)); do
  : > "$log_file"
  echo "Applying Prisma migrations (attempt ${attempt}/${max_attempts})..."

  set +e
  npx prisma migrate deploy 2>&1 | tee "$log_file"
  status=${PIPESTATUS[0]}
  set -e

  if (( status == 0 )); then
    exit 0
  fi

  if ! grep -Eqi 'P1002|timed out trying to acquire a postgres advisory lock' "$log_file"; then
    exit "$status"
  fi

  if (( attempt < max_attempts )); then
    delay=$((attempt * 12))
    echo "Prisma reported a transient database/advisory-lock timeout; retrying in ${delay}s." >&2
    sleep "$delay"
  else
    echo "Prisma migrations failed after ${max_attempts} advisory-lock timeout attempts." >&2
    exit "$status"
  fi
done
