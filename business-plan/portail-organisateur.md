# Portail organisateur cyclisme — AVANT triathlon

> **Décision** : juil. 2026 · lancer le portail **organisateur cyclisme** avant l’extension triathlon.  
> **Pourquoi** : ancrer le réseau équipes ↔ organisateurs sur le cœur de métier, puis élargir.

---

## Ordre stratégique

| Phase | Période | Focus | Condition |
|-------|---------|-------|-----------|
| **P0** | M1–M23 | Cyclisme équipes · dossier candidatures (déjà côté équipe) | Go-live |
| **P1** | **M24–M29** | **Organisateur Solo** — fiche épreuve + candidatures en ligne | ≥ **150 équipes** · Seed closée |
| **P2** | **M30–M35** | **Organisateur Pro** — roadbook · startlists · messagerie | Traction Solo |
| **P3** | **M36+** | Triathlon (coachs + clubs) | Portail org. live |
| **P4** | M60+ | Running | Traction tri |

**Règle** : pas de module triathlon avant go-live organisateur Solo (M24).

---

## Calendrier (M1 = déc. 2027)

| Mois | Date | Livrable |
|------|------|----------|
| M24 | **nov. 2029** | Portail Solo · 49 €/mois (490 €/an) |
| M30 | **mai 2030** | Portail Pro · 149 €/mois (1 490 €/an) |
| M36 | **nov. 2030** | Ouverture triathlon |

---

## Offre

| Plan | Prix | Inclus |
|------|------|--------|
| **Organisateur Solo** | 49 €/mois · 490 €/an | 1 épreuve · ≤30 équipes · candidatures · fiche publique |
| **Organisateur Pro** | 149 €/mois · 1 490 €/an | Multi-épreuves · roadbook · startlists UCI/FFC · messagerie |
| **Ligue / Fédération** | dès 449 €/mois | Sur devis · calendrier régional |

---

## SAM (EU)

| Segment | Unités | ARR potentiel |
|---------|--------|---------------|
| Solo | ~400 | ~0,8 M€ |
| Pro | ~200 | ~1,6 M€ |
| **Total** | **~600** | **~2,4 M€** |

---

## Réutilisation produit existant

- `OrganizerContactsPanel` → candidatures inversées (orga reçoit)
- `UciFormsWorkflowPanel` → startlists / engagements bidirectionnels
- `participationRequestLetter` → flux en ligne au lieu d’email

---

## Fichiers liés

- `generate_projections.py` — paliers `organisateurs_solo` / `organisateurs_pro` (M24 / M30)
- `roadmap-multisport.csv` — P1–P2 organisateur avant P3 triathlon
- `expansion-multisport.csv` · `projections-leader-multisport.csv`
