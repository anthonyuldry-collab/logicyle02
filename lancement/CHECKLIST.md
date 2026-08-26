# Checklist unique — avant d’ouvrir le paiement

Coche ici. Détail dans les fiches `01`–`09`.  
Statut produit : **démo OK** · paiement Live : **non**.

## P0 — Bloquant go-live payant

- [ ] **Société** — Statuts SASU relus, capital déposé, K-bis reçu ([01](./01-societe-kbis.md))
- [ ] **Identité éditeur** — `VITE_LEGAL_SIREN` / `SIRET` / siège collés depuis le K-bis (jamais inventés)
- [ ] **Marque** — Recherche antériorité **rovik** + dépôt INPI classes 9 / 35 / 42 ([02](./02-marque-et-domaines.md))
- [ ] **Domaines** — `rovik.app` · `rovik.com` · `rovik.fr` · `rovik.eu` (et typos) achetés ou notés indisponibles
- [x] **Stripe Live** — Price IDs grille raffinée + coupon fondateur (vérif API 2026-08-26) · webhook / KYC à confirmer toi ([03](./03-stripe-live.md) · [10](./10-checkout-test.md))
- [ ] **Price IDs TEST** alignés sur 99 / 249 / 399 / 790 (sinon Stripe TEST facture l’ancienne grille)
- [ ] **Mails** — MX `contact@` `support@` `privacy@` reçoivent un test ([04](./04-emails-et-dns.md))
- [ ] **Avocat** — CGU / CGV / privacy / DPA / mentions relus et visa ([05](./05-avocat-legal.md))
- [ ] **Backup** — export Firestore planifié + **une** restauration testée ([06](./06-ops-backup-monitoring.md))
- [ ] **Pilotes** — 2–3 équipes avec carte ou devis signé ([07](./07-pilotes-commerciaux.md) · scripts dans `templates/`)
- [ ] **Rebrand prod** — front **rovik** déployé, smoke vert ([08](./08-deploy-rebrand.md))
- [ ] **Go / No-Go** — fiche 09 signée ([09](./09-go-nogo.md))
- [ ] **Checkout Live smoke** — tunnel Compétition annuel ([10](./10-checkout-test.md))

## P1 — Fortement recommandé avant M1

- [ ] Test export RGPD + purge sur un compte test
- [ ] Erreur volontaire → event Sentry (sans e-mail client)
- [ ] Alerte budget Firebase / healthz vers ta boîte
- [ ] Checkout TEST `4242…` après nouveaux Price IDs
- [ ] `./scripts/smoke-production.sh https://logicycle.app` (ou domaine rovik) vert
- [ ] Landing EN sans chaîne FR orpheline sur le tunnel vente

## P2 — Après les premiers clients

- [ ] `VITE_MISSION_PAYMENTS=true` seulement si fill rate + légal Connect OK
- [ ] Stripe Tax si assujetti TVA
- [ ] Stores Capacitor
- [ ] `RESEND_API_KEY` pour PDFs auto
