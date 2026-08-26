# Emails `@logicycle.app` — redirection (ImprovMX)

Objectif soft-launch : recevoir `support@`, `contact@`, `privacy@` sans boîte mail payante.

Fiche lancement : [`lancement/04-emails-et-dns.md`](../lancement/04-emails-et-dns.md). Quand `rovik.app` est acheté, dupliquer les 3 alias.

## Étapes (≈ 10 min)

1. Compte gratuit sur [https://improvmx.com](https://improvmx.com)
2. Ajouter le domaine **`logicycle.app`**
3. Chez le registrar / DNS, **supprimer** les anciens MX, puis ajouter :

| Type | Hôte | Valeur | Priorité |
|------|------|--------|----------|
| MX | `@` | `mx1.improvmx.com` | 10 |
| MX | `@` | `mx2.improvmx.com` | 20 |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | — |

4. Créer 3 alias → ton email perso :
   - `support@logicycle.app`
   - `contact@logicycle.app`
   - `privacy@logicycle.app`
5. Attendre la validation DNS (souvent &lt; 1 h) → envoyer un mail de test

## Vérifier

```bash
dig +short MX logicycle.app
# doit afficher mx1.improvmx.com / mx2.improvmx.com
```

Ou [https://mxtoolbox.com](https://mxtoolbox.com) → lookup MX `logicycle.app`.

## Répondre « depuis » @logicycle.app

La redirection ImprovMX = **réception** seulement. Pour envoyer en `@logicycle.app` depuis Gmail : « Envoyer des e-mails en tant que » + SMTP (plan ImprovMX payant ou autre). Soft-launch : répondre depuis la boîte perso suffit.

## Alternative

Si ton registrar offre déjà « Email forwarding » (OVH, Namecheap, Cloudflare Email Routing) : crée les 3 alias là-bas — même résultat, sans ImprovMX.
