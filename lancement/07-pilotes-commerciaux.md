# 07 — Pilotes commerciaux

Un lancement sans 2–3 payeurs = une démo publique.  
Grille et tunnel : [`docs/COMMERCIAL_OFFER.md`](../docs/COMMERCIAL_OFFER.md).

## Assets prêts à coller

| Fichier | Usage |
|---------|--------|
| [templates/comment-remplir-50.md](./templates/comment-remplir-50.md) | Comment sourcer 50 DS vite |
| [templates/scripts-outbound.md](./templates/scripts-outbound.md) | LinkedIn ×3 + e-mails ×5 + close |
| [templates/objections-demo.md](./templates/objections-demo.md) | Réponses 30 s en call |
| [templates/emails-post-close.md](./templates/emails-post-close.md) | Essai / fondateur / fin d’essai |
| [templates/pipeline-pilotes.csv](./templates/pipeline-pilotes.csv) | Suivi 50 prospects → closes |
| [10-checkout-test.md](./10-checkout-test.md) | Vérif Stripe Live + tunnel paiement |

## Cible M1 (wedge)

| Plan | Pitch | Essai |
|------|--------|------|
| Club 99 €/mois · **990 €/an** | Effectif + logistique (rampe, hors landing) | 14 j |
| Compétition **249 €/mois · 2 490 €/an** | Pack saison + performance (héros) | 14 j |
| Fondateur Compétition | **1 992 €** an 1 (−20 %), puis 2 490 € | 14 j |
| Élite 399 · 3 990 € | + scouting / missions matching (Connect **off**) | 30 j |
| Performance 790 · 7 900 € | Pro / WT · sales-led | 30 j |

Activation réussie d’un essai : **1 course créée et renseignée** dans Rovik.

## Objectifs J-90 (sept.–nov. 2026)

| Étape | Cible |
|-------|------:|
| Prospects dans le CSV | 50 |
| RDV 30 min | 15 |
| Essais Stripe | 5 |
| Payés (carte ou devis) | **2–3** |

Rythme suggéré : **8–12 messages outbound / jour** · **8–12 calls / semaine**.

## Script démo 12 min (ordre)

1. Landing Rovik (30 s)  
2. Effectif + une course (4 min)  
3. Logistique J-1 / hébergement / transfert (4 min)  
4. (Compétition+) un écran perf (2 min)  
5. Tarifs annuel + essai Stripe (1 min)

Ne pas vendre finance avancée / marketplace payante au Club.  
Ne pas pitcher Athlète / Staff aux DS (lien discret page tarifs seulement).

## Après chaque close fondateur

1. Ligne CSV → `statut=paye` · `fondateur=oui`  
2. `FOUNDER_COHORT_CLAIMED += 1` dans `constants/founderOffer.ts`  
3. Caler la **90 min** première course  
4. Demander 1 intro warm vers un autre DS (pas de fake logo)
