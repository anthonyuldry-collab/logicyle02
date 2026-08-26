# Scripts outbound — fondateurs Rovik

**Cible** : DS / responsable sportif de clubs compétition (FR, BE, CH).  
**Offre** : Compétition **2 490 €/an** · fondateurs **1 992 €** an 1 (−20 %) · essai 14 j · garantie première course · 90 min avec le fondateur.  
**Objectif** : RDV 30 min ou essai Stripe, pas un pitch long.

Remplacer `[Prénom]`, `[Club]`, `[Course]` (prochaine épreuve connue).

---

## LinkedIn — message 1 (connexion + 1re prise de contact)

```
Bonjour [Prénom],

Je bosse avec des DS de clubs compétition sur un truc très concret :
faire partir la prochaine course sans Excel ni WhatsApp pour l’effectif / transport / hôtels.

Rovik — 90 min avec moi sur [Course] si ça vous parle.
Sinon ignorez, pas de spam.

Anthony
```

## LinkedIn — message 2 (J+3 si accepté, pas de réponse)

```
[Prénom] — juste pour clarifier :

• Un espace pour effectif, transferts, hôtels, checklists
• Je fais tourner votre 1re épreuve avec vous (90 min)
• Pack Compétition 2 490 €/an (fondateurs 1 992 € an 1, 20 places)

Vous préférez un créneau 30 min ou démarrer l’essai 14 j ?
```

## LinkedIn — message 3 (J+7)

```
Dernier message de ma part.

Si la saison [année] est déjà calée autrement, aucun souci.
Si Excel / groupes WhatsApp vous gonflent encore pour [Course],
je garde 2 créneaux cette semaine : [jour A] / [jour B].

Sinon bonne saison — Anthony · rovik.app
```

---

## E-mail 1 — objet + corps (J0)

**Objet** : `[Club] — prochaine course sans Excel ?`

```
Bonjour [Prénom],

Les DS avec qui je parle passent encore trop de temps à coller effectif,
transports et hôtels dans des tableurs + WhatsApp.

Rovik centralise ça pour les clubs compétition.
Je propose de faire tourner [Course] avec vous en 90 minutes
(ou un call 30 min si vous préférez voir d’abord).

Offre fondateurs (20 places) : Compétition à 1 992 € la 1re année
(au lieu de 2 490 €/an), essai 14 j, résiliable avant prélèvement.
Garantie écrite : si Excel revient pour cette 1re course logée → remboursement de l’année (CGV).

Répondez « oui » + un créneau, ou démarrez ici : https://logicycle.app
(landing rovik — S’enregistrer → essai Compétition).

Anthony Uldry
Fondateur · Rovik
```

## E-mail 2 — J+4 (relance courte)

**Objet** : `Re: [Club] — prochaine course sans Excel ?`

```
[Prénom],

Petit suivi — toujours pertinent de caler 30 min avant [Course] ?
Sinon je clos le fil.

Anthony
```

## E-mail 3 — J+10 (valeur + places)

**Objet** : `Places fondateurs Rovik — [Club]`

```
Bonjour [Prénom],

Rappel utile : 20 structures max en tarif fondateur (−20 % an 1 sur Compétition).
Compteur public sur la landing.

Ce que vous voyez en 30 min :
1) une course créée
2) effectif + un transfert + un hôtel
3) checklist J-1
→ décision essai / annuel claire.

Créneau ? Ou essai direct : https://logicycle.app

Anthony
```

## E-mail 4 — J+18 (preuve process, pas de fake logos)

**Objet** : `Comment un DS loge une course en 20 min`

```
[Prénom],

Pas de « case studies » inventés — on est avant les 20 premiers.
À la place : process clair.

Vous arrivez avec le nom de [Course].
En 90 min on sort : convocations, transport, hôtel, checklist staff.
Si Excel revient pour cette logistique → on rembourse l’année.

Si vous voulez juste voir l’écran : 30 min.
Sinon bonne saison.

Anthony · contact@logicycle.app
```

## E-mail 5 — J+28 (break-up)

**Objet** : `Je clos le dossier [Club]`

```
[Prénom],

Je retire [Club] de ma liste active pour ne pas vous spammer.
Si un jour Excel / WhatsApp redevient le problème n°1 avant une course,
répondez à ce mail — je vous remets un créneau fondateur s’il en reste.

Bonne saison,
Anthony
```

---

## Call / démo 30 min (ordre)

1. **2 min** — Leur douleur : dernière course, qui a géré Excel / WhatsApp ?
2. **15 min** — Écran partagé : créer course → effectif → transfert → hôtel → checklist  
3. **5 min** — Perf light (Compétition) seulement si ils demandent  
4. **5 min** — Prix annuel 2 490 € · fondateur 1 992 € · essai · garantie · CTA Stripe  
5. **3 min** — Prochaine étape datée (essai aujourd’hui ou créneau 90 min course)

Ne pas vendre marketplace / finance avancée / Fédération.

## Après un « oui » oral

1. Lien signup essai Compétition **annuel**  
2. Noter dans `pipeline-pilotes.csv` : statut `essai` ou `rdv`  
3. Si payé fondateur : incrémenter `FOUNDER_COHORT_CLAIMED` dans `constants/founderOffer.ts`  
4. Mail de bienvenue 5 lignes + date 90 min course
