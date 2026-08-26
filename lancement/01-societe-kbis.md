# 01 — Société & K-bis

Sans K-bis : pas de Stripe Live, pas de mentions légales commerciales, pas de facture définitive.

Modèles déjà dans le repo : `business-plan/juridique/` (statuts, PV, attestation capital).  
**Dénomination commerciale** : **Rovik** (décision 26 août 2026). L’avocat remplace « LogiCycle » dans les statuts avant dépôt.

## À trancher (copie dans [templates/decisions-sasu.md](./templates/decisions-sasu.md))

| Décision | Proposition | Ta valeur |
|----------|-------------|-----------|
| Forme | SASU, associé unique personne physique | |
| Dénomination | Rovik | |
| Nom commercial | rovik | |
| Capital | 1 000 € (lean) ou 10 000 € (crédibilité) | |
| Siège | Domicile ou domiciliation | |
| Président | Anthony Uldry | |
| Clôture | 31 décembre | |
| IS | Oui (défaut SAS) | |

## Parcours

1. Remplir `templates/decisions-sasu.md`.
2. RDV avocat — lot B (statuts + clause PI : le code/logo/marque appartiennent à la société).
3. Compte de dépôt de capital → virer → attestation (`juridique/06-attestation-depot-fonds.md`).
4. Signer statuts + PV président (`juridique/05-proces-verbal-nomination-president.md`).
5. Dépôt [guichet unique](https://formalites.entreprises.gouv.fr).
6. Annonce légale.
7. Réception **K-bis** + SIREN / SIRET.

## Dès le K-bis en main (code — ne pas inventer)

1. Copier [templates/env-legal-post-kbis.env](./templates/env-legal-post-kbis.env).
2. Remplir `VITE_LEGAL_*` dans `.env.production` (Netlify) **et** `LOGICYCLE_SIRET` / `SIREN` / `REGISTERED_OFFICE` côté Functions (noms de clés inchangés pour ne pas casser la prod).
3. Redeploy front + functions.
4. Vérifier `#/legal/mentions` : plus de « À COMPLÉTER ».

Guichet : [formalites.entreprises.gouv.fr](https://formalites.entreprises.gouv.fr)  
Guide long : `business-plan/juridique/02-guide-creation-etapes.md`
