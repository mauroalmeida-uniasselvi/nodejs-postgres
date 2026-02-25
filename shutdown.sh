#!/bin/bash

set -euo pipefail

PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$(pwd)")}"
PROJECT_NETWORK="${PROJECT_NAME}_default"

remove_project_network() {
  local network_name="$1"

  if ! docker network inspect "$network_name" >/dev/null 2>&1; then
    return 0
  fi

  local endpoint_ids
  endpoint_ids="$(docker network inspect "$network_name" --format '{{range $id, $container := .Containers}}{{$id}} {{end}}')"

  for container_id in $endpoint_ids; do
    docker rm -f "$container_id" >/dev/null 2>&1 || docker network disconnect -f "$network_name" "$container_id" >/dev/null 2>&1 || true
  done

  docker network rm "$network_name" >/dev/null 2>&1 || true
}

echo "force stopping and removing project stack: $PROJECT_NAME"

echo "stopping and removing compose resources"
docker compose down \
  --volumes \
  --remove-orphans \
  --timeout 0 || true

echo "removing remaining project containers"
remaining_containers="$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT_NAME")"
if [ -n "$remaining_containers" ]; then
  docker rm -f $remaining_containers || true
fi

echo "removing remaining project volumes"
remaining_volumes="$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT_NAME")"
if [ -n "$remaining_volumes" ]; then
  docker volume rm -f $remaining_volumes || true
fi

echo "removing project network"
remove_project_network "$PROJECT_NETWORK"

echo "force cleanup finished for project: $PROJECT_NAME"
