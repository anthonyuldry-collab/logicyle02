# Charges & seuil de rentabilité — LogiCycle

> **Scénario phare** : Leader Dual-Track (FR + EN/WT) · M1 = déc. 2027  
> **Sources** : `generate_projections.py` · CSV générés (`catalogue-charges.csv`, `seuils-rentabilite.csv`, `decomposition-charges-mensuelles.csv`)

---

## 1. Structure du compte de résultat

```
MRR total
  − COGS variables (Stripe, Firebase, Gemini, marketplace…)
= Marge brute (~84–87 %)
  − Coûts fixes opérationnels (infra + RH + prestations)
  − Coût employeur fondateur (salaire net × ~1,87)
= Résultat net opérationnel (avant IS)
  − IS + réserve légale (trimestriel, sur bénéfice)
  → Dividendes distribuables (35 % bénéfice · 60 % parts fondateur)
```

**Distinction importante** :
- **Point mort société** = MRR couvre COGS + fixes + salaire fondateur minimal
- **15 K€ net perso** = nécessite **dividendes** en plus du salaire (M45 · août 2031)
- **PFU / holding** = charge **personnelle** du fondateur, pas de la société

---

## 2. COGS variables — détail par plan (€/mois / client actif)

| Plan | Prix | COGS | Marge contribution | % |
|------|------|------|-------------------|---|
| Club | 39 € | 5,50 € | 33,50 € | 86 % |
| Compétition | 89 € | 13,00 € | 76,00 € | 85 % |
| Continental | 169 € | 22,00 € | 147,00 € | 87 % |
| Pro | 299 € | 38,00 € | 261,00 € | 87 % |
| Indép. coureur | 9 € | 1,20 € | 7,80 € | 87 % |
| Indép. staff | 12 € | 1,50 € | 10,50 € | 88 % |

### Décomposition COGS Compétition+ (89 €+)

| Poste | Club | Compétition | Pro |
|-------|------|-------------|-----|
| Stripe (~2 % + 0,25 €) | 1,0 € | 2,0 € | 6,0 € |
| Firebase (Firestore, Auth, Functions) | 1,5 € | 2,5 € | 4,0 € |
| Storage (photos, justificatifs) | 0,5 € | 1,5 € | 3,0 € |
| OCR / Gemini | — | 4,0 € | 12,0 € |
| Support amorti | 2,5 € | 3,0 € | 5,0 € |
| Scouting / marketplace | — | — | 2,0 € |
| **Total** | **5,5 €** | **13,0 €** | **38,0 €** |

### COGS marketplace (M18+)

| Poste | Base | Montant indicatif |
|-------|------|-------------------|
| GMV moyen / mission | 825 € (150 €/j × 5,5 j) | — |
| Commission brute (12 %) | GMV | 99 € |
| Stripe Connect (~3,2 % GMV) | GMV | 26 € |
| Ops matching / litiges (6 % MRR net) | MRR marketplace | variable |

### COGS Enterprise (M36+)

5 % du MRR enterprise (support SLA, onboarding WT).

---

## 3. Coûts fixes — catalogue complet

> Liste exhaustive : **`catalogue-charges.csv`** (45 postes)

### 3.1 Infra & outils (par phase · scénario phare)

| Phase | Mois | Infra/outils | Détail typique |
|-------|------|--------------|----------------|
| Solo | M1–M12 | **2 200 €** | Firebase, domaines, GitHub, Sentry, RGPD, Workspace |
| Seed | M13–M24 | **4 800 €** | + scale Firestore · i18n prep |
| Équipe | M25–M36 | **8 500 €** | + backups · monitoring · EN support |
| Scale | M37–M60 | **14 000 €** | + multi-région · CDN |
| Mature | M61+ | **32 000 €** | 10 K+ indép. · SLA enterprise |

**Uplift international** : +8 % (EU) · +10–14 % (monde) sur l'infra de base.

### 3.2 RH & prestations (embauches planifiées)

| Rôle | Début | Coût employeur/mois | Type |
|------|-------|---------------------|------|
| Comptable | M3 | 250 € | Freelance |
| Designer UI/UX | M6 | 800 € | Mission |
| Avocat RGPD | M6 | 500 € | Mission |
| AE France | M24 | 4 500 € | CDI |
| AE Anglophone | M30 | 4 800 € | CDI |
| Customer Success | M36 | 3 500 € | CDI |
| Sales Manager | M42 | 5 500 € | CDI |
| Head of Sales | M48 | 7 000 € | CDI |

**Country leads** (UK M18, US M28) : **0 € fixe** · commission **15 % ARR pays**.

### 3.3 Fondateur — charges société

| Période | Salaire net | Coût employeur (~×1,87) | Notes |
|---------|-------------|---------------------------|-------|
| M1–M12 | 2 000 € | **3 733 €** | Jamais 0 € (URSSAF) |
| M13–M24 | 2 500 € | **4 667 €** | ~30 % PASS |
| M25+ | 5 000 € | **9 333 €** | Plafond volontaire |

**PER** (M30+) : 500 €/mois net — déduit des dividendes distribuables.

### 3.4 Holding & fiscalité société

| Poste | Montant | Quand |
|-------|---------|-------|
| Montage holding SAS | 6 500 € one-off | M24 |
| EC holding | 1 800 €/an (150 €/mois) | M24+ |
| IS société | 10 % (JEI M1–36) puis 25 % | Sur bénéfice |
| Réserve légale | 5 % bénéfice | Jusqu'à 10 % capital |
| CFE / taxes locales | 500–2 000 €/an | Faible early |

### 3.5 Commercial & marketing (variables)

| Poste | CAC cible | Notes |
|-------|-----------|-------|
| Paid ads (Continental+) | 400–1 200 €/équipe | Éviter clubs |
| Parrainage | 50–300 €/conversion | CAC organique |
| Advisor WT | 10 % ARR Y1 | Voie EN |
| Eurobike / salons | 3–8 K€/an | Optionnel |

### 3.6 Juridique & one-off

| Poste | Montant |
|-------|---------|
| Création SAS | 1 500–3 000 € |
| Marque INPI | 500–1 500 € |
| RC Pro / cyber | 800–2 500 €/an |
| Due diligence Seed/Series A | 5–15 K€ |

---

## 4. Décomposition charges par phase (simulation réelle)

| Phase | MRR | COGS | Infra | RH | Fondateur (employeur) | **Total charges** | Marge brute | **Résultat net** |
|-------|-----|------|-------|-----|----------------------|-------------------|-------------|------------------|
| M6 (Y1) | 3,9 K€ | 462 € | 2 200 € | 1 550 € | 0 €* | **3 750 €** | 2 409 € | **−1 341 €** |
| M12 | 9,3 K€ | 1 475 € | 2 200 € | 1 550 € | 3 733 € | **7 483 €** | 7 777 € | **+293 €** |
| M18 | 16,7 K€ | 2 630 € | 4 800 € | 1 550 € | 4 667 € | **11 017 €** | 14 032 € | **+3 015 €** |
| M24 (Seed) | 29,6 K€ | 4 613 € | 4 896 € | 6 050 € | 4 667 € | **15 763 €** | 25 143 € | **+9 381 €** |
| M36 | 64,2 K€ | 9 622 € | 9 010 € | 14 350 € | 9 333 € | **32 843 €** | 54 577 € | **+21 734 €** |
| M48 (Series A) | 133,2 K€ | 17 931 € | 15 120 € | 26 850 € | 9 333 € | **51 453 €** | 114 280 € | **+62 826 €** |
| M60 | 202,2 K€ | 26 645 € | 15 587 € | 26 850 € | 9 333 € | **51 920 €** | 175 582 € | **+123 662 €** |

\* M6 : salaire fondateur plafonné à 0 € car trésorerie < 2× burn.

---

## 5. Seuils de rentabilité — 5 niveaux

### Niveaux simulés (scénario phare)

| Niveau | Définition | Atteint | MRR requis | Clients |
|--------|------------|---------|------------|---------|
| **1** | Marge brute ≥ infra + RH (hors fondateur) | **M8 · juil. 2028** | ~4 950 € | ~39 équipes + 249 indép. |
| **2** | Résultat net ≥ 0 (société) | **M8 · juil. 2028** | ~4 950 € | idem |
| **3** | Trésorerie confortable (6 mois burn) | M12+ | ~9 300 € | ~69 équipes |
| **4** | **15 K€ net fondateur** (salaire + dividendes) | **M45 · août 2031** | ~115 K€ | ~546 équipes + 4 452 indép. |
| **5** | Marge nette ≥ 20 % du MRR | **M19 · juin 2029** | ~18 700 € | ~129 équipes |

### Seuils théoriques par phase (clients mixtes 65 % équipes / 35 % indép.)

| Phase | Fixes hors fondateur | + Fondateur | Seuil mixte (65/35) | MRR point mort |
|-------|---------------------|-------------|---------------------|----------------|
| M6 | 3 750 € | 8 417 € | **198 clients** | 9 787 € |
| M18 | 6 350 € | 11 017 € | **243 clients** | 12 810 € |
| M24 | 10 946 € | 15 613 € | **325 clients** | 18 154 € |
| M36 | 23 360 € | 32 693 € | **587 clients** | 38 016 € |
| M48 | 41 970 € | 51 303 € | **851 clients** | 59 655 € |
| M60 | 42 437 € | 51 770 € | **798 clients** | 60 198 € |

**Formule rapide** :
```
Seuil clients ≈ Coûts fixes mensuels / Contribution marge blended
Contribution équipe ≈ ARPU − COGS  (ex. M24 : 84 − 14 = 70 €)
Contribution indép. ≈ 7,8 − 1,1 = 6,9 €
Mix 65/35 → contribution blended ≈ 0,65×70 + 0,35×6,9 ≈ 48 €/client équivalent
```

---

## 6. Sensibilité du seuil (M24 · référence 223 équipes seules)

| Hypothèse | Seuil équipes | Δ vs base |
|-----------|---------------|-----------|
| Base | 223 | — |
| ARPU −20 % (mix Club) | 278 | **+25 %** |
| ARPU +20 % (upsell Pro) | 186 | **−17 %** |
| COGS +20 % (Gemini ↑) | 232 | +4 % |
| Fixes −20 % (bootstrap) | 178 | **−20 %** |
| Fixes +20 % (embauche anticipée) | 267 | +20 % |
| Churn +15 % | 257 | +15 % |

**Levier #1** : ARPU (upsell Continental/Pro) — 20 % d'ARPU en plus = 17 % de clients en moins pour le point mort.

**Levier #2** : Reporter embauches commerciales avant 10 Continental payants.

---

## 7. ARPU blended & mix plans (évolution)

| Année | Club | Compétition | Continental | Pro | ARPU blended | COGS blended | Marge/équipe |
|-------|------|-------------|-------------|-----|--------------|--------------|--------------|
| Y1 | 45 % | 35 % | 15 % | 5 % | ~74 € | ~12 € | ~62 € |
| Y2 | 38 % | 35 % | 20 % | 7 % | ~84 € | ~14 € | ~70 € |
| Y3 | 30 % | 32 % | 28 % | 10 % | ~98 € | ~16 € | ~82 € |
| Y5 | 22 % | 30 % | 32 % | 16 % | ~114 € | ~18 € | ~96 € |

**Leviers upsell** : ERP SEPA/FEC → Compétition · scouting/marketplace → Continental · wedge WT → Pro.

---

## 8. Rentabilité par segment vs Ippogee

| Segment | Prix LogiCycle | Ippogee estimé | Marge LC | Ratio prix |
|---------|----------------|----------------|----------|------------|
| Continental | 169 €/mois | ~1 500 €/mois | 87 % | **1/9** |
| Pro / WT wedge | 299 €/mois | ~3 000 €/mois | 87 % | **1/10** |
| Indépendant | 9–12 €/mois | N/A | 87 % | Nouveau TAM |

---

## 9. Synthèse exécutive

| Question | Réponse |
|----------|---------|
| **Combien pour couvrir les fixes (M6) ?** | ~**61 équipes seules** ou **~88 clients mixtes** |
| **Point mort opérationnel réel ?** | **M8** (~40 équipes) si salaire fondateur minimal |
| **Point mort avec salaire 2,5 K€ (M18) ?** | **~243 clients mixtes** · MRR ~12,8 K€ |
| **15 K€ net perso ?** | **M45** · MRR ~115 K€ · dividendes = levier principal |
| **Marge nette > 20 % ?** | **M19** · MRR ~18,7 K€ |
| **Charges dominantes Y3+** | RH commerciale > infra > COGS |
| **Poste le plus optimisable** | Timing embauches AE/CS · uplift infra international |

---

## 10. Fichiers & régénération

```bash
python3 business-plan/generate_projections.py
```

| Fichier | Contenu |
|---------|---------|
| `catalogue-charges.csv` | 45 postes de charges (variable/fixe/ponctuel) |
| `justification-prix-rentabilite.csv` | Seuils par phase M6–M60 |
| `seuils-rentabilite.csv` | 5 niveaux simulés + scénarios théoriques M18 |
| `decomposition-charges-mensuelles.csv` | P&L mensuel complet (120 mois) |
| `sensibilite-rentabilite.csv` | Stress test ±20 % |
| `unite-economique-plans.csv` | COGS par plan |
| `unite-economique-rentabilite.md` | Synthèse unit economics |

Docs associés : `fiscalite-remuneration-fondateur.md` · `marketplace-missions-commissions.md`
