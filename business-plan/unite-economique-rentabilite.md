# Unit economics & rentabilité — LogiCycle

> Justification des prix par plan au regard des **coûts variables** (COGS) et **coûts fixes** (infra, RH, fondateur).
> Données alignées sur `generate_projections.py` et `unite-economique-plans.csv`.

---

## Principe

```
Marge contribution = Prix − COGS variable (Stripe, Firebase, OCR/Gemini, support)
Marge brute       = MRR total − COGS total
Résultat net      = Marge brute − Coûts fixes (infra + RH + fondateur)
```

Les prix ne sont **pas arbitraires** : chaque plan couvre ses coûts de service avec une marge contribution de **85–88 %**, puis les coûts fixes sont amortis sur le volume.

---

## COGS variable par plan (€/mois / client actif)

| Plan | Prix/mois | COGS variable | Marge contribution | Marge % |
|------|-----------|---------------|-------------------|---------|
| **Club** | 39 € | 5,50 € | 33,50 € | 86 % |
| **Compétition** | 89 € | 13,00 € | 76,00 € | 85 % |
| **Continental** | 169 € | 22,00 € | 147,00 € | 87 % |
| **Pro** | 299 € | 38,00 € | 261,00 € | 87 % |
| **Indép. Coureur** | 9 € | 1,20 € | 7,80 € | 87 % |
| **Indép. Staff** | 12 € | 1,50 € | 10,50 € | 88 % |

### Détail COGS Compétition+ (89 €+)

| Poste | Club | Compétition | Pro |
|-------|------|-------------|-----|
| Stripe (~2 % + 0,25 €) | 1,0 € | 2,0 € | 6,0 € |
| Firebase (Firestore, Auth, Functions) | 1,5 € | 2,5 € | 4,0 € |
| Storage (photos, justificatifs) | 0,5 € | 1,5 € | 3,0 € |
| OCR / Gemini (usage API) | — | 4,0 € | 12,0 € |
| Support amorti (email, onboarding) | 2,5 € | 3,0 € | 5,0 € |
| Scouting / index / marketplace | — | — | 2,0 € |
| **Total COGS** | **5,5 €** | **13,0 €** | **38,0 €** |

---

## Mix plans & ARPU blended (évolution upsell ERP)

| Année | Club | Compétition | Continental | Pro | ARPU blended | COGS blended |
|-------|------|-------------|-------------|-----|--------------|--------------|
| Y1 | 45 % | 35 % | 15 % | 5 % | ~72 € | ~10 € |
| Y3 | 30 % | 32 % | 28 % | 10 % | ~95 € | ~14 € |
| Y5 | 22 % | 30 % | 32 % | 16 % | ~115 € | ~17 € |
| Y10 | 15 % | 25 % | 35 % | 25 % | ~145 € | ~22 € |

**Leviers upsell** : module ERP (SEPA, FEC, facturation) pousse les clubs DN vers Compétition ; scouting/marketplace vers Continental.

---

## Coûts fixes par phase

| Phase | Mois | Infra/outils | RH équipe | Total fixe (hors fondateur) |
|-------|------|--------------|-----------|----------------------------|
| Solo | M1–M12 | 1 500–2 000 € | 0–1 550 € | **~3 550 €** |
| Renfort | M13–M24 | 4 000 € | 1 550 € | **~5 550 €** |
| Équipe cœur | M25–M36 | 8 000 € | 9 550 € | **~17 550 €** |
| Scale | M37–M48 | 15 000 € | 16 050 € | **~31 050 €** |
| Leader | M49+ | 45 000 € | 25 000 €+ | **~70 000 €+** |

Infra inclut : Firebase Blaze, Stripe, domaines, outils dev, Traccar/GPS (optionnel), conformité RGPD.

---

## Seuils de rentabilité

> Détail complet : **`charges-seuil-rentabilite.md`** · CSV `seuils-rentabilite.csv`

| Phase | Fixes/mois (hors fondateur) | Seuil mixte 65/35 | Point mort simulé |
|-------|----------------------------|-------------------|-------------------|
| M6 | 3 750 € | ~88 clients | M12 (résultat +) |
| M18 | 6 350 € | ~140 clients | M8 (salaire minimal) |
| M24 | 10 946 € | ~325 clients | M12+ |
| M36 | 23 360 € | ~587 clients | M18+ |
| M48 | 41 970 € | ~851 clients | M24+ |

**15 K€ net fondateur** (dividendes) : **M45** · ~546 équipes · MRR ~115 K€.

**Point mort opérationnel early** : ~**40 équipes + 250 indép.** (M8) si salaire fondateur plafonné.

---

## Rentabilité par segment Ippogee

| Segment | Prix LogiCycle | Coût Ippogee estimé | Marge LogiCycle | Commentaire |
|---------|----------------|---------------------|-----------------|-------------|
| Continental | 169 €/mois | ~1 500 €/mois (100 K€/an) | 87 % | Prix = **1/9 Ippogee** avec ERP comparable partiel |
| ProTeam | 299 €/mois | ~3 000 €/mois (250 K€/an) | 87 % | Même profondeur perf + mini-ERP |
| Indépendant | 9 €/mois | 0 € (absent) | 87 % | **Nouveau TAM** — coût marginal faible |

---

## Flux MRR indépendants (impact rentabilité)

| Indépendants actifs | MRR indép. | % MRR total |
|---------------------|------------|-------------|
| Y1 ~490 | ~4 K€ | ~25 % |
| Y3 ~2 940 | ~24 K€ | ~22 % |
| Y5 ~6 771 | ~55 K€ | ~20 % |
| Y10 ~10 194 | ~83 K€ | ~17 % |

Les indépendants ont un **COGS faible** (1,2–1,5 €) et un **CAC quasi nul** (viralité scouting + parrainage) → marge contribution élevée dès le volume.

---

## Parrainage — coût marketing maîtrisé

| Acteur | Avantage | Coût max LogiCycle |
|--------|----------|-------------------|
| Filleul équipe Pro | -10 % année 1 | 299 € |
| Filleul Continental | -10 % | 169 € |
| Filleul indép. | -10 % | 12 € |
| Parrain | 1 mois offert | Crédit renouvellement |

**CAC parrainage cible** : 50–150 € vs 400–600 € ads — rentable dès LTV > 600 € (Continental, 3 ans).

---

## Régénérer les tableurs

```bash
python3 business-plan/generate_projections.py
```

Fichiers : `unite-economique-plans.csv`, `justification-prix-rentabilite.csv`, **`charges-seuil-rentabilite.md`**
