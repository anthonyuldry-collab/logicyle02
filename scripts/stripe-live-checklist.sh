#!/usr/bin/env bash
# Affiche la checklist Stripe Live (ne bascule rien automatiquement).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVF="$ROOT/functions/.env.logicycle01"

echo "==> Stripe Live — actions manuelles (compte actuel = TEST)"
echo
echo "Dashboard : https://dashboard.stripe.com"
echo "Compte MCP : environnement de test Logicycle SAS"
echo
echo "1) Activer / basculer en mode Live + KYC société"
echo "2) Créer les mêmes produits/prices qu’en TEST"
echo "3) Webhook Live → https://europe-west1-logicycle01.cloudfunctions.net/stripeWebhook"
echo "4) firebase functions:secrets:set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET"
echo "5) Remplacer les Price IDs dans functions/.env.logicycle01"
echo "6) Redeploy createStripeCheckout, createStripePortal, stripeWebhook"
echo "7) ./scripts/smoke-production.sh https://logicycle.app"
echo
if [[ -f "$ENVF" ]]; then
  echo "Price IDs TEST actuels :"
  grep -E '^STRIPE_PRICE_' "$ENVF" | sed 's/=.*/=…/' || true
fi
echo
echo "Détail : docs/OPS_RUNBOOK.md"
