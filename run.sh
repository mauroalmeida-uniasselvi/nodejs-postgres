#!/bin/bash

set -euo pipefail

wait_for_healthy_service() {
  local service_name="$1"
  local container_id

  container_id="$(docker compose ps -q "$service_name")"
  if [ -z "$container_id" ]; then
    echo "container for service '$service_name' not found"
    return 1
  fi

  while [ "$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null)" != "healthy" ]; do
    echo -n "."
    sleep 1
  done

  echo
}

cleanup() {
  echo ""
  echo "clean compose from current execution"
  docker compose down -v
}

trap cleanup EXIT

export NODE_ENV="${NODE_ENV:-development}"
export PORT="${PORT:-3000}"
export PG_HOST="${PG_HOST:-postgres}"
export PG_PORT="${PG_PORT:-5432}"
export PG_USER="${PG_USER:-uniasselvi}"
export PG_PASSWORD="${PG_PASSWORD:-uniasselvi}"
export PG_DATABASE="${PG_DATABASE:-uniasselvi_db}"
export REDIS_HOST="${REDIS_HOST:-redis}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-uniasselvi}"
export CACHE_TTL_SECONDS="${CACHE_TTL_SECONDS:-300}"
export CACHE_DEBUG="${CACHE_DEBUG:-true}"
export DB_DEBUG="${DB_DEBUG:-true}"

echo "clean compose from previous execution"
docker compose down -v

echo "start compose with api, postgres and redis"
docker compose up -d --build

echo "waiting for database to be ready"
wait_for_healthy_service postgres

echo "waiting for redis to be ready"
wait_for_healthy_service redis

echo "environment variables in use"
echo "NODE_ENV=$NODE_ENV"
echo "PORT=$PORT"
echo "PG_HOST=$PG_HOST"
echo "PG_PORT=$PG_PORT"
echo "PG_USER=$PG_USER"
echo "PG_DATABASE=$PG_DATABASE"
echo "REDIS_HOST=$REDIS_HOST"
echo "REDIS_PORT=$REDIS_PORT"
echo "CACHE_TTL_SECONDS=$CACHE_TTL_SECONDS"
echo "CACHE_DEBUG=$CACHE_DEBUG"
echo "DB_DEBUG=$DB_DEBUG"

echo "showing api logs (Ctrl+C to stop and clean up)"
docker compose logs -f api
