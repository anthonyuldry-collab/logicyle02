# Checklist juridique pré-Seed — LogiCycle vs Ippogee & PI

> **Objectif** : sécuriser la création et la levée Seed (~750 K€) avant exposition commerciale WT/EN.  
> **Budget indicatif** : 2 500 – 5 000 € (avocat startup + dépôts) · **délai** : M1–M6.  
> **Disclaimer** : document opérationnel, pas un avis juridique — valider avec un avocat PI/droit des affaires.

---

## Priorité 1 — Marque & identité (M1 · ~800 €)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 1.1 | **Recherche d'antériorité INPI** | « LogiCycle » · classes **9** (logiciel), **42** (SaaS), **35** (publicité/commercial) · vérifier proximité **Ippogee / Ipogee** | ☐ |
| 1.2 | **Dépôt marque France** | INPI · nom + logo · priorité FR avant expansion UK/US | ☐ |
| 1.3 | **Nom de domaine verrouillé** | logicycle.com / .fr / .eu · variantes fautes courantes | ☐ |
| 1.4 | **Charte « pas de confusion »** | Interdire visuellement : couleurs/logo proches Ippogee · pas de « Ipogee-compatible™ » | ☐ |

**Livrable** : certificat INPI + note recherche antériorité (PDF avocat ou INPI Data).

---

## Priorité 2 — Structure société & PI interne (M1–M2 · ~500 €)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 2.1 | **Statuts SAS/SASU** | Clause **propriété intellectuelle** : tout code/design/doc créé pour la société lui appartient | ☐ |
| 2.2 | **Pacte d'associés** | Vesting fondateur · IP assignée à la société · pas de code perso sur repo pro | ☐ |
| 2.3 | **Contrats prestataires / freelances** | Clause **cession PI** explicite · livrables = propriété LogiCycle · NDA signé | ☐ |
| 2.4 | **Registre PI interne** | Tableau : auteur · date · module · preuve (commit Git) · pour défendre création indépendante | ☐ |

**Livrable** : dossier « clean chain of title » demandé en due diligence Seed.

---

## Priorité 3 — Code & concurrence Ippogee (M1 · 0 € + discipline)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 3.1 | **Zéro copie Ippogee** | Pas de code · maquettes · exports · screenshots internes Ippogee réutilisés | ☐ |
| 3.2 | **Pas de recrutement « chasse »** | Ex-dev Ippogee OK **si** pas de NDA violé · pas de docs/confidentiels apportés | ☐ |
| 3.3 | **Repo Git propre** | Historique commits daté · auteurs identifiés · pas de fork suspect | ☐ |
| 3.4 | **Licences open source auditées** | `package.json` · pas de licence copyleft incompatible SaaS (GPL sans linking policy) | ☐ |
| 3.5 | **Battlecard factuelle** | Comparatifs prix/features **vérifiables** · pas de « Ippogee est illégal / frauduleux » | ☐ |

**Livrable** : note interne « Independent development » (1 page · date début dev · stack propre).

---

## Priorité 4 — CGU / CGV / Legal SaaS (M2–M3 · ~1 500 €)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 4.1 | **CGU utilisateurs** | Équipes + indépendants · limitation responsabilité · propriété données client | ☐ |
| 4.2 | **CGV / contrat SaaS** | Abonnements Stripe · renouvellement · résiliation · SLA par plan | ☐ |
| 4.3 | **DPA (Data Processing Agreement)** | Art. 28 RGPD · sous-traitants (Firebase, Stripe, Google) listés | ☐ |
| 4.4 | **Politique de confidentialité** | FR + **EN** (voie WT) · cookies · analytics | ☐ |
| 4.5 | **Clause marketplace** | Commission 12 % · statut vacataire · Stripe Connect · litiges missions | ☐ |
| 4.6 | **Mentions légales** | Éditeur · hébergeur · contact DPO / privacy@ | ☐ |

**Livrable** : pages `/legal/terms`, `/legal/privacy`, `/legal/dpa` · FR + EN.

---

## Priorité 5 — RGPD & données (M2 · produit partiellement livré)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 5.1 | **Registre des traitements** | Finalités · bases légales · durées · sous-traitants | ☐ |
| 5.2 | **Scouting consent-based** | Preuve consentement coureur · droit retrait · audit trail | ☐ |
| 5.3 | **Export / purge** | Déjà en produit · documenter procédure · délai réponse 30 j | ☐ |
| 5.4 | **AIPD si WT** | Analyse d'impact si données santé/performance sensibles à grande échelle | ☐ |
| 5.5 | **Transferts hors UE** | Firebase US · clauses contractuelles types · DPA Google/Stripe | ☐ |

**Livrable** : registre RGPD + `GdprSettingsPanel` documenté pour due diligence.

---

## Priorité 6 — Contrats clients WT / Enterprise (M3–M6 · ~1 000 €)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 6.1 | **Template contrat Pro / Enterprise** | SLA · support · confidentialité · **pas d'exclusivité** imposée au client | ☐ |
| 6.2 | **Clause coexistence Ippogee** | « Client may use third-party tools alongside LogiCycle » · évite accusation détournement | ☐ |
| 6.3 | **Clause propriété données** | Données client = client · export à la résiliation · pas de revente | ☐ |
| 6.4 | **NDA mutuel** | Pour pilotes WT · échanges DS · durée 2 ans | ☐ |
| 6.5 | **DPA Enterprise signé** | Obligatoire WT · annexes sous-traitants | ☐ |

**Livrable** : pack contractuel Notion/Drive · FR + EN.

---

## Priorité 7 — Stripe & marketplace (M3–M4)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 7.1 | **Stripe Terms of Service** | Affichés · conformité Connect · KYC vacataires | ☐ |
| 7.2 | **Statut vacataire clarifié** | CGU : prestataire indépendant · pas lien salarial · équipe = donneur d'ordre | ☐ |
| 7.3 | **Facturation commission** | LogiCycle émet facture commission 12 % · TVA conforme | ☐ |
| 7.4 | **US / UK prep** | Stripe Connect multi-pays · 1099 US · IR35 UK — avocat M22 si US live | ☐ |

**Livrable** : CGU marketplace + flow facturation documenté.

---

## Priorité 8 — Propriété intellectuelle LogiCycle (M4–M6 · ~500 €)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 8.1 | **© mention code & UI** | « © 2026 LogiCycle · tous droits réservés » · footer app | ☐ |
| 8.2 | **Évaluer brevet (optionnel)** | Uniquement si algo technique spécifique (ex. capteur + modèle embarqué) · **pas prioritaire SaaS ERP** | ☐ |
| 8.3 | **Secret des affaires** | NDA équipe · algo PPR/fatigue = savoir-faire interne · pas publication détail technique | ☐ |
| 8.4 | **Marque UK (prep M18)** | Extension UKIPO post-Seed si traction UK | ☐ |

**Livrable** : politique PI interne (2 pages).

---

## Priorité 9 — Due diligence Seed (M12–M18 · avant closing 750 K€)

| # | Action | Détail | Statut |
|---|--------|--------|--------|
| 9.1 | **Data room PI** | Marque · statuts · pacte · CGU/CGV · registre RGPD · registre PI · contrats clients | ☐ |
| 9.2 | **Lettre avocat PI** | Confirmation : pas de contrefaçon connue · dev indépendant · pas de litige Ippogee | ☐ |
| 9.3 | **Cap table propre** | Vesting · BSPCE pool · pas de IP personnelle non assignée | ☐ |
| 9.4 | **Assurance RC Pro / cyber** | Recommandée avant WT · couvre fuite données · erreur conseil | ☐ |
| 9.5 | **Veille Ippogee** | Google Alerts « Ippogee » · INPI bulletins · pas d'obsession — veille trimestrielle | ☐ |

**Livrable** : data room Google Drive · index 1 page.

---

## Priorité 10 — Comportement commercial vs Ippogee (continu)

| # | Règle | Exemple interdit | Exemple OK |
|---|-------|------------------|------------|
| 10.1 | Comparaisons **factuelles** | « Ippogee vole vos données » | « LogiCycle inclut scouting · Ippogee non » |
| 10.2 | Pas de **dénigrement** | Posts agressifs sur fondateur Ippogee | Case study client satisfait |
| 10.3 | **Wedge** = coexistence | « Remplacez Ippogee demain » | « Keep Ippogee for payroll · LogiCycle for performance » |
| 10.4 | Pas de **data scraping** | Importer base clients Ippogee | Prospection LinkedIn publique |
| 10.5 | Respect **contrats clients** | Inciter à violer clause exclusivité Ippogee | Attendre échéance · module complémentaire |

---

## Calendrier synthèse

| Mois | Actions clés | Budget cumulé |
|------|--------------|---------------|
| **M1** | Marque INPI · statuts · NDA freelances · règles anti-copie | ~1 300 € |
| **M2** | CGU/CGV/DPA · registre RGPD · politique PI | ~1 500 € |
| **M3** | Legal EN · pages /legal · template NDA WT | ~500 € |
| **M4** | CGU marketplace · Stripe legal | ~300 € |
| **M6** | Contrat Enterprise · revue avocat 2h | ~800 € |
| **M12–M18** | Data room Seed · lettre PI · RC Pro | ~1 500 € |
| **Total** | | **~5 000 – 6 000 €** |

---

## Contacts type à identifier (M1)

| Profil | Mission | Quand |
|--------|---------|-------|
| **Avocat PI / startup** | Marque · statuts · CGU · lettre due diligence | M1 + M12 |
| **Avocat RGPD** (ou DPO externalisé) | Registre · AIPD · DPA | M2 |
| **Expert-comptable** | TVA marketplace · facturation commission | M3 |
| **Assureur RC Pro / cyber** | Devis avant 1er client WT | M6 |

---

## Risque Ippogee — matrice post-checklist

| Risque | Avant checklist | Après checklist exécutée |
|--------|-----------------|--------------------------|
| Plainte brevet | Très faible | **Négligeable** |
| Contrefaçon code | Faible (si clean dev) | **Très faible** (preuves Git + registre PI) |
| Confusion marque | Faible–moyen | **Faible** (dépôt INPI) |
| Concurrence déloyale | Moyen (battlecard) | **Faible** (comparatifs factuels) |
| Due diligence Seed bloquée | Moyen | **Faible** (data room prête) |

---

## Fichiers associés

- `comparaison-ippogee.md` — comparatif factuel vente
- `worldtour-strategie-en.md` — wedge · coexistence Ippogee
- `strategie-commerciale.md` — règles commerciales
- `components/GdprSettingsPanel.tsx` — export/purge produit

```bash
# Régénérer comparatif (battlecard factuelle)
python3 business-plan/generate_projections.py
```

---

*Dernière MAJ : lancement déc. 2027 · revoir avec avocat avant closing Seed (nov. 2029).*
