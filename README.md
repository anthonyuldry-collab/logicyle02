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
| `VITE_SENTRY_DSN` | Sentry (prod uniquement) |
| `VITE_APP_VERSION` | Release Sentry / cache-bust |
| Secrets Functions | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Price IDs |

## Marketplace missions

Mode actuel : **matching only** (`MISSION_MARKETPLACE_MODE.paymentsEnabled = false`).

Publier / postuler / accepter fonctionne. Paiement & commission Stripe Connect : **non activés** (textes légaux alignés).

## Déploiement

```bash
./scripts/complete-production-deploy.sh   # Firebase + smoke + rappels Stripe live
./scripts/smoke-production.sh            # Healthcheck post-deploy
```

Checklist opérationnelle : [`docs/GO_LIVE_CHECKLIST.md`](docs/GO_LIVE_CHECKLIST.md)

## Support

- Produit : `support@logicycle.fr`
- Privacy : `privacy@logicycle.fr`
- Contact : `contact@logicycle.fr`
