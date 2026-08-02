# Checklist juridique pré-Seed / go-live — LogiCycle

> **Go-live commercial : décembre 2026 (M1).**  
> **J-90** : sept.–nov. 2026 · Pack legal (marque · **statuts** · **CGU/CGV**) avant ouverture payante.  
> **Seed** : ~750 K€ cible ~nov. 2028 (M24).  
> **Budget indicatif pack** : 3 500 – 9 000 € HT (avocat) · voir `dossier-avocat-marque-logicycle.md`.  
> **Disclaimer** : document opérationnel, pas un avis juridique.

---

## Priorité 0 — Kick-off avocat (août 2026)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 0.1 | Envoyer brief avocat | `dossier-avocat-marque-logicycle.md` + `annexe-marques-logicycle-tmview.csv` | ☐ |
| 0.2 | Devis 3 lots | A Marque · B **Statuts** · C **CGU/CGV/privacy/DPA** FR+EN | ☐ |

---

## Priorité 1 — Marque & identité (août–oct. 2026)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 1.1 | **Recherche d'antériorité** | « LogiCycle » · classes **9 / 42 / 35** · **Logiscycle (Hansen)** · **LOGICYCLE (DE/WIPO)** · Ippogee | ☐ |
| 1.1b | **Brief avocat marque** | Dossier + annexe TMview | ☐ envoyer |
| 1.2 | **Dépôt marque France** (si avis OK) | INPI · nom + logo · avant go-live déc. 2026 | ☐ |
| 1.3 | **Nom de domaine verrouillé** | logicycle.com / .fr / .eu · variantes | ☐ |
| 1.4 | **Charte « pas de confusion »** | vs Ippogee · vs Logiscycle Hansen | ☐ |

**Livrable** : avis écrit + certificat INPI si dépôt.

---

## Priorité 2 — Statuts & structure société (sept.–oct. 2026)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 2.1 | **Rédaction / relecture des statuts** SAS ou SASU | Objet SaaS · **clause PI** (code/design/marque = société) · pouvoirs président | ☐ **avocat** |
| 2.2 | **Pacte d'associés** (si besoin) | Vesting fondateur · IP · entrée Seed | ☐ |
| 2.3 | **Contrats prestataires / freelances** | Clause **cession PI** · NDA | ☐ |
| 2.4 | **Registre PI interne** | Auteur · date · module · commits Git | ☐ |
| 2.5 | **Formalités greffe** | Immatriculation / MAJ · annonce légale · Kbis | ☐ |

**Livrable** : statuts signés + Kbis à jour **avant nov. 2026**.

---

## Priorité 3 — CGU / CGV / Legal SaaS (sept.–nov. 2026)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 3.1 | **CGU utilisateurs** | Équipes + indépendants · limitation responsabilité · propriété données | ☐ **avocat** |
| 3.2 | **CGV / contrat SaaS** | Abonnements Stripe · essai 14 j · renouvellement · résiliation · SLA | ☐ **avocat** |
| 3.3 | **DPA (Data Processing Agreement)** | Art. 28 RGPD · Firebase, Stripe, Google | ☐ **avocat** |
| 3.4 | **Politique de confidentialité** | **FR + EN** · cookies · analytics | ☐ **avocat** |
| 3.5 | **Clause marketplace** | Commission 12 % · **2 régimes** (indépendant MoR vs CDD) · chaîne factures · Stripe Connect · litiges — `docs/MARKETPLACE_MISSIONS_FISCAL_SOCIAL.md` · CGU §5 · CGV §7 | ✅ draft v2026-08.2 (relecture avocat) |
| 3.6 | **Mentions légales** | Éditeur · hébergeur · contact privacy | ☐ |
| 3.7 | **Pages `/legal` live** | terms · privacy · dpa · FR+EN **avant go-live** | ☐ |

**Livrable** : pack publié en ligne · versions Enterprise signables.

---

## Priorité 4 — Code & concurrence Ippogee (en continu)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 4.1 | **Zéro copie Ippogee** | Pas de code · maquettes · exports Ippogee | ☐ |
| 4.2 | **Pas de recrutement « chasse »** | Ex-dev OK si NDA respecté | ☐ |
| 4.3 | **Repo Git propre** | Historique daté · auteurs | ☐ |
| 4.4 | **Licences open source auditées** | package.json | ☐ |
| 4.5 | **Battlecard factuelle** | vs Ippogee · vs Logiscycle Hansen | ☐ |

---

## Priorité 5 — RGPD & données (oct.–nov. 2026)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 5.1 | **Registre des traitements** | Finalités · bases légales · durées · sous-traitants | ✅ `docs/RGPD_REGISTRE.md` |
| 5.2 | **Scouting consent-based** | Preuve consentement · droit retrait | ✅ `docs/RGPD_SCOUTING_CONSENT.md` + in-app |
| 5.3 | **Export / purge** | Procédure documentée · délai 30 j | ☐ |
| 5.4 | **AIPD si wellness/santé à scale** | Camp SpO₂ / urine — avis avocat/DPO | ☐ |
| 5.5 | **Transferts hors UE** | Firebase US · CCT | ☐ |

---

## Priorité 6 — Contrats clients WT / Enterprise (oct. 2026–M6)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 6.1 | **Template contrat Pro / Enterprise** | SLA · support · confidentialité · pas d’exclusivité | ☐ |
| 6.2 | **Clause coexistence outils tiers** | Client may use third-party tools alongside LogiCycle | ☐ |
| 6.3 | **Clause propriété données** | Données = client · export à la résiliation | ☐ |
| 6.4 | **NDA mutuel** | Pilotes WT | ☐ |
| 6.5 | **DPA Enterprise signé** | Annexes sous-traitants | ☐ |

---

## Jalons calendaires (rappel)

| Date | Jalon |
|------|-------|
| **Déc. 2026** | **Go-live** clients payants |
| Sept.–nov. 2026 | J-90 · pack legal finalisé |
| ~Nov. 2028 (M24) | Seed 750 K€ · portail organisateur Solo |

Fichier avocat : **`dossier-avocat-marque-logicycle.md`**
