# Grille tarifaire LogiCycle — MAJ juil. 2026 (camp/wellness + indépendants)

## Principes

| Principe | Détail |
|----------|--------|
| **vs Ippogee** | 5× à 25× moins cher selon le palier équipe |
| **Profils indépendants** | **Payants** — essai 14 j, puis 9–12 €/mois |
| **Annuel** | 2 mois offerts (= 10 mois facturés) |
| **Parrainage** | Filleul -10 % 1ère année · Parrain 1 mois offert/filleul (max 3/an) |
| **Marketplace missions** | **12 % GMV vacataire** (10 % Pro) · min. 15 € · Continental+ pour publier |
| **Suivi stage / camp** | Inclus **Compétition+** · altitude avancé **Continental+** |
| **Politique prix** | **Pas de hausse** suite camp/wellness — levier d’upsell Club→Compétition |
| **Essai équipe** | **14 j tous plans** · pilote 90 j **sur devis** (fédérations / multi-équipes) |

---

## Grille publique — Équipes (inchangée)

| Plan | Mensuel | Annuel | Users | Events/saison | Cible |
|------|---------|--------|-------|---------------|-------|
| **Club** | 39 € | **390 €** | 20 | 25 | Hors DN, Jeunes |
| **Compétition** | 89 € | **890 €** | 40 | 60 | N1–N3 · stages |
| **Continental** | 169 € | **1 690 €** | 65 | ∞ | Continental / ProSeries · altitude |
| **Pro** | 299 € | **2 990 €** | 100 | ∞ | ProTeams / WT wedge |
| **Fédération** | Sur devis | dès **449 €/mois** | ∞ | ∞ | LNR, comités |

### Pourquoi ne pas monter les prix ?

| Argument | Décision |
|----------|----------|
| Camp/wellness = différenciateur **unique vs Ippogee** | Inclure pour accélérer conversion |
| Club→Compétition déjà le plus gros levier ARPU | Feature = **raison d’upsell**, pas de surcharge |
| Positionnement « 10× moins cher qu’Ippogee » | Hausse fragiliserait le pitch Continental |

**Option future (M24+)** : add-on « Camp Altitude Pro » **+29 €/mois** si adoption > 40 % Continental — hors grille actuelle.

### Profils indépendants (sans équipe)

| Plan | Mensuel | Annuel | Cible |
|------|---------|--------|-------|
| **Indépendant Athlète** | 9 € | **90 €** | Scouting + carnet stage light |
| **Pass Camp Perf** (add-on athlète) | **19 €** | **190 €** | SpO₂ · USG · tests · partage coach/centre |
| **Indépendant Staff** | 12 € | **120 €** | Marketplace missions + monitoring invité |
| **Indépendant Entraîneur** *(roadmap M6–M18)* | **29 €** | **290 €** | Roster ≤15 athlètes · suivi stage + perf light |
| **Coach Pro** *(roadmap Y3)* | **79 €** | **790 €** | ≤40 athlètes · branding · multi-centres |

**Boucle long terme** : athlète ↔ **entraîneur indép.** ↔ centre altitude (Font-Romeu) — Ippogee **absent** sur les 3.

| Qui paie ? | Quoi | Prix |
|------------|------|------|
| Athlète solo | Indép. 9 € (+ Pass 19 €) | 9–28 €/mois |
| **Entraîneur indép.** | Suivi de *ses* athlètes en stage/perf | **29 €/mois** |
| Centre (CNEA…) | Offre Centre altitude | dès **449 €/mois** |
| Équipe hôte | Compétition / Continental | 890–1 690 €/an |

Détail vision : **`vision-independants-coach-athlete.md`**.

### Offre **Centre altitude** (Font-Romeu, CNEA, Sierra Nevada…)

| Élément | Détail |
|---------|--------|
| Exemples | CNEA Font-Romeu · Sierra Nevada · Livigno · St-Moritz · Teide |
| Prix | **dès 449 €/mois** (devis) · pack haute saison **2 990–4 990 €** |
| Capacité | jusqu’à **80 athlètes invités** / stage |
| Inclut | Stages SpO₂/USG/wellness · invitations indép. · dashboard coach · PDF fin de stage · logo centre |
| vs Ippogee | **Segment non adressé** — Ippogee = équipes WT, pas centres |

**Pitch CNEA / Font-Romeu** :  
*« Vos résidents saisissent SpO₂ et wellness sur mobile. Votre staff voit les alertes. Les équipes clientes repartent avec un PDF stage — LogiCycle devient l’outil du centre, pas seulement de l’équipe. »*

### Marketplace missions

| Segment | Commission | Exemple (825 € GMV) | Plan requis |
|---------|------------|---------------------|-------------|
| Continental / Compétition | **12 %** | **99 €** / mission | Compétition+ |
| Pro | **10 %** | **82,50 €** | Pro |
| Minimum | 15 € / mission | — | — |

---

## Fonctionnalités par plan (aligné code)

| Fonctionnalité | Club | Compétition | Continental | Pro |
|----------------|:----:|:-----------:|:-----------:|:---:|
| Effectif & calendrier | ✅ | ✅ | ✅ | ✅ |
| Logistique course | 6 mod. | **12 onglets** | ✅ | ✅ |
| PWA mobile | ✅ | ✅ | ✅ | ✅ |
| PPR & nutrition | ❌ | ✅ | ✅ | ✅ |
| **Suivi stage (wellness, urine, tests)** | ❌ | ✅ | ✅ | ✅ |
| **Camp altitude (SpO2, USG, protocoles)** | ❌ | ⚠️ basique | ✅ | ✅ |
| Bike fit UCI | ❌ | ✅ | ✅ | ✅ |
| OCR justificatifs | ❌ | ✅ | ✅ | ✅ |
| Scouting inter-équipes | ❌ | ✅ | ✅ | ✅ |
| Accès réseau indépendants | ❌ | ❌ | ✅ | ✅ |
| Marketplace staff | ❌ | ❌ | ✅ | ✅ |
| Export compta CSV / FEC | ❌ | ❌ | ✅ | ✅ |
| Export SEPA pain.001 / 008 | ❌ | ✅ | ✅ | ✅ |
| Templates UCI PDF | ❌ | ❌ | ❌ | ✅ |
| Masse salariale | ❌ | ❌ | ❌ | ✅ |
| IA nutrition Gemini | ❌ | ❌ | ❌ | ✅ |
| Admin dashboard | ❌ | ❌ | ❌ | ✅ |

---

## Comparaison Ippogee (prix)

| Segment | Ippogee (estimé) | LogiCycle | Économie |
|---------|------------------|-----------|----------|
| Continental | 12–25 K€/an | 1 690 €/an | **~85–93 %** |
| ProTeam | 25–50 K€/an | 2 990 €/an | **~88–94 %** |
| Club / DN | Non ciblé | 390–890 €/an | Marché libre |
| Suivi stage / wellness | Absent / basique | **Inclus Compétition+** | Unique |
| Coureur/staff sans équipe | Aucune offre | 90–120 €/an (+ Pass Camp 190 €) | Unique |
| **Centre altitude** (Font-Romeu…) | Aucune offre | dès 449 €/mois | **Unique** |

---

## Matrice indépendants × coach × camp × centre

| Fonction | Athlète 9 € | Pass Camp 19 € | **Coach indép. 29 €** | Centre 449 €+ | Équipe Compétition+ |
|----------|:-----------:|:--------------:|:---------------------:|:-------------:|:-------------------:|
| Carnet wellness perso | ✅ | ✅ | vue athlètes liés | — | ✅ |
| SpO₂ / USG / alertes | ❌ | ✅ | ✅ (athlètes liés) | ✅ | Cont.+ |
| Roster athlètes perso | ❌ | ❌ | ✅ ≤15 | ✅ invités | ✅ effectif |
| Commentaires coach / jour | ❌ | — | ✅ | ⚠️ | ✅ |
| Perf light (charge, RPE) | light | ✅ | ✅ | — | ✅ PPR |
| Rejoindre stage centre | ✅ | ✅ | via athlètes | invite | ✅ |
| Dashboard multi-athlètes | ❌ | ❌ | ✅ roster | ✅ séjour | ✅ |
| White-label | ❌ | ❌ | Coach Pro | ✅ | ❌ |

---

## Impact pricing → valorisation

| Levier | Effet |
|--------|-------|
| Camp/wellness inclus Compétition | ↑ conversion Club→Compétition · ARPU blended ↑ |
| Altitude Continental+ | ↑ rétention Cont./Pro · churn ↓ |
| Pas de hausse prix | CAC stable · pitch « 10× moins cher » intact |
| Bonus multiple produit | **+0,4× ARR** (voir `impact-valorisation-options.md`) |

---

## Programme parrainage

| Acteur | Avantage |
|--------|----------|
| Filleul équipe | -10 % 1ère année |
| Filleul indépendant | -10 % 1ère année |
| Parrain | 1 mois offert / filleul (max 3/an) |

Format lien : `https://votre-domaine/?ref=LC-XXXXXX`
