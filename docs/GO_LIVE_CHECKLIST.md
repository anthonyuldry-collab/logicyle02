# Checklist go-live LogiCycle

Checklist opérationnelle pour un lancement **payant**.

> **État 31/07/2026 (soir)**  
> Domaine **https://logicycle.app** live · Smoke prod **9 OK / 0 FAIL** · Functions Stripe redéployées avec `ALLOWED_APP_ORIGINS` · Sentry DSN en `.env.production` · Auth domaines OK.  
> Stripe = encore **TEST** (`environnement de test Logicycle SAS`).  
> Identité éditeur = **placeholders K-bis**. MX `@logicycle.app` = **pas encore configurés**.

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
- [x] Price IDs **test** + produits test
- [ ] Compte Stripe **Live** activé (KYC)
- [ ] Secrets Functions live : `STRIPE_SECRET_KEY` (`sk_live_…`), `STRIPE_WEBHOOK_SECRET`
- [ ] Price IDs **live** dans `functions/.env.logicycle01`
- [ ] Webhook live → `stripeWebhook`
- [x] Parcours TEST signup → Checkout (`4242…`) validé antérieurement
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
- [ ] 2–3 clients pilotes prêts à payer

### RGPD ops
- [x] Registre des traitements brouillon — [RGPD_REGISTRE.md](./RGPD_REGISTRE.md)
- [ ] Test export + purge compte sur un user de test
- [ ] Consent scouting documenté

### TVA
- [x] Décision soft-launch documentée : **pas de Stripe Tax** tant que société / registrations non prêtes ; activer Stripe Tax post K-bis — [OPS_RUNBOOK.md](./OPS_RUNBOOK.md)

## P2 — Post-lancement

- [ ] Stripe Connect + `MISSION_MARKETPLACE_MODE.paymentsEnabled = true` + bump légal
- [ ] Stores iOS / Android (Capacitor)
- [ ] Staging Firebase séparé
- [ ] Bandeau analytics (si outil d’audience ajouté)

## Commandes

```bash
./scripts/preflight-soft-launch.sh
./scripts/smoke-production.sh https://logicycle.app
```

Test paiement TEST : `4242 4242 4242 4242`.

## Références

| Fichier | Rôle |
|---------|------|
| `legal/meta.ts` | Identité éditeur |
| `docs/OPS_RUNBOOK.md` | Backup, rollback, Stripe Live, TVA |
| `docs/EMAIL_FORWARDING.md` | Mails @logicycle.app |
| `docs/RGPD_REGISTRE.md` | Registre traitements (brouillon) |
| `constants/missionMarketplace.ts` | Flag paiement missions |
| `scripts/preflight-soft-launch.sh` | Préflight local |
| `scripts/complete-production-deploy.sh` | Déploiement + rappels |
