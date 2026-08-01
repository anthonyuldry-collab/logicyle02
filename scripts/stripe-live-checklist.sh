#!/usr/bin/env bash
# Affiche la checklist Stripe (TEST puis Live) — ne bascule rien automatiquement.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENVF="$ROOT/functions/.env.logicycle01"

echo "==> Stripe — alignement prix LogiCycle (TTC / prix final)"
echo "    Offre : docs/COMMERCIAL_OFFER.md"
echo
echo "Montants cibles (TTC) :"
echo "  Club          59 €/mois ·  590 €/an"
echo "  Compétition  119 €/mois · 1190 €/an"
echo "  Élite        199 €/mois · 1990 €/an"
echo "  Performance  349 €/mois · 3490 €/an"
echo "  Athlète       12 €/mois ·  120 €/an  (inchangé)"
echo "  Staff         15 €/mois ·  150 €/an  (inchangé)"
echo
echo "TEST (immédiat) :"
echo "  1) Dashboard Stripe TEST → créer/mettre à jour les Prices aux montants ci-dessus"
echo "  2) Coller price_… dans functions/.env.logicycle01"
echo "  3) Redeploy createStripeCheckout, createStripePortal, stripeWebhook"
echo "  4) Checkout TEST carte 4242… — vérifier le montant affiché"
echo
echo "LIVE (après KYC) :"
echo "  1) Activer mode Live"
echo "  2) Recréer les mêmes Prices en Live"
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
