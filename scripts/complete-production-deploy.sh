#!/usr/bin/env bash
# Finalise le déploiement production autant que possible en local (Firebase + smoke).
# Prérequis : firebase login, gh auth login.
# Optionnel : NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID, FIREBASE_SERVICE_ACCOUNT_FILE.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${FIREBASE_PROJECT:-logicycle01}"
REPO="${GITHUB_REPO:-anthonyuldry-collab/logicyle02}"

echo "==> 1/4 Secrets GitHub / Firebase (si disponibles)"
if [[ -x ./scripts/setup-production-secrets.sh ]]; then
  # Non interactif : ignore les prompts manquants
  SKIP_PROMPTS=1 ./scripts/setup-production-secrets.sh || true
else
  echo "Script setup-production-secrets.sh introuvable — skip"
fi

echo
echo "==> 2/4 Déploiement Firebase (rules + indexes + storage + functions billing/health)"
npx firebase-tools@13 deploy \
  --project "$PROJECT" \
  --only firestore:rules,firestore:indexes,storage,functions:healthz,functions:createStripeCheckout,functions:createStripePortal,functions:stripeWebhook \
  --force \
  --non-interactive

echo
echo "==> 3/4 Smoke production"
chmod +x ./scripts/smoke-production.sh
./scripts/smoke-production.sh

echo
echo "==> 4/4 Rappel go-live Stripe (manuel)"
cat <<'EOF'
Stripe est en MODE TEST. Pour passer en live :
  1. Dashboard Stripe → activer le compte / mode Live
  2. firebase functions:secrets:set STRIPE_SECRET_KEY   (sk_live_…)
  3. firebase functions:secrets:set STRIPE_WEBHOOK_SECRET (whsec live)
  4. Recréer les Price IDs live dans functions/.env.logicycle01
  5. Webhook live → https://europe-west1-logicycle01.cloudfunctions.net/stripeWebhook
  6. Redeploy functions:createStripeCheckout,createStripePortal,stripeWebhook
  7. ./scripts/smoke-production.sh

CI GitHub encore optionnelle :
  - NETLIFY_AUTH_TOKEN + NETLIFY_SITE_ID (sinon Netlify Git suffit)
  - FIREBASE_SERVICE_ACCOUNT (JSON compte de service) pour deploy Functions depuis Actions
EOF

echo
echo "Déploiement production finalisé (test mode)."
