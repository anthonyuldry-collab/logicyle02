#!/usr/bin/env bash
# Préflight soft-launch — vérifie ce qui est prêt SANS déployer.
# Usage : ./scripts/preflight-soft-launch.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

pass=0
fail=0
warn=0

ok()   { echo "OK   $*"; pass=$((pass+1)); }
ko()   { echo "FAIL $*"; fail=$((fail+1)); }
warn() { echo "WARN $*"; warn=$((warn+1)); }

echo "==> Préflight soft-launch LogiCycle"
echo

# 1) Price IDs Functions
ENVF="functions/.env.logicycle01"
if [[ -f "$ENVF" ]]; then
  needed=(
    STRIPE_PRICE_CLUB_MONTH STRIPE_PRICE_CLUB_YEAR
    STRIPE_PRICE_COMPETITION_MONTH STRIPE_PRICE_COMPETITION_YEAR
    STRIPE_PRICE_CONTINENTAL_MONTH STRIPE_PRICE_CONTINENTAL_YEAR
    STRIPE_PRICE_PRO_MONTH STRIPE_PRICE_PRO_YEAR
    STRIPE_PRICE_INDEPENDENT_RIDER_MONTH STRIPE_PRICE_INDEPENDENT_RIDER_YEAR
    STRIPE_PRICE_INDEPENDENT_STAFF_MONTH STRIPE_PRICE_INDEPENDENT_STAFF_YEAR
    ALLOWED_APP_ORIGINS
  )
  miss=0
  for k in "${needed[@]}"; do
    if grep -q "^${k}=.\+" "$ENVF"; then
      :
    else
      echo "  missing $k"
      miss=1
    fi
  done
  if [[ "$miss" -eq 0 ]]; then ok "Price IDs + ALLOWED_APP_ORIGINS (functions/.env.logicycle01)"; else ko "Price IDs incomplets"; fi
else
  ko "functions/.env.logicycle01 absent"
fi

# 2) Prod client env
if [[ -f .env.production ]]; then
  if grep -q 'VITE_SKIP_SIGNUP_PAYMENT=true' .env.production; then
    ko ".env.production contient VITE_SKIP_SIGNUP_PAYMENT=true"
  else
    ok ".env.production sans bypass paiement"
  fi
  if grep -q 'VITE_FIREBASE_API_KEY=.\+' .env.production; then
    ok ".env.production Firebase client"
  else
    ko ".env.production Firebase incomplet"
  fi
  if grep -q 'VITE_SENTRY_DSN=.\+' .env.production; then
    ok "Sentry DSN dans .env.production"
  else
    warn "Sentry DSN absent (.env.production) — à ajouter pour prod monitoring"
  fi
else
  ko ".env.production absent"
fi

# 3) Local skip (info)
if [[ -f .env ]] && grep -q 'VITE_SKIP_SIGNUP_PAYMENT=true' .env; then
  warn "Local .env : SKIP_SIGNUP=true (OK en DEV, ignoré en PROD build)"
fi

# 4) Marketplace matching-only
if grep -q 'paymentsEnabled: false' constants/missionMarketplace.ts; then
  ok "Marketplace matching-only (paymentsEnabled=false)"
else
  warn "Marketplace paymentsEnabled ≠ false — vérifier intention"
fi

# 5) Legal placeholders
if grep -q 'À COMPLÉTER' legal/meta.ts; then
  warn "Identité éditeur incomplete (legal/meta.ts) — bloquant go-live commercial"
else
  ok "Identité éditeur renseignée"
fi

# 6) Typecheck rapide (si node_modules)
if [[ -d node_modules ]]; then
  if npx tsc --noEmit >/tmp/logicycle-preflight-tsc.txt 2>&1; then
    ok "Typecheck tsc"
  else
    ko "Typecheck tsc (voir /tmp/logicycle-preflight-tsc.txt)"
  fi
else
  warn "node_modules absent — skip tsc"
fi

# 7) Artefacts build locaux
if [[ -f dist/version.json ]] && grep -q buildId dist/version.json; then
  ok "dist/version.json présent"
else
  warn "dist/version.json absent — lancer npm run build avant deploy"
fi

echo
echo "==> Résultat : $pass OK / $warn WARN / $fail FAIL"
echo "    Suite manuelle ce soir :"
echo "    1. Déployer la branche (landing + legal) sur Netlify"
echo "    2. Tester signup → Checkout Stripe TEST (carte 4242…)"
echo "    3. Créer projet Sentry → coller VITE_SENTRY_DSN"
echo "    4. Stripe Dashboard → activer Live quand ready"
if [[ "$fail" -gt 0 ]]; then exit 1; fi
exit 0
