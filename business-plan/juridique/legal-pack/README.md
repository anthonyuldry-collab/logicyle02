# Pack legal SaaS rovik — FR + EN

> **Version pack** : `2026-07` · **Entrée en vigueur** : 2026-07-31  
> **Source produit** : modules TypeScript `legal/*.ts` (affichés via `#/legal/{cgu|cgv|privacy|dpa|mentions|cookies}`)  
> **Disclaimer** : modèles opérationnels, **pas un avis d’avocat**. Relire avant go-live commercial et signature Enterprise.

## Documents

| Id | FR | EN | Fichier source |
|----|----|----|----------------|
| `cgu` | Conditions générales d’utilisation | Terms of Use | `legal/cgu.ts` |
| `cgv` | Conditions générales de vente (SaaS) | Terms of Sale | `legal/cgv.ts` |
| `privacy` | Politique de confidentialité RGPD | Privacy Policy | `legal/privacy.ts` |
| `dpa` | Accord de sous-traitance art. 28 | Data Processing Agreement | `legal/dpa.ts` |
| `mentions` | Mentions légales | Legal notice | `legal/mentions.ts` |
| `cookies` | Politique cookies | Cookie Policy | `legal/cookies.ts` |

## Accès produit

- Login → liens pied de page  
- Hash direct : `#/legal/cgu`, `#/legal/privacy`, `#/legal/dpa`, …  
- Inscription : résumé + lien pack complet  
- Paramètres RGPD : modal privacy alignée sur `PRIVACY_DOCUMENT`

## Placeholders à compléter post K-bis

Voir `legal/meta.ts` et `juridique/04-decisions-a-trancher.md` :

- Raison sociale / forme définitive  
- Siège social  
- SIREN / SIRET / TVA  
- Nom du Président (directeur de la publication)  
- Domaine principal figé  

## Points juridiques clés retenus

1. **Double rôle RGPD** : Rovik = responsable (compte, billing, sécurité) · sous-traitant (données métier Équipe) → DPA obligatoire.  
2. **Marketplace** : intermédiaire · vacataire = indépendant · commission **12 %** (10 % Pro) · Équipe = donneur d’ordre.  
3. **Essai** : 14 j (Club/Compétition/indépendants) · pilote jusqu’à 90 j (Continental/Pro) · Stripe.  
4. **Plafond responsabilité** : 12 mois de redevances (ou 100 € si pas d’abo propre).  
5. **Droit français** · tribunaux du siège.  
6. **Sous-traitants** : Firebase/Google Cloud · Stripe (+ Connect).

## Checklist relecture avocat (avant lancement)

- [ ] Remplir identité société (mentions + privacy + DPA)  
- [ ] Valider qualification RT / sous-traitant avec avocat RGPD  
- [ ] Valider clauses santé / mineurs / scouting  
- [ ] Valider marketplace vs droit du travail / portage  
- [ ] Signer DPA Google + Stripe (consoles fournisseurs)  
- [ ] Bandeau cookies si analytics non essentiels ajoutés  
- [ ] Traduction EN revue native (voie WT)  
- [ ] Version bump `LEGAL_VERSIONS` + `LEGAL_PACK_VERSION` à chaque publication

## Fichiers associés

- `lancement/` — dossier unique avant go-live
- `business-plan/checklist-juridique-pre-seed.md` — Priorité 4  
- `data/ceoLaunchPlan.ts` — item `sept-legal-pack`  
- `constants.ts` — `LEGAL_VERSIONS`  
- `sections/LegalView.tsx` — UI publique  

*rovik — août 2026.*
