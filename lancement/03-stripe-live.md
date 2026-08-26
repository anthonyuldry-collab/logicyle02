# 03 — Stripe Live (abonnements)

Aujourd’hui : compte **TEST**. L’UI affiche la grille 2026 ; Live n’encaisse pas.  
KYC Stripe exige le **K-bis** (fiche 01).

Montants publics (TTC / prix final) — `docs/COMMERCIAL_OFFER.md` :

| Produit | Mensuel | Annuel (10 mois) |
|---------|--------:|-----------------:|
| Club | 99 € | 990 € |
| Compétition | 249 € | 2 490 € |
| Élite | 399 € | 3 990 € |
| Performance | 790 € | 7 900 € |
| Athlète | 12 € | 120 € |
| Staff | 15 € | 150 € |

## TEST (immédiat, avant Live)

1. Dashboard Stripe → mode **Test** → Products : créer/mettre à jour les prices ci-dessus.
2. Coller les `price_…` dans `functions/.env.logicycle01`.
3. `npx firebase-tools@13 deploy --project logicycle01 --only functions:createStripeCheckout,functions:createStripePortal,functions:stripeWebhook`
4. Inscription TEST carte `4242…` — **vérifier le montant** affiché Stripe = grille.

Sans cette étape, un client TEST paie encore d’**anciens** prix.

## LIVE (après KYC)

```bash
./scripts/stripe-live-checklist.sh
```

1. Activer le mode Live (identité société = K-bis).
2. Recréer **les mêmes** produits/prices en Live.
3. Webhook Live →  
   `https://europe-west1-logicycle01.cloudfunctions.net/stripeWebhook`  
   Events : `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.*`, `invoice.*`, `payment_intent.payment_failed`, `charge.refunded`
4. Secrets :
   ```bash
   firebase functions:secrets:set STRIPE_SECRET_KEY --project logicycle01
   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET --project logicycle01
   ```
5. Redeploy les 3 functions checkout / portal / webhook.
6. `.env.production` : **jamais** `VITE_SKIP_SIGNUP_PAYMENT=true`.
7. Smoke : `./scripts/smoke-production.sh https://logicycle.app`

Connect missions (`VITE_MISSION_PAYMENTS`) : **off** au M1.
