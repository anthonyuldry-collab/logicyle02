# Test checkout Live — Compétition

Vérifié côté Stripe API le **2026-08-26** (compte `Logicycle SAS` · Live).

| Élément | Attendu | Statut API |
|---------|---------|------------|
| Compétition mois | 249,00 € | OK `price_1U8hetAiy1wVJjFQbTQxPCMr` |
| Compétition an | 2 490,00 € | OK `price_1U8heuAiy1wVJjFQy2QUnKfx` |
| Club mois / an | 99 / 990 € | OK |
| Élite an | 3 990 € | OK |
| Performance an | 7 900 € | OK |
| Coupon fondateur | −20 % · 12 mois · max 20 | OK `rovik_founder_20_y1` · **0** redeem |
| Athlète / Staff | 12/120 · 15/150 | OK Live (recréés 2026-08-26) |

## À faire toi (5–10 min) — tunnel réel

1. Ouvre prod (ou preview) → **S’enregistrer** → org test.
2. Upgrade **Compétition · annuel**.
3. Checkout Stripe : montant **2 490 €** TTC (ou **1 992 €** si coupon fondateur appliqué).
4. Carte de test **interdite** en Live — utilise une vraie carte à 1 € max d’intention puis **annule l’abo** dans le Customer Portal sous 5 min, **ou** crée un abonnement 100 % promo / facture à 0 si tu as un flow interne.
5. Vérifie : webhook `customer.subscription.*` · org `planId=competition` · mail transactionnel.
6. Portal : résiliation / changement de moyen de paiement OK.

## Après un vrai fondateur payé

1. Incrémente `FOUNDER_COHORT_CLAIMED` dans [`constants/founderOffer.ts`](../constants/founderOffer.ts).
2. Ligne `paye` + `fondateur=oui` dans [`templates/pipeline-pilotes.csv`](./templates/pipeline-pilotes.csv).
3. Calendrier 90 min « première course ».

## Ne pas confondre

- **TEST** (`sk_test`) : carte `4242…` — OK pour smoke.
- **LIVE** : argent réel. Préférer un compte org « Rovik Internal » + remboursement immédiat.
