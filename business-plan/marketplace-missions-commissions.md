# Marketplace missions vacataires — Commissions & rentabilité

> Modèle économique : **LogiCycle prélève une commission sur le montant vacataire** lors du paiement d'une mission staff (assistant, communication, mécano…).

---

## Grille commission

| Segment | Taux | Exemple mission | Commission LogiCycle |
|---------|------|-----------------|----------------------|
| **Continental / Compétition** | **12 %** du GMV vacataire | 150 €/j × 5,5 j = **825 €** | **99 €** |
| **Pro** | **10 %** (volume) | 825 € GMV | **82,50 €** |
| Minimum | 15 € / mission | — | — |
| Plafond | 450 € / mission | Missions longues (> 15 j) | — |

**GMV** = montant payé au vacataire (honoraires + jours).

---

## Flux paiement (Stripe Connect)

```
Équipe publie mission → Vacataire accepté → Paiement équipe via Stripe
→ 825 € vers vacataire (via Connect)
→ 99 € commission LogiCycle (12 %)
→ ~26 € frais Stripe Connect (~3,2 % GMV)
→ ~73 € marge nette LogiCycle / mission
```

| Poste | Montant (mission type) | % GMV |
|-------|------------------------|-------|
| GMV vacataire | 825 € | 100 % |
| Commission brute (12 %) | 99 € | 12,0 % |
| Stripe Connect | ~26 € | 3,2 % |
| **Marge nette LogiCycle** | **~73 €** | **~8,9 %** |

---

## Volume & MRR projeté (Leader Global)

| Année | Équipes Continental+ | Missions/an (plateforme) | GMV annuel | Commission nette |
|-------|---------------------|--------------------------|------------|------------------|
| Y2 | ~80 | ~180 | ~150 K€ | ~13 K€ |
| Y3 | ~200 | ~540 | ~450 K€ | ~40 K€ |
| Y5 | ~550 | ~1 650 | ~1,4 M€ | ~120 K€ |
| Y10 | ~1 400 | ~4 200 | ~3,5 M€ | ~300 K€ |

Hypothèses : 6 missions/an/équipe éligible · 75 % via plateforme · ramp 24 mois.

---

## Éligibilité & gating

| Plan | Publier missions payantes | Accès marketplace |
|------|-------------------------|-------------------|
| Club | ❌ | Lecture seule |
| Compétition | ✅ (12 %) | ✅ |
| Continental | ✅ (12 %) | ✅ |
| Pro | ✅ (10 %) | ✅ |
| Indép. Staff | — | Postuler (abonnement actif) |

---

## Rentabilité vs coûts

- **COGS marketplace** : ~6 % du MRR commission (matching, litiges, support)
- **Marge brute marketplace** : ~94 % sur la commission nette
- **Pas de CAC** : les équipes Continental+ amènent les vacataires via le réseau indépendants

**Comparables** : Malt (10–15 %), Upwork (5–20 %), Side (12 %) — **12 % justifié** par niche cyclisme + conformité + SEPA intégré.

---

## Implémentation produit

Constantes : `constants/missionMarketplace.ts`  
Projections : `business-plan/marketplace-commissions.csv`

```bash
python3 business-plan/generate_projections.py
```
