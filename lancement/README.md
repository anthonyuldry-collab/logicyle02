# Dossier avant lancement — rovik

> **Cible** : go-live commercial **décembre 2026 (M1)** · premiers clients **payants**.  
> **Aujourd’hui** : le produit est démo-ready ; encaisser exige société + Stripe Live + mails.  
> **Règle** : ne jamais inventer SIREN / SIRET / siège. Coller uniquement le K-bis.

Ce dossier est la **liste unique** de ce qu’il reste à faire **hors code**.  
Le logiciel (wedge ops, landing, tarifs, pack légal draft) est déjà dans le repo.

## Ordre (ne pas inverser 1 → 3)

| # | Fiche | Qui | Durée typique |
|---|--------|-----|----------------|
| 1 | [01-societe-kbis.md](./01-societe-kbis.md) | Toi + avocat + greffe | 2–6 semaines |
| 2 | [02-marque-et-domaines.md](./02-marque-et-domaines.md) | Toi + avocat PI | 1–3 semaines (dépôt) |
| 3 | [03-stripe-live.md](./03-stripe-live.md) | Toi (après K-bis) | 1–5 jours KYC |
| 4 | [04-emails-et-dns.md](./04-emails-et-dns.md) | Toi · DNS | 10 min + propagation |
| 5 | [05-avocat-legal.md](./05-avocat-legal.md) | Avocat lots B+C | 2–4 semaines |
| 6 | [06-ops-backup-monitoring.md](./06-ops-backup-monitoring.md) | Toi · GCP | 1 h |
| 7 | [07-pilotes-commerciaux.md](./07-pilotes-commerciaux.md) | Toi · terrain | sept.–nov. |
| 8 | [08-deploy-rebrand.md](./08-deploy-rebrand.md) | Toi · Netlify | 30 min |
| 9 | [09-go-nogo.md](./09-go-nogo.md) | Toi (visa) | 1 réunion |
| 10 | [10-checkout-test.md](./10-checkout-test.md) | Toi · Stripe | 10 min |

Checklist cochable : **[CHECKLIST.md](./CHECKLIST.md)**  
Templates : **[templates/](./templates/)**

```bash
./scripts/lancement-prochaines-etapes.sh
```

## Déjà fait (ne pas refaire)

- App locale + prod **https://logicycle.app** (HTTPS, Auth, smoke)
- Identité visuelle **rovik** dans le code (landing, login, PWA) — à **déployer** (fiche 08)
- Pack légal **draft** `#/legal/*` — à **faire relire** (fiche 05)
- Stripe **Live** grille raffinée : Club 99/990 · Compétition 249/2490 · Élite 399/3990 · Performance 790/7900 · Athlète 12/120 · Staff 15/150
- Coupon fondateur Live `rovik_founder_20_y1` (−20 % × 12 mois, max 20)
- Scripts outbound + pipeline + objections : [`templates/`](./templates/) · test checkout [`10-checkout-test.md`](./10-checkout-test.md)
- Marketplace = matching only (`VITE_MISSION_PAYMENTS` off) — voulu au M1
- Wedge `VITE_LAUNCH_MODE=ops` : Club = effectif + logistique

## Hors M1 (après les premiers paiements)

Stores iOS/Android · Stripe Connect missions · staging Firebase · Resend PDF · Stripe Tax.
