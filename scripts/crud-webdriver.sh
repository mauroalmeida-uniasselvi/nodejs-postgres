#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
BROWSER_BASE_URL="${BROWSER_BASE_URL:-}"
SELENIUM_HEADLESS="${SELENIUM_HEADLESS:-false}"
WAIT_TIMEOUT_SECONDS="${WAIT_TIMEOUT_SECONDS:-45}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Comando obrigatório não encontrado: $1"
    exit 1
  fi
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

wait_for_url() {
  local url="$1"
  local timeout="$2"
  local elapsed=0

  while ! curl -fsS "$url" >/dev/null 2>&1; do
    if [ "$elapsed" -ge "$timeout" ]; then
      return 1
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  return 0
}

require_cmd curl

NODE_BIN=""
if has_cmd node; then
  NODE_BIN="node"
elif has_cmd nodejs; then
  NODE_BIN="nodejs"
fi

if ! wait_for_url "$BASE_URL" "$WAIT_TIMEOUT_SECONDS"; then
  echo "Aplicação indisponível em $BASE_URL"
  echo "Suba a aplicação primeiro (ex.: npm start ou docker compose up -d)."
  exit 1
fi

if [ -z "$BROWSER_BASE_URL" ]; then
  BROWSER_BASE_URL="$BASE_URL"
fi

echo "[1/5] validando firefox-esr local"
if ! has_cmd firefox-esr; then
  echo "firefox-esr não encontrado no host."
  echo "Instale o firefox-esr para executar o fluxo Selenium local."
  exit 1
fi
FIREFOX_BINARY="$(command -v firefox-esr)"

echo "[2/5] validando dependências locais"

if [ -z "$NODE_BIN" ]; then
  echo "Node.js não encontrado no host (node/nodejs)."
  echo "Instale Node.js para executar o fluxo Selenium local."
  exit 1
fi

echo "[3/5] executando com node/npm local"
if ! "$NODE_BIN" -e "require.resolve('selenium-webdriver')" >/dev/null 2>&1; then
  if has_cmd npm; then
    npm install --no-save selenium-webdriver >/dev/null
  else
    echo "Pacote selenium-webdriver não encontrado e npm não está disponível."
    echo "Instale npm ou adicione selenium-webdriver às dependências do projeto."
    exit 1
  fi
fi

BASE_URL="$BASE_URL" \
BROWSER_BASE_URL="$BROWSER_BASE_URL" \
FIREFOX_BINARY="$FIREFOX_BINARY" \
SELENIUM_HEADLESS="$SELENIUM_HEADLESS" \
SELENIUM_WAIT_MS="$((WAIT_TIMEOUT_SECONDS * 1000))" \
"$NODE_BIN" scripts/crud-webdriver.js

echo "[4/5] cenário finalizado"

echo "[5/5] sucesso"
