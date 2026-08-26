# Offre commerciale Rovik — source de vérité

> **M1** = décembre 2026 · Prix **TTC** (montant final) · Annuel = **10 mois** (−16,7 %) · Version 2026-08-26  
> Code produit : [`constants/subscriptionPlans.ts`](../constants/subscriptionPlans.ts) · fondateurs : [`constants/founderOffer.ts`](../constants/founderOffer.ts)

## Affichage TTC

Les prix publics sont en **TTC / prix final** (ce qui est prélevé). Beaucoup de clubs / associations ne sont pas assujettis à la TVA : marquer « HT » créait une fausse attente de TVA en plus.  
Si Rovik devient assujetti, la facture détaillera la TVA ; le montant annoncé reste le prix commercial de référence soft-launch.

## Grille publique

| Plan | Mensuel | Annuel | Users | Events/saison | Essai |
|------|--------:|-------:|------:|--------------:|------:|
| Club *(rampe, hors landing)* | 99 € | 990 € | 30 | 35 | 14 j |
| Compétition *(highlight / pack saison)* | 249 € | **2 490 €** | 50 | 100 | 14 j |
| Élite | 399 € | 3 990 € | 80 | ∞ | 30 j |
| Performance | 790 € | 7 900 € | 150 | ∞ | 30 j |
| Fédération | devis dès 990 € | devis | ∞ | ∞ | devis |
| Athlète (indép.) | 12 € | 120 € | 1 | — | 14 j |
| Staff (indép.) | 15 € | 150 € | 1 | — | 14 j |

**Indépendants** : prix bas volontaire jusqu’à Connect / paiements missions (**revisiter M18**).  
Hors narratif clubs / landing / outbound DS. Sur la page tarifs publiques : **lien discret** « Sans équipe ? Athlète / Staff » (section repliée). Pas d’offre fondateurs ni garantie première course.

Roadmap (hors self-serve immédiat) : Coach 29/290 · Coach Pro 79/790 · Centre altitude dès 499 €/mois · pack saison centres 2 990–4 990 €.

## Politique CA

- **Seul discount public** : parrainage −10 % 1ʳᵉ année (filleul) / +1 mois (parrain, max 3 crédits).
- **Pas de −30 %** · extension essai &gt;30 j = devis écrit uniquement.
- **Fin d’essai** → push **annuel** (2 mois offerts) ou churn.
- **Prix fondateurs** : **20** structures, annuel avant juin 2027 → **−20 % année 1** seulement, puis grille publique (pas de lock 24 mois). Compteur public · coupon Stripe / CRM manuel.
- **Garantie première course** (art. 3.1 CGV) : annuel équipe · 1re épreuve renseignée (effectif + transport ou hébergement + checklist) · si tableur repris sous 14 j → remboursement de l’année. Une fois / structure. Pas pour clubs sans calendrier course. **À faire relire par l’avocat.**

## Marketplace (quand `paymentsEnabled`)

| Plan | Commission GMV | Publication missions |
|------|----------------|----------------------|
| Compétition | 12 % | non (matching côté équipe via upsell Élite) |
| Élite | 12 % | **oui** |
| Performance | **10 %** | oui |
| Min / max | 15 € · 450 € | — |

## Tunnel de ventes

```
Landing → Tarifs (annuel par défaut, héros = Compétition 2 490 €/an · Club visible)
  ├─ Compétition / Club → Signup PLG (rôle Manager par défaut) → Close annuel
  ├─ Élite / Performance / Fédération / Athlète-Staff → secondaires (liens « → » repliés)
  └─ Élite / Performance / Fédération → « Faire tourner votre prochaine course (90 min) » (+ essai 30 j self-serve possible)

Wedge lancement (VITE_LAUNCH_MODE=ops, défaut) :
  Club     = effectif + logistique course
  Compétition = + performance (CP/FTP/durabilité) — vitrine landing OK
  Élite+   = + scouting / missions matching (paiements Connect off tant que VITE_MISSION_PAYMENTS≠true)

Activation essai réussie : 1 course créée et renseignée dans Rovik
(Upsell Club → Compétition via pôle performance, pas via scouting/mission)
```

## Réintégration progressive (hors wedge)

| Module | Réintégrer quand |
|--------|------------------|
| Missions / marketplace nav | ~10 équipes actives + demandes vacataires ; Connect si fill rate local OK |
| Scouting | Post PMF ops / plan Élite |
| API / SSO | 1er contrat Fédération qui le paie |
| Finance avancée dans le pitch Club | Jamais au launch — reste Compétition+ |
## Stripe — checklist montants

Les **Price IDs** dans `functions/.env.logicycle01` doivent correspondre aux montants ci-dessus.

**Live (vérifié 2026-08-26)** : Club / Compétition / Élite / Performance / Athlète / Staff OK · coupon `rovik_founder_20_y1` OK.  
Smoke tunnel : [`lancement/10-checkout-test.md`](../lancement/10-checkout-test.md).

1. Stripe Dashboard **TEST** → Products : aligner sur la même grille  
2. Coller les `price_…` TEST dans l’env si besoin  
3. `npx firebase-tools@13 deploy --project logicycle01 --only functions:createStripeCheckout,functions:createStripePortal,functions:stripeWebhook`  
4. Tester checkout (TEST = `4242…` · LIVE = carte réelle + annulation rapide)

**Attention** : tant que les Price IDs TEST ne sont pas recréés, l’UI affiche la nouvelle grille mais Stripe facture encore les anciens montants.

## Références

- Tunnel ops : [`OPS_RUNBOOK.md`](./OPS_RUNBOOK.md)  
- Dossier avant lancement : [`../lancement/README.md`](../lancement/README.md)  
- Checklist go-live : [`GO_LIVE_CHECKLIST.md`](./GO_LIVE_CHECKLIST.md)  
- BP : [`../business-plan/grille-tarifaire.md`](../business-plan/grille-tarifaire.md) · [`../business-plan/strategie-commerciale.md`](../business-plan/strategie-commerciale.md)
