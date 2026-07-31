# Checklist go-live LogiCycle

Checklist opérationnelle pour un lancement **payant**. Cocher avant d’ouvrir les inscriptions commerciales.

> **État session 31/07/2026 (soir)**  
> Préflight local : `./scripts/preflight-soft-launch.sh` → **6 OK / 3 WARN / 0 FAIL**.  
> Stripe compte = **TEST** (`environnement de test Logicycle SAS`) — 6 produits actifs (Club→Performance + Athlete/Staff).  
> Prod Netlify (`logicycle2.netlify.app`) = encore **login** (landing locale pas déployée).  
> WARN restants : Sentry DSN, identité éditeur (K-bis), deploy landing.

## P0 — Bloquants

### Identité & légal
- [ ] Remplir `legal/meta.ts` : SIREN, SIRET, TVA, siège, directeur de publication (valeurs K-bis uniquement)
- [ ] Relire pack légal (`legal/*`, version `LEGAL_PACK_VERSION`) avec un avocat
- [ ] Confirmer boîtes mail `contact@`, `support@`, `privacy@` (domaine figé)

### Domaines & auth
- [ ] Domaine prod unique (ex. `logicycle.fr` / app) + redirects HTTPS
- [ ] Firebase Auth : domaines autorisés + Email link activé
- [x] `ALLOWED_APP_ORIGINS` présent (functions) — **à réaligner** si domaine change
- [ ] **Déployer** la build courante (landing + legal pack + FAQ) sur Netlify

### Stripe
- [x] Price IDs **test** complets (12 prices) dans `functions/.env.logicycle01`
- [x] Produits Stripe test présents (Club, Competition, Elite, Performance, Athlete, Staff)
- [ ] Compte Stripe **Live** activé
- [ ] Secrets Functions live : `STRIPE_SECRET_KEY` (`sk_live_…`), `STRIPE_WEBHOOK_SECRET`
- [ ] Price IDs **live** dans l’env Functions
- [ ] Webhook live → `stripeWebhook`
- [ ] Parcours réel testé : signup → essai → carte `4242…` (TEST) puis Live
- [x] `.env.production` sans `VITE_SKIP_SIGNUP_PAYMENT`

### Ops
- [ ] Backup Firestore planifié + procédure restore testée une fois
- [ ] `./scripts/smoke-production.sh` vert sur l’URL prod
- [ ] Rollback Netlify / Functions documenté (qui fait quoi en &lt; 15 min)

## P1 — Fortement recommandé

### Monitoring
- [ ] `VITE_SENTRY_DSN` + `VITE_APP_VERSION` dans le build Netlify prod
- [ ] Alerte healthz / budgets Firebase (email fondateur)
- [ ] Tester une erreur volontaire → event Sentry **sans** e-mail utilisateur

### Produit / vente
- [x] Landing FR/EN + FAQ + matching-only marketplace (**code local** — await deploy)
- [x] FAQ / support in-app (`Paramètres → Aide`)
- [x] Marketplace annoncée matching-only
- [ ] 2–3 clients pilotes prêts à payer

### RGPD ops
- [ ] Registre des traitements (même brouillon interne)
- [ ] Test export + purge compte sur un user de test
- [ ] Consent scouting documenté

### TVA
- [ ] Décision : Stripe Tax **ou** process manuel facturation UE

## P2 — Peut attendre post-lancement

- [ ] Stripe Connect + `MISSION_MARKETPLACE_MODE.paymentsEnabled = true` + bump légal
- [ ] Stores iOS / Android (Capacitor)
- [ ] Intégrations perf hors Nolio
- [ ] Environnement staging Firebase séparé
- [ ] Bandeau consentement analytics (seulement si outil d’audience ajouté)

## Commandes ce soir

```bash
./scripts/preflight-soft-launch.sh
npm run build
# puis deploy Netlify / push main selon votre flux
./scripts/smoke-production.sh
```

Test paiement TEST : carte `4242 4242 4242 4242`, date future, CVC quelconque.

## Références repo

| Fichier | Rôle |
|---------|------|
| `legal/meta.ts` | Identité éditeur |
| `constants/missionMarketplace.ts` | Flag paiement missions |
| `services/monitoring.ts` | Sentry |
| `scripts/preflight-soft-launch.sh` | Préflight local |
| `scripts/complete-production-deploy.sh` | Déploiement + rappels |
| `data/ceoLaunchPlan.ts` | Pilotage J-90 in-app |
