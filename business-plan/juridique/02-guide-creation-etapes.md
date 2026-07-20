# Guide pratique — Créer la SASU LogiCycle (France)

> Parcours opérationnel post-rédaction des statuts.  
> Formalités via le **guichet unique** des formalités des entreprises (INPI) : [https://formalites.entreprises.gouv.fr](https://formalites.entreprises.gouv.fr)

---

## Phase 0 — Avant toute signature (3–10 jours)

| # | Action | Livrable |
|---|--------|----------|
| 0.1 | Trancher les points de `04-decisions-a-trancher.md` | Fiche décisions signée |
| 0.2 | Recherche d’antériorité **INPI** « LogiCycle » (cl. 9, 35, 42) + proximité Ippogee | Note PDF |
| 0.3 | Vérifier disponibilité **noms de domaine** (logicycle.com / .fr / .eu) | Capture WHOIS |
| 0.4 | Relire statuts + pacte avec **avocat** | Version « exécution » |
| 0.5 | Choisir **expert-comptable** (liasse SAS, TVA, JEI éventuel) | Lettre de mission |
| 0.6 | Choisir adresse du **siège** (domicile / domiciliation commerciale) | Justificatif |

**Conseil** : ne pas démarrer Stripe / facturation clients au nom perso une fois la SAS envisagée — ouvrir le compte pro dès K-bis.

---

## Phase 1 — Capital et banque (2–7 jours)

1. Rédiger les statuts définitifs (montants en lettres + chiffres).
2. Ouvrir un **compte de dépôt de capital** (banque néobanque pro, banque traditionnelle, notaire, ou Caisse des dépôts).
3. Virer le capital depuis le compte perso du fondateur.
4. Obtenir l’**attestation de dépôt des fonds** (voir `06-attestation-depot-fonds.md`).
5. Après immatriculation : débloquer les fonds sur le compte courant pro (remise du K-bis à la banque).

**Capital recommandé LogiCycle**

| Option | Montant | Intérêt |
|--------|---------|---------|
| A — Lean | 1 000 € | Minimal, max flexibilité table de capitalisation |
| B — Crédibilité | 10 000 € | Signal + petite trésorerie de départ |
| C — Apport PI + cash | Cash + code valorisé | Utile Seed (clean title) mais **commissaire aux apports** souvent requis |

---

## Phase 2 — Signature du dossier constitutif (1 jour)

Documents à signer le même jour :

- [ ] Statuts (toutes pages paraphes + signature)
- [ ] PV / décision de nomination du Président + acceptation
- [ ] Liste des souscripteurs
- [ ] État des actes de la société en formation (si contrats signés avant K-bis)
- [ ] Annexe PI (cession / apport code & marque)
- [ ] Déclaration de non-condamnation (parcours guichet unique)

---

## Phase 3 — Dépôt guichet unique INPI (1–2 h + délai greffe)

Créer le dossier « Création » → SAS → renseigner :

- dénomination, sigle éventuel, enseigne ;
- objet social (reprendre art. 3 — suffisamment large) ;
- siège, durée, capital, exercice ;
- Président (identité, adresse) ;
- options fiscales (IS par défaut) ;
- effectif début (souvent 0 ou 1) ;
- activité NAF probable : **62.01Z** (programmation informatique) ou **62.02A** (conseil systèmes) — à valider avec l’EC.

Joindre PDF : statuts, attestation dépôt, pièce ID, justificatif siège, etc.

**Délai typique** : quelques jours à ~2 semaines selon greffe.

**Coûts** : greffe + annonce légale (souvent intégrés / proposés dans le parcours) ≈ **150–400 €**.

---

## Phase 4 — Post K-bis (semaine 1)

| # | Action |
|---|--------|
| 4.1 | Récupérer **K-bis**, SIREN, SIRET, n° TVA intracommunautaire (si assujetti) |
| 4.2 | Débloquer capital → **compte courant** pro |
| 4.3 | Activer **espace professionnel Impots.gouv** + Urssaf |
| 4.4 | Affiliation **Président assimilé salarié** (régime général) — fiche de paie via EC / gestionnaire |
| 4.5 | Assurances : **RC Pro** (+ cyber avant clients WT) |
| 4.6 | Ouvrir **Stripe** au nom de la SAS (KYC société) |
| 4.7 | Mentions légales site / app : éditeur = SAS LogiCycle, SIREN, siège, contact |
| 4.8 | Dépôt **marque INPI** (si recherche OK) |
| 4.9 | Contrats freelances avec **cession PI** avant tout commit |
| 4.10 | Mettre à jour la checklist `checklist-juridique-pre-seed.md` |

---

## Phase 5 — Gouvernance annuelle (récurrent)

- Clôture exercice → comptes → décision d’affectation (réserve légale 5 %)
- PV / registre des décisions à jour
- Liasse fiscale + IS
- Si bénéfice : arbitrage **salaire vs dividendes** (voir `fiscalite-remuneration-fondateur.md`)
- Avant Seed : pacte d’associés + data room PI

---

## SASU vs SAS — quand basculer ?

| Situation | Forme |
|-----------|--------|
| Fondateur seul | **SASU** (mêmes règles SAS, rédaction simplifiée) |
| Entrée business angel / Seed | **SAS** pluripersonnelle + **pacte** + éventuellement AGA / BSPCE |
| Holding perso | Créer holding **plus tard (M24)** — pas obligatoire à M1 |

**Conseil** : rester en SASU à la création si vous êtes seul. La transformation / entrée d’associés se fait par augmentation de capital et mise à jour des statuts + pacte — classique en Seed.

---

## Statut social & fiscal du Président (rappel)

| Sujet | Position type LogiCycle |
|-------|-------------------------|
| Statut social | **Assimilé salarié** (régime général) — pas TNS |
| Fiche de paie | Obligatoire si rémunération |
| Salaire M1 | **≠ 0 €** si activité pleine (risque URSSAF) — cible 2 000 € net |
| Dividendes | Après bénéfice distribuable ; PFU 30 % ou barème |
| IS | Taux réduit possible sur 1er palier (sous conditions PME) |
| JEI | À étudier avec EC (exonération charges / IS sous conditions R&D) |
| TVA | Régime réel ; franchise en base possible si CA faible — arbitrage EC |

---

## Pièges fréquents à éviter

1. **Facturer au nom perso** après avoir « décidé » de créer la SAS → reprise complexe.
2. **Code dans un repo perso** sans cession écrite → due diligence Seed bloquée.
3. **Capital non libéré** / attestation absente → rejet greffe.
4. **Objet social trop étroit** → hors objet pour marketplace / formation.
5. **Confusion marque** avec un concurrent → dépôt précipité sans recherche.
6. **0 € de salaire** + train de vie via la société → ABS / redressement.
7. **Dividendes = solde Stripe** → faux ; seul le résultat comptable compte.

---

## Checklist minute « prêt à déposer »

- [ ] Statuts complets et cohérents (capital = attestation)
- [ ] Attestation de dépôt des fonds
- [ ] Justificatif de siège < 3 mois
- [ ] ID Président + déclaration sur l’honneur
- [ ] Annonce légale réglée / mandatée
- [ ] Annexe PI signée
- [ ] EC informé de la date d’immatriculation cible

---

*Document opérationnel LogiCycle — juil. 2026.*
