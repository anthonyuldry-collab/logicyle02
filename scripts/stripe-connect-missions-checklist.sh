#!/usr/bin/env bash
# Checklist Stripe Connect — marketplace missions (TEST). Ne bascule rien automatiquement.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVF="$ROOT/functions/.env.logicycle01"
FRONT_ENV="$ROOT/.env"
FRONT_PROD="$ROOT/.env.production"

echo "==> Marketplace missions · Stripe Connect TEST"
echo "    Doc : docs/STRIPE_CONNECT_MISSIONS_TEST.md"
echo
echo "Architecture :"
echo "  Accounts v2 recipient · Express · destination charges · application_fee 12 % (10 % Pro)"
echo
echo "1) Dashboard Stripe TEST"
echo "   - Connect plateforme activé"
echo "   - Webhook → stripeWebhook (checkout.session.completed)"
echo
echo "2) Flags"
echo "   Front  : VITE_MISSION_PAYMENTS=true"
echo "   Functions : MISSION_PAYMENTS_ENABLED=true"
echo
echo "3) Deploy Functions Connect"
echo "   npx firebase-tools@13 deploy --project logicycle01 \\"
echo "     --only functions:createMissionConnectAccount,functions:createMissionConnectAccountLink,functions:createMissionPaymentCheckout,functions:stripeWebhook"
echo
echo "4) Parcours manuel"
echo "   Vacataire : Espace indép. → onboarding Express → statut payouts OK"
echo "   Équipe    : mission Pourvue → Payer la mission → carte 4242…"
echo "   Vérif     : Payment + Application fee + transfer (Dashboard TEST)"
echo
echo "État flags locaux :"
if [[ -f "$FRONT_ENV" ]] && grep -qE '^VITE_MISSION_PAYMENTS=true' "$FRONT_ENV"; then
  echo "  .env              : VITE_MISSION_PAYMENTS=true"
else
  echo "  .env              : VITE_MISSION_PAYMENTS non activé (matching-only UI)"
fi
if [[ -f "$FRONT_PROD" ]] && grep -qE '^VITE_MISSION_PAYMENTS=true' "$FRONT_PROD"; then
  echo "  .env.production   : VITE_MISSION_PAYMENTS=true ⚠ vérifier intention go-live"
else
  echo "  .env.production   : paiement missions non activé (attendu soft-launch)"
fi
if [[ -f "$ENVF" ]] && grep -qE '^MISSION_PAYMENTS_ENABLED=true' "$ENVF"; then
  echo "  functions env     : MISSION_PAYMENTS_ENABLED=true"
else
  echo "  functions env     : MISSION_PAYMENTS_ENABLED non trouvé / false"
fi
echo
echo "Soft-launch public = matching only. Go-live Connect = P2 GO_LIVE + bump légal."
