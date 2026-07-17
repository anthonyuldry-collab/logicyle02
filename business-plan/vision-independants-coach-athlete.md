# Vision long terme — Réseau indépendants (athlètes × entraîneurs × centres)

> **Horizon** : M18–M60 · différenciation structurelle vs Ippogee (qui n’a **aucun** B2C coach/athlète).  
> **Inspiration terrain** : stages Font-Romeu / CNEA · coachs freelance · athlètes sans structure ERP.

---

## 1. Le problème qu’Ippogee ne résout pas

Aujourd’hui, beaucoup de cycles de perf se font **hors équipe UCI** :

| Acteur | Besoin | Outil actuel |
|--------|--------|--------------|
| **Athlète perso** (espoir, élite amateur, pro sans structure IT) | Carnet stage, wellness, PPR light, partager au coach | Excel · WhatsApp · TrainingPeaks seul |
| **Entraîneur indépendant** | Suivre 5–40 athlètes · stages · charge · alertes | Multi-Excel · Zoom · pas de camp altitude |
| **Centre altitude** (Font-Romeu…) | Monitoring résidents multi-équipes / solo | Papier · tableurs centre |

Ippogee = **ERP d’équipe WT**.  
LogiCycle long terme = **réseau** où l’athlète, le coach et le centre partagent le même fil de données (avec consentement).

---

## 2. Modèle relationnel (consent-based)

```
                    ┌─────────────────────┐
                    │  Centre altitude    │
                    │  (Font-Romeu…)      │
                    │  dashboard séjour   │
                    └──────────┬──────────┘
                               │ invite / héberge
         ┌─────────────────────┼─────────────────────┐
         ▼                     ▼                     ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Athlète indép.  │←─→│ Coach indép.    │   │ Équipe (option) │
│ carnet + perf   │   │ roster perso    │   │ Compétition+    │
└─────────────────┘   └─────────────────┘   └─────────────────┘
         │ consentement partage scopes
         └─ wellness · SpO₂ · charge · PPR light · notes stage
```

**Règle produit** : l’athlète **accorde** des scopes au coach (comme le scouting inter-équipes).  
Le coach ne « possède » pas les données — il les **suit**.

---

## 3. Trois offres indépendantes (évolution grille)

| Plan | Mensuel | Annuel | Pour qui | Cœur de valeur |
|------|---------|--------|----------|----------------|
| **Indép. Athlète** | 9 € | 90 € | Coureur sans équipe | Scouting + carnet stage light |
| **Pass Camp Perf** (add-on athlète) | +19 € | +190 € | Stage altitude | SpO₂ · USG · tests · partage coach/centre |
| **Indép. Staff vacataire** | 12 € | 120 € | Mécano, assistant… | Marketplace missions |
| **Indép. Entraîneur** *(nouveau)* | **29 €** | **290 €** | Coach freelance / prépa | Roster athlètes · suivi stage · perf |

### Détail **Indépendant Entraîneur** (29 €/mois)

| Capacité | Inclus |
|----------|--------|
| Roster athlètes liés (consent) | jusqu’à **15** athlètes (base) |
| Pack +10 athlètes | **+9 €/mois** |
| Vue stages de *ses* athlètes | wellness · SpO₂ si Pass Camp / centre |
| Perf light | charge, RPE, historique, alertes |
| Commentaires coach par jour de stage | ✅ |
| Export PDF bilan athlète / stage | ✅ |
| Marketplace (missions coach) | optionnel (même profil staff) |
| Scouting « je cherche un athlète » | M36+ |

**Upsell coach** → mini-structure « Coach Pro » **79 €/mois** (40 athlètes · branding · multi-centres) vers Y3–Y5.

---

## 4. Parcours types (long terme)

### A. Athlète + coach perso → Font-Romeu

1. Athlète s’abonne (9 €) · active Pass Camp (19 €) pour le séjour  
2. Invite son **entraîneur indép.** (29 €) · scopes wellness + SpO₂ + charge  
3. Centre Font-Romeu ouvre le stage (offre Centre) · voit alertes agrégées  
4. Fin de stage : PDF pour athlète · coach · (option) fédé  

**Revenus LogiCycle sur 1 séjour 3 semaines** (exemple) :
- Athlète 9+19 ≈ 28 €  
- Coach 29 €  
- Centre 449 € amorti / N athlètes  
→ **effet réseau** : 1 coach ramène N athlètes · 1 centre ramène N coachs

### B. Coach indépendant sans centre

- Suit 8 athlètes en stage pré-saison (pas d’altitude)  
- Wellness + charge + commentaires  
- Pas besoin d’équipe UCI ni d’Ippogee  

### C. Athlète seul (pas de coach)

- Carnet perso · scouting  
- Plus tard : « trouver un coach » dans le réseau (marketplace coach M36+)

---

## 5. Roadmap produit (indépendants)

| Phase | Quand | Livrable |
|-------|-------|----------|
| **P0** | Maintenant | Carnet stage athlète · invitation stage équipe/centre (docs + plans) |
| **P1** | Pré-lancement / M1–M6 | Lien coach↔athlète consent-based · vue coach read-only camp |
| **P2** | M6–M18 | Plan **Indép. Entraîneur** Stripe · roster · alertes · PDF |
| **P3** | M18–M36 | Perf coach (PPR light, charge, historique) · Pass Camp mature |
| **P4** | M36–M48 | Marketplace « trouver un coach » · Coach Pro 79 € · multi-centres |
| **P5** | M48+ | API centres · white-label · data anonymisée benchmarks altitude |

---

## 6. Impact économique (ordre de grandeur)

| Segment | SAM indicatif | ARPU | ARR potentiel |
|---------|---------------|------|---------------|
| Athlètes indép. | 15–25 K | 110–250 €/an (avec Pass) | 1,7–4 M€ *(déjà partiel)* |
| **Entraîneurs indép.** | **2–5 K EU** | 290–950 €/an | **0,6–2,5 M€** |
| Centres altitude | 15–30 | 5–15 K€/an | 0,15–0,4 M€ |
| Effet viral coach→athlètes | — | ↑ conversion indép. | Accélère SAM athlètes |

**vs Ippogee** : zéro concurrent sur ce triangle.  
**Valorisation** : renforce le multiple « réseau » (+0,3 à +0,5× long terme) — marketplace bilatéral coach↔athlète proche du modèle missions staff.

---

## 7. Risques & garde-fous

| Risque | Mitigation |
|--------|------------|
| Coach = « mini-équipe » gratuite | Plafonds athlètes · upsell Coach Pro · pas d’ERP complet |
| Confusion avec plan Club | Messaging : *pas de logistique course / pas de SEPA* |
| Données santé sensibles | Consent scopes · RGPD · pas de diagnostic médical (déjà le ton camp) |
| Cannibalisation Continental | Coach indép. ≠ équipe Cont. · pas de marketplace missions équipe |

---

## 8. Messages commerciaux

**Entraîneur indép.**  
*« Tes athlètes en stage à Font-Romeu : SpO₂ et wellness sur ton téléphone, sans qu’ils soient dans une équipe Ippogee. 29 €/mois. »*

**Athlète**  
*« Ton coach te suit en stage. Tu gardes la main sur ce que tu partages. »*

**Investisseur**  
*« B2B équipes + B2C athlètes + B2B coachs freelance + B2B centres altitude — Ippogee n’a que le premier. »*

---

## Fichiers liés

- `grille-tarifaire.md` — prix  
- `comparaison-ippogee.md` — positionnement  
- `constants/subscriptionPlans.ts` — `ALTITUDE_CENTRE_OFFER` · plans indép.  
- Produit à builder : lien consent coach↔athlète (P1)
