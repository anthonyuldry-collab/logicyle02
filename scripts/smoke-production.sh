#!/usr/bin/env bash
# Smoke checks production LogiCycle — à lancer après un deploy.
set -euo pipefail

SITE="${SITE_URL:-https://logicycle2.netlify.app}"
PROJECT="${FIREBASE_PROJECT:-logicycle01}"
REGION="${FIREBASE_FUNCTIONS_REGION:-europe-west1}"
HEALTHZ_RUN="${HEALTHZ_RUN_URL:-https://healthz-3hz57fnxca-ew.a.run.app}"
FN_BASE="https://${REGION}-${PROJECT}.cloudfunctions.net"

pass=0
fail=0

check() {
  local name="$1"
  local ok="$2"
  local detail="${3:-}"
  if [[ "$ok" == "1" ]]; then
    echo "OK   $name${detail:+ — $detail}"
    pass=$((pass + 1))
  else
    echo "FAIL $name${detail:+ — $detail}"
    fail=$((fail + 1))
  fi
}

echo "==> Smoke production LogiCycle"
echo "    site=$SITE"
echo

# Front
code=$(curl -sS -o /dev/null -w '%{http_code}' "$SITE/" || echo 000)
check "Netlify front" "$([[ "$code" == "200" ]] && echo 1 || echo 0)" "HTTP $code"

ver=$(curl -sS "$SITE/version.json" 2>/dev/null || true)
if echo "$ver" | grep -q 'buildId'; then
  check "version.json" 1 "$(echo "$ver" | tr -d '\n' | head -c 80)"
else
  check "version.json" 0 "absent ou invalide"
fi

idx=$(curl -sS "$SITE/" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1 || true)
if [[ -n "$idx" ]]; then
  bundle=$(curl -sS "$SITE/$idx" || true)
  if echo "$bundle" | grep -q 'createStripeCheckout'; then
    check "Bundle Stripe checkout" 1 "$idx"
  else
    check "Bundle Stripe checkout" 0 "createStripeCheckout introuvable"
  fi
  if echo "$bundle" | grep -qE 'chunk-reload|recoverFromStaleDeploy|version.json'; then
    check "Guard chunks obsolètes" 1
  else
    check "Guard chunks obsolètes" 0
  fi
else
  check "Index JS" 0 "non trouvé"
fi

old=$(curl -sS -o /dev/null -w '%{http_code}:%{content_type}' "$SITE/assets/FinancialSection-c3XnJDM0.js" || echo "000:")
if [[ "$old" == 404:* ]]; then
  check "Assets manquants → 404 (pas HTML SPA)" 1 "$old"
else
  check "Assets manquants → 404 (pas HTML SPA)" 0 "$old"
fi

# Functions
hz=$(curl -sS -o /tmp/healthz.json -w '%{http_code}' "$HEALTHZ_RUN/" || echo 000)
if [[ "$hz" == "200" ]] && grep -q '"status":"ok"' /tmp/healthz.json 2>/dev/null; then
  check "healthz (Cloud Run)" 1
else
  check "healthz (Cloud Run)" 0 "HTTP $hz"
fi

hz2=$(curl -sS -o /tmp/healthz-deep.json -w '%{http_code}' "$HEALTHZ_RUN/?deep=1" || echo 000)
if [[ "$hz2" == "200" ]] && grep -q '"deep"' /tmp/healthz-deep.json 2>/dev/null; then
  check "healthz deep (Firestore)" 1
else
  check "healthz deep (Firestore)" 0 "HTTP $hz2"
fi

opt=$(curl -sS -o /dev/null -w '%{http_code}' -X OPTIONS "$FN_BASE/createStripeCheckout" || echo 000)
check "createStripeCheckout (OPTIONS)" "$([[ "$opt" == "204" || "$opt" == "200" ]] && echo 1 || echo 0)" "HTTP $opt"

wh=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$FN_BASE/stripeWebhook" || echo 000)
# 400 = endpoint vivant (signature manquante) ; 503 = Stripe non configuré
if [[ "$wh" == "400" ]]; then
  check "stripeWebhook vivant" 1 "HTTP 400 (signature requise — OK)"
elif [[ "$wh" == "503" ]]; then
  check "stripeWebhook vivant" 0 "HTTP 503 — secrets Stripe manquants"
else
  check "stripeWebhook vivant" 0 "HTTP $wh"
fi

echo
echo "==> Résultat : $pass OK / $fail FAIL"
if [[ "$fail" -gt 0 ]]; then
  exit 1
fi
