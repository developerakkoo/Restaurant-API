#!/usr/bin/env bash
# Verify server Geocoding API key (see deploy/GOOGLE_MAPS_SETUP.md)
set -euo pipefail

API_BASE="${API_BASE:-https://dropeat.techlapse.co.in/api/v1}"
LAT="${LAT:-19.0330}"
LNG="${LNG:-73.0297}"
TOKEN="${ACCESS_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Usage: ACCESS_TOKEN=your_jwt LAT=19.033 LNG=73.0297 $0"
  echo "Or set API_BASE for local: API_BASE=http://localhost:8000/api/v1"
  exit 1
fi

URL="${API_BASE}/user/reverse-geocode?lat=${LAT}&lng=${LNG}"
echo "GET $URL"

HTTP=$(curl -sS -w "\n%{http_code}" -H "x-access-token: $TOKEN" "$URL")
BODY=$(echo "$HTTP" | head -n -1)
CODE=$(echo "$HTTP" | tail -n 1)

echo "HTTP $CODE"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [[ "$CODE" == "200" ]]; then
  echo "OK: Geocoding configured correctly"
  exit 0
fi

echo "FAIL: Expected HTTP 200. If status is REQUEST_DENIED, use a server Geocoding key (not Android-restricted)."
exit 1
