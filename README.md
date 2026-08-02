# LogiCycle

SaaS opérationnel pour équipes et clubs cyclistes : effectif, calendrier, logistique course, budget, performance, indépendants et marketplace de missions (matching).

## Stack

- **Frontend** : React + Vite + TypeScript + Tailwind
- **Backend** : Firebase (Auth, Firestore, Storage, Cloud Functions)
- **Billing** : Stripe Checkout / Customer Portal (abonnements)
- **Hosting** : Netlify (SPA) + Firebase Functions
- **Observabilité** : Sentry optionnel (`VITE_SENTRY_DSN`, prod only)

## Démarrage local

```bash
cp .env.example .env
# Renseigner les VITE_FIREBASE_* (projet Firebase)
npm install
npm run dev
```

Tests unitaires / typecheck :

```bash
npm test
npx tsc --noEmit
```

## Parcours public

| Vue | Accès |
|-----|--------|
| Landing marketing | `/` déconnecté |
| Connexion / Inscription | depuis la landing |
| Tarifs | landing → Voir les tarifs |
| Légal | `#/legal/{cgu\|cgv\|privacy\|dpa\|mentions\|cookies}` |

## Variables critiques

Voir `.env.example`. Points sensibles :

| Variable | Rôle |
|----------|------|
| `VITE_FIREBASE_*` | Client Firebase (obligatoire) |
| `VITE_SKIP_SIGNUP_PAYMENT` | **DEV only** — ignoré en build prod |
| `VITE_MISSION_PAYMENTS` | **TEST Connect** — active paiement marketplace missions |
| `VITE_SENTRY_DSN` | Sentry (prod uniquement) |
| `VITE_APP_VERSION` | Release Sentry / cache-bust |
| Secrets Functions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Price IDs |

## Marketplace missions

Mode soft-launch : **matching only** (paiement in-app off tant que `VITE_MISSION_PAYMENTS` n’est pas `true`).

Publier / postuler / accepter fonctionne.  
Stripe Connect TEST (destination + commission 12 %) : doc [`docs/STRIPE_CONNECT_MISSIONS_TEST.md`](docs/STRIPE_CONNECT_MISSIONS_TEST.md) · cadre fiscal/social [`docs/MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md`](docs/MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md) · `./scripts/stripe-connect-missions-checklist.sh`.

Connect = **prestataires indépendants uniquement** (pas CDD / paie).

| Variable | Rôle |
|----------|------|
| `VITE_MISSION_PAYMENTS` | Front — active UI paiement / onboarding Connect |
| `MISSION_PAYMENTS_ENABLED` | Functions — autorise les callables Connect |

## ERP lean (devis / facture / SEPA)

Smoke + E2E P2 : `./scripts/erp-lean-smoke.sh` · `./scripts/erp-lean-e2e-continental.sh`  
Doc [`docs/ERP_LEAN_SMOKE.md`](docs/ERP_LEAN_SMOKE.md) — `clientId` obligatoire, pain.008 bancable, SEPA en `privateConfig`.

## Déploiement

```bash
./scripts/complete-production-deploy.sh   # Firebase + smoke + rappels Stripe live
./scripts/smoke-production.sh            # Healthcheck post-deploy
```

Checklist opérationnelle : [`docs/GO_LIVE_CHECKLIST.md`](docs/GO_LIVE_CHECKLIST.md)  
Offre commerciale / CA : [`docs/COMMERCIAL_OFFER.md`](docs/COMMERCIAL_OFFER.md)  
Ops (backup / rollback / Stripe Live) : [`docs/OPS_RUNBOOK.md`](docs/OPS_RUNBOOK.md)  
Emails domaine : [`docs/EMAIL_FORWARDING.md`](docs/EMAIL_FORWARDING.md)

## Support

- Produit : `support@logicycle.app`
- Privacy : `privacy@logicycle.app`
- Contact : `contact@logicycle.app`
- Setup redirection : voir docs ci-dessus (MX pas encore configurés)
