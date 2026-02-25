@echo off
setlocal

echo clean compose from previous execution
docker compose down -v

echo start compose in detached mode
docker compose up -d

echo waiting for database to be ready
:wait_db
set "HEALTH="
for /f "delims=" %%H in ('docker inspect -f "{{.State.Health.Status}}" nodejs-postgres-postgres-1 2^>nul') do set "HEALTH=%%H"
if /i not "%HEALTH%"=="healthy" (
	<nul set /p=.
	timeout /t 1 /nobreak >nul
	goto wait_db
)

echo building application
docker build -t nodejs-postgres .

echo remove previous container application if exists
docker rm -f nodejs-postgres 2>nul

echo starting application
docker run -it --rm ^
	--name nodejs-postgres ^
	--network host ^
	-e NODE_ENV=development ^
	-e PG_HOST=localhost ^
	-e PG_PORT=5432 ^
	-e PG_USER=uniasselvi ^
	-e PG_PASSWORD=uniasselvi ^
	-e PG_DATABASE=uniasselvi_db ^
	-v "%cd%":/usr/src/app ^
	nodejs-postgres

echo finished application run

echo remove application image
docker rmi nodejs-postgres

echo clean compose from previous execution
docker compose down -v

endlocal
