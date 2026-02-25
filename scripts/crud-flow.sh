#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="$BASE_URL/api/students"

echo "[1/5] POST - criando aluno"
CREATE_RESPONSE=$(curl -sS -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{"id":"2026001","name":"John Doe","grade":"10","email":"john@example.com"}')

echo "$CREATE_RESPONSE"

STUDENT_ID=$(node -e 'const data = JSON.parse(process.argv[1]); process.stdout.write(String(data?.id ?? ""));' "$CREATE_RESPONSE")

if [ -z "$STUDENT_ID" ]; then
  echo "Falha ao obter ID do aluno criado"
  exit 1
fi

echo "[2/5] GET - buscando aluno $STUDENT_ID"
curl -sS "$API_URL/$STUDENT_ID"
echo ""

echo "[3/5] PUT - atualizando name para Jane Doe"
curl -sS -X PUT "$API_URL/$STUDENT_ID" \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe"}'
echo ""

echo "[4/5] GET - buscando aluno atualizado $STUDENT_ID"
curl -sS "$API_URL/$STUDENT_ID"
echo ""

echo "[5/5] DELETE - removendo aluno $STUDENT_ID"
DELETE_STATUS=$(curl -sS -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/$STUDENT_ID")
echo "Status DELETE: $DELETE_STATUS"
