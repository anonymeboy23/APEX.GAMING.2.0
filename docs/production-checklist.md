# Checklist de mise en production

## 1. Cloudflare Pages

- Créer un projet Pages nommé `apex-gaming`.
- Ajouter `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans les secrets GitHub Actions.

## 2. Supabase

1. Exécuter le fichier `supabase.sql` à jour dans Supabase > SQL Editor.
2. Vérifier que `supabase-config.js` contient l'URL du projet et la clé publique (`anon`/publishable), jamais la clé `service_role`.
3. Dans Authentication > URL Configuration, définir l'URL HTTPS de Cloudflare Pages comme Site URL et l'ajouter aux Redirect URLs.
4. Créer et confirmer un compte, puis lui attribuer le premier rôle admin via la requête documentée à la fin de `supabase.sql`.
5. Depuis l’administration, définir le stock initial, les coordonnées de paiement, la marge et les promotions. Le stock est initialisé à zéro.

Les fonctions Cloudflare D1 présentes dans le dépôt correspondent à d'anciens endpoints. Elles ne sont pas nécessaires au flux principal boutique/administration, qui utilise Supabase.

## 3. Vérifications

```powershell
node scripts/smoke-check.mjs
```

Tester ensuite :

- l'inscription par e-mail, sa confirmation et la réinitialisation de mot de passe fonctionnent sur le domaine HTTPS ;
- un compte ne voit que son propre profil, ses favoris et ses commandes Supabase ;
- un admin peut modifier un stock, un réglage et le statut d'une commande, puis retrouve ces changements depuis un autre navigateur ;
- une commande ne part vers WhatsApp qu'après son enregistrement Supabase ; le stock diminue, une commande au-delà du stock disponible est refusée, et une annulation restitue le stock ;
- le workflow GitHub valide le projet avant le déploiement.

## 4. Avant ouverture au public

- Remplacer les numéros de paiement d'exemple depuis l’administration Supabase.
- Vérifier les prix, régions et stocks.
- Remplacer les textes légaux par les conditions validées pour l'activité.
- Configurer un vrai domaine et HTTPS.
- Ne jamais committer de token, mot de passe ou code de carte cadeau.
