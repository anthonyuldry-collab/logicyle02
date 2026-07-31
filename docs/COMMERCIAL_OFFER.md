# Offre commerciale LogiCycle — source de vérité

> **M1** = décembre 2026 · Prix **HT** · Annuel = **10 mois** (−16,7 %) · Version 2026-07-31  
> Code produit : [`constants/subscriptionPlans.ts`](../constants/subscriptionPlans.ts)

## Grille publique

| Plan | Mensuel | Annuel | Users | Events/saison | Essai |
|------|--------:|-------:|------:|--------------:|------:|
| Club | 59 € | 590 € | 30 | 35 | 14 j |
| Compétition | 119 € | 1 190 € | 50 | 100 | 14 j |
| Élite *(highlight)* | 199 € | 1 990 € | 80 | ∞ | 30 j |
| Performance | 349 € | 3 490 € | 150 | ∞ | 30 j |
| Fédération | devis dès 499 € | devis | ∞ | ∞ | devis |
| Athlète (indép.) | 12 € | 120 € | 1 | — | 14 j |
| Staff (indép.) | 15 € | 150 € | 1 | — | 14 j |

**Indépendants** : prix bas volontaire jusqu’à Connect / paiements missions (**revisiter M18**).

Roadmap (hors self-serve immédiat) : Coach 29/290 · Coach Pro 79/790 · Centre altitude dès 499 €/mois · pack saison 2 990–4 990 €.

## Politique CA

- **Seul discount public** : parrainage −10 % 1ʳᵉ année (filleul) / +1 mois (parrain, max 3 crédits).
- **Pas de −30 %** · extension essai &gt;30 j = devis écrit uniquement.
- **Fin d’essai** → push **annuel** (2 mois offerts) ou churn.
- **Prix fondateurs (M1–M6)** : souscription **annuelle** avant juin 2027 → tarif figé **24 mois** (suivi manuel Stripe / CRM).

## Marketplace (quand `paymentsEnabled`)

| Plan | Commission GMV | Publication missions |
|------|----------------|----------------------|
| Compétition | 12 % | non (matching côté équipe via upsell Élite) |
| Élite | 12 % | **oui** |
| Performance | **10 %** | oui |
| Min / max | 15 € · 450 € | — |

## Tunnel de ventes

```
Landing → Tarifs (annuel par défaut)
  ├─ Club / Compétition / Indép. → Signup PLG → Stripe essai → Close annuel
  └─ Élite / Performance / Fédération → « Parler à l’équipe » (+ essai 30 j self-serve possible)
Activation essai : 1 course loggée OU 3 scouting OU 1 mission publiée (Élite+)
Upsell : Club → Compétition via camp/wellness
```

## Stripe — checklist montants

Les **Price IDs** dans `functions/.env.logicycle01` doivent correspondre aux montants ci-dessus.

1. Stripe Dashboard **TEST** → Products : mettre à jour (ou créer) prices  
   Club 59/590 · Compétition 119/1190 · Élite 199/1990 · Performance 349/3490 · Athlète 12/120 · Staff 15/150  
2. Coller les `price_…` dans `functions/.env.logicycle01`  
3. `npx firebase-tools@13 deploy --project logicycle01 --only functions:createStripeCheckout,functions:createStripePortal,functions:stripeWebhook`  
4. Tester checkout TEST (carte `4242…`)  
5. Au Live : mêmes montants + nouveaux Price IDs live — voir `scripts/stripe-live-checklist.sh`

**Attention** : tant que les Price IDs TEST ne sont pas recréés, l’UI affiche la nouvelle grille mais Stripe facture encore les anciens montants.

## Références

- Tunnel ops : [`OPS_RUNBOOK.md`](./OPS_RUNBOOK.md)  
- Checklist go-live : [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md)  
- BP : [`../business-plan/grille-tarifaire.md`](../business-plan/grille-tarifaire.md) · [`../business-plan/strategie-commerciale.md`](../business-plan/strategie-commerciale.md)
