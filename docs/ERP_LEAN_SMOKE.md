# ERP lean — devis / facture / SEPA (smoke)

Parcours **Continental (Élite)** : client (+ mandat) → devis → brouillon **sans n°** → émission FAC → pain.008 / pain.001, avec anti-doublon et données bancaires sécurisées.

## Automatisé

```bash
./scripts/erp-lean-smoke.sh           # smoke + E2E P2
./scripts/erp-lean-e2e-continental.sh # E2E Continental seul
```

Couvre : conversion sans n° · **clientId obligatoire (P2)** · ICS FR (`FRxxZZZ…`) + BIC + mandat · DbtrAgt = BIC client · batch `kind=collection` · masquage IBAN · gate plan SEPA · matching **strict clientId** · audit P0/P1 (FRST→RCUR, pas de double 411/512, avoirs exclus, claim avant download).

### P2 — clientId & E2E

| Règle | Où |
|-------|-----|
| Devis : sélection carnet obligatoire | `FinancialQuotesTab` · `canConvertQuote` |
| Conversion refusée sans `clientId` | `quoteUtils.convertQuoteToInvoice` |
| Création / édition facture : carnet obligatoire | `FinancialInvoicingTab` · `InvoiceEditModal` |
| Émission refusée sans `clientId` | `invoiceUtils.issueInvoice` |
| SEPA : plus de match par raison sociale | `sepaCollectionUtils.resolveClient` |
| E2E logique Continental | `utils/__tests__/erpLeanContinentalE2e.test.ts` |

### Audit P0 / P1 / P2 (comportements)

| Règle | Comportement |
|-------|----------------|
| FRST → RCUR | Max 1 FRST / UMR dans un lot ; avance mandat client après export |
| Double compta | Facture avec `sepaCollectionBatchId` : pas de 2ᵉ 411/512 à PAID |
| Avoirs | Exclus du pain.008 (`blockingReason: credited`) |
| Rules | `teamSepaSecretOk` sur `privateConfig/sepa` |
| Export atomique | Claim lot + marque PAID **avant** téléchargement XML |
| SeqTp | Ordre XML FRST → RCUR → FNAL → OOFF |
| IBAN PDF | Via SEPA privé (plus `issuerIban` public sur doc équipe) |
| Lots NF | Comptabilisés en **467** (pas 421) |
| Reveal IBAN | Bouton afficher/masquer compte équipe (lecture seule) |

## Sécurité données sensibles

| Donnée | Stockage | Accès |
|--------|----------|--------|
| IBAN / BIC / ICS équipe | `teams/{id}/privateConfig/sepa` | Managers + finance (`teamSepaSecretOk`) |
| IBAN / BIC / mandat client | `clientRecords` | Managers + finance (blacklist coureurs) |
| IBAN UI listes / staff | Masqué (`maskIbanDisplay`) | Plein à l’édition / reveal / export XML |
| Monitoring | Patterns `iban` redactés | `services/monitoring.ts` |

Ne jamais logger un IBAN / ICS en clair.

## Prérequis démo manuelle

| Élément | Attendu |
|---------|---------|
| Plan | Compétition ou Continental |
| Client | IBAN + BIC + UMR + date signature mandat |
| Équipe SEPA | IBAN + BIC + **ICS** |

## Parcours manuel

### A. Client SEPA-ready
1. Finances → Clients → IBAN, BIC, mandat (UMR + date + OOFF/FRST/RCUR)
2. Badge **SEPA prêt**

### B. Devis → facture
1. Devis avec client lié + catégorie PCG
2. **→ Facture** → brouillon **sans** n° FAC
3. Facturation → **Émettre** → n° alloué + PDF

### C. pain.008
1. SEPA → ICS FR valide (`FRxxZZZ…`)
2. Ligne « Prête » → Exporter → lot `SEPA-COL-…` + facture **PAID** + mandat FRST→RCUR si besoin
3. Recharger : facture **exclue** (anti double prélèvement) ; avoirs restent hors lot

### D. pain.001
Salaires / NF → export XML (batch `kind=payment`) ; NF en compte **467**

## Critères OK

- [x] Pas de n° à la conversion devis
- [x] `clientId` obligatoire devis → conversion → création → émission (P2)
- [x] Matching SEPA strict `clientId` (P2)
- [x] Émission bloquée sans `clientId`
- [x] pain.008 refuse sans ICS / BIC client / mandat
- [x] DbtrAgt = BIC **client** (pas équipe)
- [x] 2ᵉ export de la même facture impossible
- [x] Export → PAID + avance mandat ; pas de double 411/512
- [x] Avoirs exclus du pain.008
- [x] IBAN masqués (listes SEPA, staff, coureurs)
- [x] E2E logique Continental (`./scripts/erp-lean-e2e-continental.sh`)
- [x] Suite audit `erpLeanAuditFixes.test.ts`

## Références

| Zone | Fichier |
|------|---------|
| Devis | `utils/quoteUtils.ts` |
| Facture | `utils/invoiceUtils.ts` |
| Collections | `utils/sepaCollectionUtils.ts` |
| Export | `utils/sepaExport.ts` |
| SEPA privé | `firebaseService.saveSepaSettings` / `privateConfig/sepa` |
| Rules | `firebase/firestore.rules` (`teamSepaSecretOk`) |
| Tests audit | `utils/__tests__/erpLeanAuditFixes.test.ts` |
