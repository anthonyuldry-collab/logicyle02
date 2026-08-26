# Checklist go-live rovik

Checklist opérationnelle pour un lancement **payant**.

> **Dossier unique à cocher** : [`lancement/`](../lancement/README.md) (fiches 01–09 + templates).  
> **État 31/07/2026 (soir)**  
> Domaine **https://logicycle.app** live · Smoke prod **9 OK / 0 FAIL** · Functions Stripe redéployées avec `ALLOWED_APP_ORIGINS` · Sentry DSN en `.env.production` · Auth domaines OK.  
> Stripe = encore **TEST**. Identité éditeur = **placeholders K-bis**. MX `@logicycle.app` = **pas encore configurés**.  
> Rebrand **rovik** dans le code (26/08/2026) — à déployer : `lancement/08-deploy-rebrand.md`.

## P0 — Bloquants restants

### Identité & légal
- [ ] Remplir `legal/meta.ts` : SIREN, SIRET, TVA, siège (valeurs K-bis uniquement — **ne pas inventer**)
- [ ] Relire pack légal (`legal/*`, version `LEGAL_PACK_VERSION`) avec un avocat
- [ ] Boîtes mail `contact@` / `support@` / `privacy@` — guide : [EMAIL_FORWARDING.md](./EMAIL_FORWARDING.md)

### Domaines & auth
- [x] Domaine prod : **logicycle.app**
- [x] HTTPS Netlify (`logicycle.app` + `www`)
- [x] Firebase Auth : domaines autorisés
- [x] `ALLOWED_APP_ORIGINS` + **redeploy** Functions Stripe
- [x] Build courante live (landing / legal / FAQ) — smoke 31/07 OK

### Stripe
- [x] Price IDs **test** présents (à **recréer** aux montants 59/119/199/349 — voir `COMMERCIAL_OFFER.md`)
- [x] Produits Stripe test présents (Club→Performance + Athlete/Staff)
- [ ] Compte Stripe **Live** activé (KYC)
- [ ] Secrets Functions live : `STRIPE_SECRET_KEY` (`sk_live_…`), `STRIPE_WEBHOOK_SECRET`
- [ ] Price IDs **live** alignés sur `docs/COMMERCIAL_OFFER.md`
- [ ] Webhook live → `stripeWebhook`
- [x] Parcours TEST signup → Checkout (`4242…`) validé antérieurement *(re-tester après nouveaux Price IDs)*
- [x] `.env.production` sans `VITE_SKIP_SIGNUP_PAYMENT`

### Ops
- [ ] Backup Firestore planifié + restore testé une fois — procédure : [OPS_RUNBOOK.md](./OPS_RUNBOOK.md)
- [x] `./scripts/smoke-production.sh` vert sur https://logicycle.app (31/07)
- [x] Rollback Netlify / Functions documenté ([OPS_RUNBOOK.md](./OPS_RUNBOOK.md))

## P1 — Fortement recommandé

### Monitoring
- [x] `VITE_SENTRY_DSN` + `VITE_APP_VERSION` en `.env.production`
- [ ] Alerte budgets Firebase / healthz (email fondateur)
- [ ] Tester une erreur volontaire → event Sentry **sans** e-mail utilisateur

### Produit / vente
- [x] Landing FR/EN + FAQ + matching-only marketplace (déployé)
- [x] FAQ / support in-app
- [x] Stripe Connect **TEST** (onboarding + checkout destination + commission 12 %) — [STRIPE_CONNECT_MISSIONS_TEST.md](./STRIPE_CONNECT_MISSIONS_TEST.md) *(flags off en soft-launch)*
- [x] ERP lean · devis / facture / SEPA smoke — [ERP_LEAN_SMOKE.md](./ERP_LEAN_SMOKE.md) · `./scripts/erp-lean-smoke.sh` + E2E P2 `./scripts/erp-lean-e2e-continental.sh`
- [x] Rules Firestore/Storage ERP lean déployées (`teamSepaSecretOk` / `privateConfig/sepa`) — 2026-08-02
- [ ] 2–3 clients pilotes prêts à payer

### RGPD ops
- [x] Registre des traitements — [RGPD_REGISTRE.md](./RGPD_REGISTRE.md) (v2026-08-01, finalité scouting + Connect missions)
- [x] Consent scouting documenté — [RGPD_SCOUTING_CONSENT.md](./RGPD_SCOUTING_CONSENT.md) (preuve Firestore + retrait in-app)
- [ ] Test export + purge compte sur un user de test

### TVA
- [x] Décision soft-launch documentée : **pas de Stripe Tax** tant que société / registrations non prêtes ; activer Stripe Tax post K-bis — [OPS_RUNBOOK.md](./OPS_RUNBOOK.md)

## P2 — Post-lancement

- [ ] Stripe Connect **prod** : `VITE_MISSION_PAYMENTS=true` + `MISSION_PAYMENTS_ENABLED=true` + bump légal (`LEGAL_PACK_VERSION`)
- [ ] Remplir `LEGAL_ENTITY` via env `VITE_LEGAL_*` / `LOGICYCLE_*` post K-bis — factures équipe sans watermark provisoire
- [ ] Déployer functions missions (+ flags Connect) — rules/indexes/storage ERP déjà live 2026-08-02
- [ ] Assigner rôles **Comptable** / **Trésorier** aux users finance (permissionRole)
- [ ] Webhook Live : events missions (`expired`, `payment_failed`, `charge.refunded`)
- [ ] (Optionnel) `RESEND_API_KEY` + `RESEND_FROM` pour emails PDF auto
- [ ] `./scripts/check-mission-invoices-ready.sh`
- [ ] Stores iOS / Android (Capacitor)
- [ ] Staging Firebase séparé
- [ ] Bandeau analytics (si outil d’audience ajouté)

## Commandes

```bash
./scripts/lancement-prochaines-etapes.sh
./scripts/preflight-soft-launch.sh
./scripts/smoke-production.sh https://logicycle.app
./scripts/erp-lean-smoke.sh
```

Test paiement TEST : `4242 4242 4242 4242`.

## Références

| Fichier | Rôle |
|---------|------|
| `lancement/` | **Dossier unique à faire avant lancement** |
| `legal/meta.ts` | Identité éditeur |
| `docs/COMMERCIAL_OFFER.md` | Grille, tunnel CA, fondateurs, Stripe prices |
| `docs/OPS_RUNBOOK.md` | Backup, rollback, Stripe Live, TVA |
| `docs/EMAIL_FORWARDING.md` | Mails @logicycle.app |
| `docs/RGPD_REGISTRE.md` | Registre traitements |
| `docs/RGPD_SCOUTING_CONSENT.md` | Preuve & retrait consentement scouting |
| `docs/RGPD_WATCHLIST_LIA.md` | Balancing test watchlist (art. 6.1.f) |
| `docs/STRIPE_CONNECT_MISSIONS_TEST.md` | Connect TEST marketplace missions |
| `docs/ERP_LEAN_SMOKE.md` | Smoke devis → facture → SEPA (pain.001 / 008) |
| `docs/MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md` | Cadre fiscal / social (indépendant vs CDD) |
| `constants/missionMarketplace.ts` | Flag / commission / éligibilité Connect |
| `constants/subscriptionPlans.ts` | Prix & caps plans |
| `scripts/preflight-soft-launch.sh` | Préflight local |
| `scripts/complete-production-deploy.sh` | Déploiement + rappels |
