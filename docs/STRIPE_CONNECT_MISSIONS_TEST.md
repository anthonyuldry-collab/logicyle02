# Stripe Connect — Marketplace missions (TEST)

Parcours **TEST** : publication → matching → onboarding vacataire → paiement équipe → commission LogiCycle **12 %** (10 % plan Pro / Performance).

> Soft-launch public reste en **matching only**.  
> Ne pas activer en prod sans bump légal (`LEGAL_PACK_VERSION`) + cases P2 de [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md).

## Architecture

| Élément | Choix |
|---------|--------|
| Comptes | Accounts **v2** · `configuration.recipient` · Express |
| Responsabilités | `fees_collector: application` · `losses_collector: application` |
| Charge | Destination + `application_fee_amount` |
| Commission | `computeMissionCommissionEur` — min 15 € · max 450 € |

Constantes : [`constants/missionMarketplace.ts`](../constants/missionMarketplace.ts)  
Functions : `createMissionConnectAccount`, `createMissionConnectAccountLink`, `createMissionPaymentCheckout`, webhook `kind=mission_payment`

## Prérequis Dashboard Stripe (TEST)

1. Compte Stripe en mode **Test**
2. Activer **Connect** (Settings → Connect) — plateforme marketplace
3. Vérifier que le webhook existant écoute `checkout.session.completed`  
   URL : `https://europe-west1-logicycle01.cloudfunctions.net/stripeWebhook`

## Flags d’activation TEST

| Côté | Variable | Valeur |
|------|----------|--------|
| Front (local / staging) | `VITE_MISSION_PAYMENTS` | `true` |
| Functions | `MISSION_PAYMENTS_ENABLED` | `true` |

Exemple local (`.env`) :

```bash
VITE_MISSION_PAYMENTS=true
```

Functions (secret / env param) :

```bash
# Via .env.logicycle01 ou firebase functions:config / secrets params
MISSION_PAYMENTS_ENABLED=true
```

Redeploy après changement Functions :

```bash
npx firebase-tools@13 deploy --project logicycle01 \
  --only functions:createMissionConnectAccount,functions:createMissionConnectAccountLink,functions:createMissionPaymentCheckout,functions:stripeWebhook
```

Sans ces flags, les callables renvoient `failed-precondition` et l’UI affiche le bandeau matching-only.

## Parcours de test manuel

### A. Vacataire (profil indépendant Staff)

1. Compte indépendant Staff + abo actif (essai OK)
2. Espace Indépendant → **Activer les paiements missions (Stripe)**
3. Compléter l’onboarding Express TEST (identité / IBAN fictifs Stripe)
4. Revenir sur l’app (`?connect=return`) → **Vérifier le statut** jusqu’à « Paiements missions activés »

### B. Équipe (manager)

1. Publier une mission avec **tarif journalier** (ex. 150 €) et dates
2. Faire postuler le vacataire (ou candidature manuelle) → pipeline → **Accepté(e)** (statut Pourvu)
3. Suivi candidatures → **Payer la mission**
4. Checkout Stripe carte TEST `4242 4242 4242 4242`
5. Vérifier `mission.payment.status === 'paid'` (Firestore + UI)
6. Télécharger **facture équipe** + **modèle vacataire** (PDF) depuis le suivi candidatures / Offres & Missions

### C. Vérifs Dashboard Stripe TEST

- **Payments** : charge du GMV
- **Application fees** : commission (ex. 99 € sur 825 €)
- **Transfers** vers le compte Connect du vacataire
- Metadata session : `kind=mission_payment`, `teamId`, `missionId`

## Checklist script

```bash
./scripts/stripe-connect-missions-checklist.sh
```

## Go-live marketplace (hors scope TEST)

1. Valider doctrine fiscale/sociale avec avocat — [MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md](./MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md)
2. `VITE_MISSION_PAYMENTS=true` en `.env.production` + `MISSION_PAYMENTS_ENABLED=true`
3. Relire / bumper CGU · CGV (`LEGAL_PACK_VERSION`) — chaîne factures MoR
4. Cocher P2 dans [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md)
5. Connect Live + KYC plateforme
6. PDF factures in-app + archives JSON Storage + FEC missions + rôles comptable/trésorier — **livré** (email PDF binaire = optionnel post SMTP)
7. Events webhook Live missions : `checkout.session.completed|expired`, `payment_intent.payment_failed`, `charge.refunded`

## Régime Connect

Uniquement missions **Vacataire (Facture)** / **Montant fixe**. CDD / salariat = matching only (employeur = équipe).

## Références

- Cadre fiscal & social : [`MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md`](./MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md)
- BP commissions : [`business-plan/marketplace-missions-commissions.md`](../business-plan/marketplace-missions-commissions.md)
- Abonnements Stripe : [`COMMERCIAL_OFFER.md`](./COMMERCIAL_OFFER.md) · [`OPS_RUNBOOK.md`](./OPS_RUNBOOK.md)
