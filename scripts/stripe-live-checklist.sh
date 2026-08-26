#!/usr/bin/env bash
# Affiche la checklist Stripe (TEST puis Live) — ne bascule rien automatiquement.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVF="$ROOT/functions/.env.logicycle01"

echo "==> Stripe — alignement prix rovik (TTC / prix final)"
echo "    Offre : docs/COMMERCIAL_OFFER.md"
echo
echo "Montants cibles (TTC) :"
echo "  Club          99 €/mois ·  990 €/an"
echo "  Compétition  249 €/mois · 2490 €/an"
echo "  Élite        399 €/mois · 3990 €/an"
echo "  Performance  790 €/mois · 7900 €/an"
echo "  Athlète       12 €/mois ·  120 €/an  (inchangé)"
echo "  Staff         15 €/mois ·  150 €/an  (inchangé)"
echo
echo "TEST (immédiat) :"
echo "  0) STRIPE_SECRET_KEY=sk_test_… ./scripts/stripe-create-refined-prices.sh"
echo "  1) Vérifier Price IDs dans functions/.env.logicycle01"
echo "  2) Redeploy createStripeCheckout, createStripePortal, stripeWebhook"
echo "  3) Checkout TEST carte 4242… — vérifier le montant affiché (+ coupon fondateur si annuel)"
echo
echo "LIVE (après KYC) :"
echo "  1) Activer mode Live"
echo "  2) STRIPE_SECRET_KEY=sk_live_… ./scripts/stripe-create-refined-prices.sh"
echo "  3) Webhook → https://europe-west1-logicycle01.cloudfunctions.net/stripeWebhook"
echo "  4) firebase functions:secrets:set STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET"
echo "  5) Remplacer Price IDs + redeploy"
echo "  6) ./scripts/smoke-production.sh https://logicycle.app"
echo
if [[ -f "$ENVF" ]]; then
  echo "Price IDs dans .env.logicycle01 :"
  grep -E '^STRIPE_PRICE_' "$ENVF" | sed 's/=.*/=…/' || true
fi
echo
echo "Détail : docs/COMMERCIAL_OFFER.md · docs/OPS_RUNBOOK.md"
