#!/bin/bash

echo "clean compose from previous execution"
docker compose down -v

echo "start compose in detached mode"
docker compose up -d

echo "waiting for database to be ready"
while [ "$(docker inspect -f '{{.State.Health.Status}}' nodejs-postgres-postgres-1 2>/dev/null)" != "healthy" ]; do
  echo -n "."
  sleep 1
done

echo "building application"
docker build -t nodejs-postgres .

echo "remove previous container application if exists"
docker rm -f nodejs-postgres 2>/dev/null

echo "starting application"
docker run -it --rm \
  --name nodejs-postgres \
  --network host \
  -e NODE_ENV=development \
  -e PG_HOST=localhost \
  -e PG_PORT=5432 \
  -e PG_USER=uniasselvi \
  -e PG_PASSWORD=uniasselvi \
  -e PG_DATABASE=uniasselvi_db \
  -v "$(pwd)":/usr/src/app \
  nodejs-postgres

echo "finished application run"

echo "remove application image"
docker rmi nodejs-postgres

echo "clean compose from previous execution"
docker compose down -v
