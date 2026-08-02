# Marketplace missions — cadre fiscal & social (France)

> **Doctrine produit LogiCycle** (destination charges / merchant of record).  
> Version : **2026-08-01** · Aligné CGU §5 · CGV §7 · `LEGAL_PACK_VERSION`  
> **À faire valider** par avocat droit social / fiscal avant go-live Connect prod.  
> Ne constitue pas un avis juridique personnalisé.

## Objectif

Faciliter la vie des **équipes** (une facture claire) et des **vacataires indépendants** (pièce pour URSSAF / compta), sans créer de **lien de subordination** ni transformer LogiCycle en employeur — et **exclure** le paiement Connect des missions salariales (CDD d’usage, CDI, stage…).

---

## Deux régimes (règle d’or)

| Régime | Qualification | Paiement Connect | Documents |
|--------|---------------|------------------|-----------|
| **A — Prestation indépendante** | Vacataire = travailleur indépendant (micro, EI, EURL, SASU…) | **Oui** (si flags activés) | Factures B2B (voir chaîne) |
| **B — Emploi / CDD d’usage** | Équipe = **employeur** | **Non** — matching only | Contrat de travail + bulletin de paie + URSSAF employeur |

Le type de compensation mission détermine le régime :

- Connect éligible : `Vacataire (Facture)`, `Montant Fixe` (forfait indépendant)
- Connect **interdit** : `CDD`, `CDI`, `Apprentissage`, `Stage`, `Bénévolat`

Code : `isMissionConnectPaymentEligible()` dans [`constants/missionMarketplace.ts`](../constants/missionMarketplace.ts).

---

## Régime A — Chaîne contractuelle & facturation (MoR)

Avec Stripe Connect **destination charges**, LogiCycle est **merchant of record** du paiement carte. Pour rester cohérent :

```
Équipe  ──(cliente)──►  LogiCycle  ◄──(prestataire indépendant)──  Vacataire
              │                    │
              │  Facture 1         │  Facture 2
              │  GMV mission       │  Net vacataire (= GMV − commission)
              ▼                    ▼
         Comptabilité équipe    URSSAF / CA vacataire
```

### Rôles

1. **Équipe** : cliente de LogiCycle pour le service de mise en relation + règlement sécurisé de la mission.
2. **Vacataire** : prestataire **indépendant** qui exécute la mission ; il facture **LogiCycle** (pas l’équipe) pour le net reçu.
3. **LogiCycle** : intermédiaire économique / plateforme ; conserve la **commission** (12 % / 10 % Pro) ; n’est **pas** employeur.

### Pièces comptables (cibles produit)

| # | Émetteur → Destinataire | Montant | Usage |
|---|-------------------------|---------|--------|
| **1** | LogiCycle → Équipe | **GMV** (tarif mission) | Une seule pièce pour l’équipe (charge / achat prestation) |
| **2** | Vacataire → LogiCycle | **GMV − commission** | Justificatif CA / URSSAF / TVA du vacataire |
| *(implicite)* | Marge LogiCycle | **Commission** | Écart entre 1 et 2 (éventuellement détaillée en ligne sur facture 1) |

Reçus Stripe = traces de paiement, **pas** des factures au sens du CGI. Les factures 1 et 2 doivent respecter les mentions obligatoires (SIRET, TVA le cas échéant, date, numéro, libellé mission).

### TVA (rappel)

- Soft-launch : LogiCycle peut être en **franchise en base** → factures sans TVA (« TVA non applicable, art. 293 B du CGI »).
- Post assujettissement : Stripe Tax / factures avec TVA selon règles en vigueur ; **ne pas** activer `automatic_tax` sans registration.
- Vacataire : selon son régime (franchise / réel) — à sa charge.

### URSSAF vacataire

Le vacataire déclare son activité (micro-entreprise, etc.) et s’acquitte de ses cotisations sur le **chiffre d’affaires** correspondant à la facture 2. LogiCycle ne verse **pas** de cotisations salariales sur ce flux.

### Onboarding Connect

Le vacataire atteste être **indépendant** (SIRET / statut) lors de l’onboarding Stripe Express. Un faux statut (salarié déguisé) engage sa responsabilité et celle de l’équipe donneur d’ordre ; LogiCycle se réserve la suspension Connect.

---

## Régime B — CDD d’usage / salariat

- La marketplace peut **faciliter le matching** (publier / postuler / accepter).
- **Aucun** payout Stripe Connect.
- L’équipe établit le **contrat de travail** (ex. CDD d’usage si conditions légales réunies), la **paie**, les déclarations sociales.
- Risque de **requalification** si un « vacataire » Connect travaille en réalité sous subordination : d’où le gate produit.

---

## Faciliter la vie de chacun (roadmap docs / produit)

| Acteur | Facilité |
|--------|----------|
| Équipe | 1 facture LogiCycle PDF par mission payée (téléchargement in-app) |
| Vacataire | 1 modèle PDF prérempli (net + libellé) à finaliser (SIRET / TVA) |
| LogiCycle | Commission via `application_fee` · numéros `LC-M-…` / `DRAFT-V-…` au webhook |

**Phase actuelle** : doctrine + textes légaux + gate Connect + PDF post-paiement + **onglet Finances (comptable/trésorier)** + archivage JSON Storage + numéros idempotents + finalisation facture vacataire + écritures FEC.

| Acteur | Accès |
|--------|--------|
| Comptable / trésorier | Finances → Facturation → Factures missions (PDF + CSV + FEC) |
| Vacataire | Missions payées (candidatures) + émettre facture définitive (`V-…`) |
| Webhook | Idempotent · refunds/expire · snapshots SIRET · notifs FCM |

**Reste go-live (manuel)** : K-bis → env `VITE_LEGAL_*` / `LOGICYCLE_*` · `RESEND_API_KEY` pour emails · validation avocat · `./scripts/check-mission-invoices-ready.sh` · deploy rules/functions.

Livré côté code : PDF Storage serveur + JSON · email Resend optionnel · gate live si SIRET manquant · FEC · rôles finance · finalisation vacataire.

Réf. code : `utils/missionInvoiceUtils.ts` · `sections/financial/FinancialMissionInvoicesTab.tsx` · `functions/src/missionPaymentHandlers.js`

---

## Checklist avocat (go-live Connect prod)

- [ ] Valider chaîne MoR (facture Équipe / facture Vacataire) vs mandat de paiement alternatif
- [ ] Mentions factures + TVA post K-bis
- [ ] Clause subordination / critères indépendance
- [ ] CDD d’usage : conditions secteur sport / intermittence — hors Connect
- [ ] Bump `LEGAL_PACK_VERSION` + notification utilisateurs

Réf. technique : [STRIPE_CONNECT_MISSIONS_TEST.md](./STRIPE_CONNECT_MISSIONS_TEST.md)
