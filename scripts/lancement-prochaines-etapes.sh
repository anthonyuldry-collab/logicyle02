#!/usr/bin/env bash
# Affiche les prochaines étapes lancement + lance le préflight (sans déployer).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== rovik — prochaines étapes avant lancement ==="
echo "    Dossier : lancement/README.md"
echo "    Cible   : M1 décembre 2026 · paiement Live"
echo
echo "1. Société / K-bis          → lancement/01-societe-kbis.md"
echo "2. Marque + domaines rovik  → lancement/02-marque-et-domaines.md"
echo "3. Stripe Live (après K-bis)→ lancement/03-stripe-live.md"
echo "4. MX contact/support/privacy → lancement/04-emails-et-dns.md"
echo "5. Relire pack légal avocat → lancement/05-avocat-legal.md"
echo "6. Backup Firestore         → lancement/06-ops-backup-monitoring.md"
echo "7. 2–3 pilotes payants      → lancement/07-pilotes-commerciaux.md"
echo "8. Déployer le front rovik  → lancement/08-deploy-rebrand.md"
echo "9. Visa Go / No-Go          → lancement/09-go-nogo.md"
echo
echo "Mail avocat : lancement/templates/email-avocat.md"
echo "Checklist   : lancement/CHECKLIST.md"
echo

if [[ -x "$ROOT/scripts/preflight-soft-launch.sh" ]]; then
  echo "=== Préflight technique ==="
  "$ROOT/scripts/preflight-soft-launch.sh" || true
fi
