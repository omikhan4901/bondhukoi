#!/usr/bin/env bash
# Runs the Maestro flows against a local stack:
#   local Supabase (npx supabase start) + the API + a preview build on an emulator.
# Usage: e2e/run.sh   (from the repo root, with an Android emulator running and the
# preview APK installed: eas build -p android --profile preview --local)
set -euo pipefail
cd "$(dirname "$0")/.."

STATUS=$(npx supabase status -o env)
eval "$STATUS"   # API_URL (Supabase), ANON_KEY, SERVICE_ROLE_KEY, JWT_SECRET, DB_URL
SUPA="$API_URL"
BK_API="${BK_API:-http://10.0.2.2:3000}"   # the emulator reaches the host here
HOST_API="${HOST_API:-http://localhost:3000}"

make_user() { # email name → prints user id
  curl -sf "$SUPA/auth/v1/admin/users" -H "apikey: $SERVICE_ROLE_KEY" -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H 'content-type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Passw0rd-e2e\",\"email_confirm\":true,\"user_metadata\":{\"name\":\"$2\"}}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id'
}
token_for() {
  curl -sf "$SUPA/auth/v1/token?grant_type=password" -H "apikey: $ANON_KEY" -H 'content-type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"Passw0rd-e2e\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token'
}

STAMP=$(date +%s)
A_EMAIL="e2e.a.$STAMP@northsouth.edu"; B_EMAIL="e2e.b.$STAMP@northsouth.edu"
A_ID=$(make_user "$A_EMAIL" "Asha Test"); make_user "$B_EMAIL" "Bilal Test" >/dev/null
B_TOKEN=$(token_for "$B_EMAIL")
B_ME=$(curl -sf "$HOST_API/api/me" -H "Authorization: Bearer $B_TOKEN")
B_CODE=$(echo "$B_ME" | node -pe 'JSON.parse(require("fs").readFileSync(0)).user.friendCode')
# B is on campus and shares it all day.
psql "$DB_URL" -qc "update profiles set quiet_hours_enabled = false where id in ('$A_ID', (select id from auth.users where email = '$B_EMAIL'))"
curl -sf "$HOST_API/api/presence/check" -H "Authorization: Bearer $B_TOKEN" -H 'content-type: application/json' -d '{"lat":23.8151,"lng":90.4255,"accuracy":10}' >/dev/null

maestro test e2e/flows \
  -e A_EMAIL="$A_EMAIL" -e A_PASSWORD="Passw0rd-e2e" -e A_ID="$A_ID" \
  -e B_CODE="$B_CODE" -e B_NAME="Bilal Test" -e B_TOKEN="$B_TOKEN" \
  -e API_URL="$HOST_API"
