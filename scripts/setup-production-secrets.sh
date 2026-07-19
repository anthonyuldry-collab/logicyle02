#!/usr/bin/env bash
# Setup one-shot des secrets production (GitHub + Firebase).
# Prérequis : `gh auth login` et `firebase login` déjà faits dans ce terminal.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
REPO="${GITHUB_REPO:-anthonyuldry-collab/logicyle02}"
PROJECT="${FIREBASE_PROJECT:-logicycle01}"

echo "==> Repo GitHub: $REPO"
echo "==> Projet Firebase: $PROJECT"

gh auth status >/dev/null
firebase projects:list --project "$PROJECT" >/dev/null

# --- GitHub : VITE_* depuis .env ---
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

for key in \
  VITE_FIREBASE_API_KEY \
  VITE_FIREBASE_AUTH_DOMAIN \
  VITE_FIREBASE_PROJECT_ID \
  VITE_FIREBASE_STORAGE_BUCKET \
  VITE_FIREBASE_MESSAGING_SENDER_ID \
  VITE_FIREBASE_APP_ID \
  VITE_FIREBASE_MEASUREMENT_ID \
  VITE_FIREBASE_VAPID_KEY \
  VITE_NOLIO_CLIENT_ID \
  VITE_SENTRY_DSN \
  VITE_GPS_WEBHOOK_URL
do
  val="${!key-}"
  if [[ -n "${val}" ]]; then
    printf '%s' "$val" | gh secret set "$key" --repo "$REPO"
    echo "OK GitHub secret $key"
  fi
done

# --- Netlify (optionnel) ---
if [[ -n "${NETLIFY_AUTH_TOKEN:-}" && -n "${NETLIFY_SITE_ID:-}" ]]; then
  printf '%s' "$NETLIFY_AUTH_TOKEN" | gh secret set NETLIFY_AUTH_TOKEN --repo "$REPO"
  printf '%s' "$NETLIFY_SITE_ID" | gh secret set NETLIFY_SITE_ID --repo "$REPO"
  echo "OK GitHub secrets Netlify"
else
  echo "SKIP Netlify — ajoute NETLIFY_AUTH_TOKEN et NETLIFY_SITE_ID dans l'env, ou lie le repo dans Netlify UI (deploy auto)."
fi

# --- Service account Firebase pour CI ---
SA_FILE="${FIREBASE_SERVICE_ACCOUNT_FILE:-}"
if [[ -z "$SA_FILE" ]]; then
  SA_FILE="$(ls -1 ./*firebase*adminsdk*.json ./*service-account*.json 2>/dev/null | head -1 || true)"
fi
if [[ -n "$SA_FILE" && -f "$SA_FILE" ]]; then
  gh secret set FIREBASE_SERVICE_ACCOUNT --repo "$REPO" < "$SA_FILE"
  echo "OK GitHub secret FIREBASE_SERVICE_ACCOUNT ($SA_FILE)"
else
  echo "SKIP FIREBASE_SERVICE_ACCOUNT — crée un compte de service GCP (rôle Firebase Admin),"
  echo "    télécharge le JSON, puis :"
  echo "    gh secret set FIREBASE_SERVICE_ACCOUNT --repo $REPO < ./ton-fichier.json"
fi

# --- Secrets Cloud Functions ---
prompt_secret() {
  local name="$1"
  local env_fallback="${2:-}"
  local val="${!env_fallback-}"
  if [[ -n "$val" ]]; then
    printf '%s' "$val" | firebase functions:secrets:set "$name" --project "$PROJECT" --data-file=-
    echo "OK Firebase secret $name (depuis env $env_fallback)"
    return
  fi
  if [[ "${SKIP_PROMPTS:-}" == "1" ]]; then
    echo "SKIP $name (SKIP_PROMPTS=1)"
    return
  fi
  echo -n "Valeur pour $name (Entrée pour ignorer) : "
  read -r -s typed
  echo
  if [[ -n "$typed" ]]; then
    printf '%s' "$typed" | firebase functions:secrets:set "$name" --project "$PROJECT" --data-file=-
    echo "OK Firebase secret $name"
  else
    echo "SKIP $name"
  fi
}

# GEMINI : réutilise la clé locale si présente
if [[ -n "${VITE_GEMINI_API_KEY:-}" ]]; then
  printf '%s' "$VITE_GEMINI_API_KEY" | firebase functions:secrets:set GEMINI_API_KEY --project "$PROJECT" --data-file=-
  echo "OK Firebase secret GEMINI_API_KEY"
else
  prompt_secret GEMINI_API_KEY
fi

prompt_secret STRIPE_SECRET_KEY STRIPE_SECRET_KEY
prompt_secret STRIPE_WEBHOOK_SECRET STRIPE_WEBHOOK_SECRET
prompt_secret NOLIO_CLIENT_ID NOLIO_CLIENT_ID
prompt_secret NOLIO_CLIENT_SECRET NOLIO_CLIENT_SECRET

echo
echo "Terminé. Secrets GitHub :"
gh secret list --repo "$REPO"
echo
echo "Déploie ensuite : firebase deploy --only functions --project $PROJECT"
echo "Smoke : ./scripts/smoke-production.sh"
