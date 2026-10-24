# Architecture e-commerce Apex Gaming

Le site est statique et utilise deux services distincts :

- Supabase Auth et la base Supabase pour les comptes clients, profils, favoris et commandes liées à un compte.
- Cloudflare Pages Functions et D1 pour les routes API du catalogue, le suivi invité et les outils d'administration. D1 reste facultatif pour le parcours du compte client.

La clé publique Supabase est chargée par `supabase-config.js`. Elle peut être utilisée dans le navigateur avec les politiques RLS ; ne jamais y mettre une clé `service_role`.

## Déjà prêt

- `functions/api/health.js` : endpoint de contrôle de disponibilité.
- `functions/api/orders.js` : contrat GET/POST pour les commandes.
- `functions/api/admin/orders.js` : consultation et changement de statut protégés par `ADMIN_API_TOKEN`.
- `functions/api/admin/summary.js` : statistiques centralisées protégées par `ADMIN_API_TOKEN`.
- `functions/api/orders/[id].js` : vérification limitée du statut avec référence + numéro WhatsApp.
- `schema.sql` : clients, produits, stock, promotions, commandes, lignes de commande et avis.
- `supabase.sql` : profils liés à Auth, commandes de compte, favoris et politiques RLS.
- Le front conserve la commande WhatsApp comme canal de secours.

## Activation des comptes Supabase

1. Dans Supabase > SQL Editor, exécuter le fichier `supabase.sql` à jour. Il ajoute les favoris et la procédure transactionnelle de sauvegarde des commandes, et protège le rôle des profils.
2. Dans Authentication > URL Configuration, définir l'URL réelle du site comme Site URL et l'ajouter aux Redirect URLs.
3. Vérifier que le fournisseur e-mail est activé, puis tester inscription, confirmation, connexion et réinitialisation du mot de passe.
4. Créer un compte de test et vérifier que son profil, ses favoris et ses commandes restent privés à ce compte.

## Activation des API Cloudflare D1

1. Créer une base D1 `apex-gaming-db`.
2. Ajouter le binding `DB` dans `wrangler.toml`.
3. Exécuter `schema.sql`, puis `seed.sql`.
4. Ajouter `ADMIN_API_TOKEN` comme variable secrète Cloudflare pour les routes d'administration.

La base D1 et Supabase ne se synchronisent pas automatiquement. Les commandes passées par un compte sont enregistrées dans Supabase ; le suivi invité et l'administration via les API Cloudflare utilisent D1 lorsqu'il est configuré.

La route `/api/admin/orders` attend l'en-tête `Authorization: Bearer <ADMIN_API_TOKEN>`. Le token doit rester dans les variables secrètes Cloudflare et ne doit jamais être placé dans le front-end.

Ne jamais placer de clé secrète dans `app.js`, `data.js` ou le dépôt public.
