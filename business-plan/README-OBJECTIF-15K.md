# LogiCycle — Business Plan (MAJ TAM réel · juillet 2026)

## Lancement commercial : **décembre 2026**

> M1 = déc. 2026 · Voir `calendrier-lancement.md` · pré-lancement sept.–nov. 2026 (statuts · CGU/CGV · marque).

## Base marché recalibrée

> **TAM vérifié** : `tam-marche-reel.md` · sources UCI / PCS / FFC / FFCT / British Cycling / BDR.

| Segment | Réalité | vs plan initial |
|---------|---------|-----------------|
| Équipes UCI (WT+Pro+Cont.) | **~180** | Pas 3 000 |
| Ippogee clients WT/Pro | **~80** | Référence premium |
| Clubs structurés mondiaux | **~12–16 K** | Cœur ARR clubs |
| Indép. SAM LogiCycle | **15–25 K** | Pas 167 K licenciés |
| **Centres altitude** (CNEA, Font-Romeu…) | **~15–30 EU** | Upside **0,3–0,5 M€ ARR** · Ippogee absent |
| **SAM ARR** | **4,3–7,2 M€** | Plafond modèle phare + centres |

## Scénarios financiers

| Scénario | Rôle | ARR Y10 | Valo Y10 | 15 K net | 100 M€ valo |
|----------|------|---------|----------|----------|-------------|
| **Leader Dual-Track** | **Phare réaliste** | **~5,0 M€** (72 % SAM) | **~76 M€** | **M45 (août 2031)** | > M120 |
| **Upside international** | Stretch / pitch VC | **~11,5 M€** | **~226 M€** | M33 | M74 |
| Leader Europe | Conservateur EU | ~9,8 M€ | ~168 M€ | M39 | M90 |

## Fichiers clés

| Fichier | Contenu |
|---------|---------|
| **`tam-marche-reel.md`** | **TAM/SAM vérifié web** |
| **`strategie-commerciale.md`** | **Plan stratégique & commercial (Arnault × Bourbon)** |
| **`calendrier-lancement.md`** | **Dates réelles (M1 = déc. 2026)** |
| `plan-commercial-phases.csv` | Calendrier opérationnel par phase |
| `projections-leader-100M.csv` | Scénario **Leader Dual-Track** (10 ans) |
| **`vision-independants-coach-athlete.md`** | **Athlètes × coachs indép. × centres altitude (long terme)** |
| **`charges-seuil-rentabilite.md`** | **Catalogue charges · 5 niveaux de rentabilité · sensibilité** |
| `catalogue-charges.csv` | 45 postes de charges (variable/fixe/ponctuel) |
| `seuils-rentabilite.csv` | Seuils simulés + théoriques |
| `decomposition-charges-mensuelles.csv` | P&L mensuel 120 mois |
| **`dossier-avocat-marque-logicycle.md`** | **Brief avocat : marque · statuts · CGU/CGV** |
| **`checklist-juridique-pre-seed.md`** | Checklist legal pré go-live |

## Objectifs — Leader Dual-Track (phare)

| Objectif | Mois | **Date calendaire** |
|----------|------|---------------------|
| **Lancement commercial** | M1 | **Déc. 2026** |
| **15 K net lissé (salaire + dividendes)** | M45 | **Août 2030** |
| Seed 750 K€ | M24 | **Nov. 2028** |
| Series A 2 M€ | M48 | **Nov. 2030** |
| Horizon 10 ans | M120 | **Nov. 2036** |
| Pro/WT signés M18 | M18 | **Mai 2028** |
| **ARR Y10** | M120 | **~5,0 M€ (72 % SAM)** |
| **Valorisation Y10** | M120 | **~76 M€** |

## Objectifs — Upside (stretch)

| Objectif | Mois | Date |
|----------|------|------|
| 15 K net | M33 | Août 2029 |
| 100 M€ valo | M74 | Jan. 2033 |
| ARR Y10 | M120 | ~11,5 M€ |

## 5 flux revenus

```
MRR total =
  Abonnements équipes
+ Abonnements indépendants
+ Commissions marketplace (12 % GMV vacataire)
+ Enterprise fédérations
```

## Régénérer

```bash
python3 business-plan/generate_projections.py
```

## Docs

- **`fiscalite-remuneration-fondateur.md`** — salaire min + dividendes · holding
- `comparaison-ippogee.md` — comparatif complet (TAM recalibré)
- **`plan-commercial-90j.md`** — exécution immédiate
