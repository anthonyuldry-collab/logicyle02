# Marché anglophone — double voie FR + EN · WorldTour

> **Thèse révisée** : FR et EN **en parallèle dès M1**. L'anglais = langue du **WorldTour** (staff international, UCI EN) — pas seulement UK/US.  
> Voir `worldtour-strategie-en.md` pour le playbook WT.

---

## Double voie vs séquentiel

| | Ancien plan | **Nouveau plan** |
|---|-------------|------------------|
| FR | M1–18 seul | **M1+** en continu |
| EN géo (UK/US) | M18+ | **M1+** prospection · M6 live |
| **WorldTour** | Anti-cible | **Cible voie EN M1** (wedge) |
| Fondateur | 100 % FR | **50 % FR · 50 % EN/WT** |

| Argument | Détail |
|----------|--------|
| **TAM** | ~1 300 équipes structurées + **72 000 indépendants** vs ~250 équipes FR |
| **ARR potentiel cluster EN** | **~1,9 M€/an** vs ~300 K€ France seule (maturité) |
| **1 langue = 4 marchés** | UI EN M6 → UK M18 → US M28 → AU/CA M30–32 |
| **Anti-duplication** | First mover EN = scouting graph + marketplace liquidity = **copie coûteuse** |
| **Pricing** | US/UK paient **$179/mo** (~+6 % vs €169) — pas de discount PPP agressif |
| **Concurrence** | TrainingPeaks = athlète · RaceRoster = events · **personne = team ops + marketplace** |

---

## Calendrier révisé (vs plan EU-first)

| Mois | Marché | Action | KPI |
|------|--------|--------|-----|
| **M6** | Produit | UI + docs **100 % EN** | Landing EN live |
| **M12** | UK | Prospection 30 équipes British Cycling | 5 RDV bookés |
| **M18** | **UK + IE + BE/NL** | Country lead UK (15 % ARR) | 8 équipes UK |
| **M24** | US prep | Stripe Connect US · 1099 contractor | Seed **700 K€** |
| **M28** | **États-Unis** | Country lead US cycling | 15 équipes US |
| **M30–32** | **CA + AU** | AE anglophone | 25 équipes anglo |
| **M36+** | ES/IT/DE | **Après** traction EN (pas avant) | 55 % MRR intl. |

**Règle** : ES/IT ne passent qu'**après** 50 équipes anglophones payantes — l'anglais finance l'EU romane.

---

## TAM par marché anglophone

| Marché | Équipes | Indépendants | ARR potentiel | Prix Continental |
|--------|---------|--------------|---------------|------------------|
| UK + Ireland | ~150 | ~8 000 | 180 K€ | £149/mo |
| États-Unis | ~850 | ~45 000 | **1,2 M€** | $179/mo |
| Australie | ~110 | ~6 200 | 175 K€ | $179/mo |
| Canada | ~90 | ~5 500 | 155 K€ | $179/mo |
| **WorldTour / ProTeams** | ~68 | ~12 000 | **280 K€** | Pro $329/mo |
| **Total cluster** | **~1 300** | **~72 400** | **~1,9 M€** | — |

France seule : ~250 équipes · ~15 000 indép. · ~300 K€ ARR potentiel.

---

## Barrière anti-duplication (pourquoi la vitesse compte)

Un clone anglophone mettrait **18–24 mois** à rattraper :

```
1. Liquidité marketplace     → 500+ missions historiques · profils staff vérifiés
2. Graphe scouting           → connexions coureur ↔ équipe cross-border
3. Data performance (PPR)    → modèles fatigue/durabilité entraînés
4. Références clients EN     → 3 équipes US + 2 UK = crédibilité instantanée
5. Intégrations (Stripe, UCI) → coût switch élevé pour l'équipe
```

**Fenêtre critique** : M18–M36. Si LogiCycle n'est pas live EN, un fonds US finançera un « Ippogee for America » en 2028.

Ippogee reste **80 clients FR/WT** — zéro menace sur le marché anglophone aujourd'hui.

---

## Impact projections (scénario Leader Anglo-Global)

| Métrique | Ancien (EU-first M60) | **Nouveau (Anglo M18)** | Delta |
|----------|----------------------|-------------------------|-------|
| ARR Y10 | 13,0 M€ | **22,8 M€** | **+75 %** |
| Indépendants Y10 | 35 000 | **63 300** | +81 % |
| MRR intl. Y10 | 62 % | **74 %** | +12 pts |
| Valorisation Y10 | 256 M€ | **455 M€** | +78 % |
| 100 M€ valo | M79 | **M60** | **-19 mois** |
| 15K net fondateur | M37 | M37 | = |

```bash
python3 business-plan/generate_projections.py
```

Fichiers : `expansion-anglophone.csv`, `projections-leader-100M.csv`

---

## Organisation commerciale anglophone

| Rôle | Quand | Modèle |
|------|-------|--------|
| Country lead UK/IE | M18 | 15 % ARR · quota 8 équipes Y1 |
| Country lead US | M28 | 15 % ARR · quota 15 équipes Y1 |
| AE Anglophone | M30 | CDI · pipeline US/AU/CA |
| Country lead AU | M60 | 15 % ARR |

**Contenu fondateur EN** : LinkedIn 2×/semaine · podcast cycling US (CyclingTips, VeloNews outreach).

---

## Messages commerciaux EN

**vs TrainingPeaks** : *« TrainingPeaks tracks the athlete. LogiCycle runs the team — logistics, scouting, staff marketplace. »*

**vs spreadsheets** : *« Your DS shouldn't be a Excel wizard. One platform for 12 race-day workflows. »*

**Marketplace** : *« Hire a mechanic for your stage race in 48h — 12 % only if filled. »*

---

## Risques & mitigations

| Risque | Mitigation |
|--------|------------|
| Support timezone US | CS async · docs EN · office hours EU evening = US morning |
| Compliance 1099 US | Stripe Connect Tax · legal review M22 |
| Qualité réseau diluée | Même gating : indép. payants · Continental+ pour missions |
| Dispersion géo | **Cluster EN d'abord** — pas LATAM avant M72 |
