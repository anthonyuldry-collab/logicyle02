#!/usr/bin/env bash
# Vérifie la readiness Connect / factures missions (ce qui est automatisable).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ok() { echo "OK  $*"; }
warn() { echo "WARN $*"; }
fail() { echo "FAIL $*"; FAILS=$((FAILS+1)); }
FAILS=0

echo "=== Go-live missions / factures (checks auto) ==="

# Front flags
if [[ -f .env.production ]] && grep -qE '^VITE_MISSION_PAYMENTS=true' .env.production; then
  warn "PROD VITE_MISSION_PAYMENTS=true — paiements front actifs"
else
  ok "Front matching-only ou non-prod (VITE_MISSION_PAYMENTS off)"
fi

# Legal env
LEGAL_OK=1
for key in VITE_LEGAL_SIRET VITE_LEGAL_SIREN VITE_LEGAL_REGISTERED_OFFICE; do
  if [[ -f .env.production ]] && grep -qE "^${key}=.+" .env.production && ! grep -qE "^${key}=.*COMPLÉT" .env.production; then
    ok "$key renseigné dans .env.production"
  elif [[ -f .env ]] && grep -qE "^${key}=.+" .env && ! grep -qE "^${key}=.*COMPLÉT" .env; then
    ok "$key renseigné dans .env"
  else
    warn "$key manquant — factures en mode provisoire / live checkout bloqué"
    LEGAL_OK=0
  fi
done

# Functions legal / Resend
if [[ -f functions/.env.logicycle01 ]]; then
  if grep -qE '^MISSION_PAYMENTS_ENABLED=true' functions/.env.logicycle01; then
    warn "MISSION_PAYMENTS_ENABLED=true (Functions)"
  else
    ok "MISSION_PAYMENTS_ENABLED off (Functions)"
  fi
  if grep -qE '^RESEND_API_KEY=.+' functions/.env.logicycle01; then
    ok "RESEND_API_KEY présent (emails factures activables)"
  else
    warn "RESEND_API_KEY absent — emails factures en no-op"
  fi
  if grep -qE '^LOGICYCLE_SIRET=.+' functions/.env.logicycle01; then
    ok "LOGICYCLE_SIRET Functions"
  else
    warn "LOGICYCLE_SIRET Functions manquant"
  fi
fi

# Code presence
for f in \
  functions/src/missionPaymentHandlers.js \
  functions/src/missionInvoicePdf.js \
  functions/src/sendTransactionalEmail.js \
  sections/financial/FinancialMissionInvoicesTab.tsx \
  firebase/firestore.rules \
  firebase/storage.rules
do
  [[ -f "$f" ]] && ok "fichier $f" || fail "manque $f"
done

# Syntaxe JS functions
node --check functions/src/missionPaymentHandlers.js
node --check functions/src/missionInvoicePdf.js
node --check functions/src/sendTransactionalEmail.js
node --check functions/src/logicycleLegal.js
ok "syntaxe handlers factures"

# Indexes JSON
node -e "JSON.parse(require('fs').readFileSync('firebase/firestore.indexes.json','utf8'))"
ok "firestore.indexes.json valide"

echo ""
echo "=== Déploiement recommandé ==="
echo "firebase deploy --only firestore:rules,firestore:indexes,storage,functions"
echo ""
if [[ "$LEGAL_OK" -eq 0 ]]; then
  echo "Reste manuel : K-bis → VITE_LEGAL_* / LOGICYCLE_* + validation avocat + assigner rôles comptable/trésorier"
else
  echo "Identité légale env détectée — vérifier encore avocat + flags prod avant sk_live"
fi

exit "$FAILS"
