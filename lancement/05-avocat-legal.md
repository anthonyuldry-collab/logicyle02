# 05 — Avocat · pack légal

Le pack **draft** est déjà dans le produit (`legal/*.ts`, version `LEGAL_PACK_VERSION`).  
Ce n’est **pas** un avis d’avocat. Ne pas ouvrir le paiement sans relecture.

## Lots à commander

| Lot | Objet | Fichiers |
|-----|--------|----------|
| A | Marque **rovik** (antériorité + dépôt) | fiche 02 · mail template |
| B | Statuts SASU + clause PI | `business-plan/juridique/01-statuts-SASU-LogiCycle.md` (renommer Rovik) |
| C | CGU · CGV · privacy · DPA · mentions · cookies FR+EN | `legal/*.ts` |

Mail prêt à envoyer : [templates/email-avocat.md](./templates/email-avocat.md)

## Points à faire valider (lot C)

- Double rôle RGPD : responsable (compte, billing) / sous-traitant (données équipe) → DPA
- Marketplace 12 % / 10 % : **matching only** au M1 (pas de Connect live)
- Essai 14 j (Club / Compétition / indép.) · 30 j (Élite / Performance)
- Plafond de responsabilité = 12 mois de redevances
- Mineurs / scouting / données santé camp
- Mentions : coller SIREN/SIRET/siège **après** K-bis, pas avant

Après visa : bumper `LEGAL_PACK_VERSION` + `LEGAL_EFFECTIVE_DATE` dans `legal/meta.ts`.
