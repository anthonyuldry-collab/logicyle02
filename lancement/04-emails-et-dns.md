# 04 — E-mails & DNS

Les CGU, la landing et le support affichent `contact@` / `support@` / `privacy@logicycle.app`.  
Au 31/07/2026 : **MX non configurés** — ces adresses ne reçoivent rien.

## Tant que le domaine reste logicycle.app

Suivre `docs/EMAIL_FORWARDING.md` (ImprovMX ou forwarding registrar) :

1. MX `mx1.improvmx.com` (10) + `mx2.improvmx.com` (20)
2. TXT SPF `v=spf1 include:spf.improvmx.com ~all`
3. Alias → ta boîte perso :
   - `support@logicycle.app`
   - `contact@logicycle.app`
   - `privacy@logicycle.app`
4. Envoyer un mail de test à chacune.

```bash
dig +short MX logicycle.app
```

Attendu : `improvmx` (ou MX de ton registrar).

## Quand rovik.app est acheté

Mêmes 3 alias en `@rovik.app`.  
Puis mettre à jour `legal/meta.ts` (`privacyEmail`, `contactEmail`, `supportEmail`, `website`) **après** que les MX répondent.

Soft-launch : répondre depuis Gmail perso suffit (ImprovMX gratuit = réception seulement).
