# Architecture e-commerce Apex Gaming

Le site fonctionne actuellement en mode statique avec un stockage local de secours. Le schéma `schema.sql` prépare la migration vers Cloudflare D1.

## Déjà prêt

- `functions/api/health.js` : endpoint de contrôle de disponibilité.
- `functions/api/orders.js` : contrat GET/POST pour les commandes.
- `functions/api/admin/orders.js` : consultation et changement de statut protégés par `ADMIN_API_TOKEN`.
- `functions/api/admin/summary.js` : statistiques centralisées protégées par `ADMIN_API_TOKEN`.
- `functions/api/orders/[id].js` : vérification limitée du statut avec référence + numéro WhatsApp.
- `schema.sql` : clients, produits, stock, promotions, commandes, lignes de commande et avis.
- Le front conserve son fonctionnement WhatsApp tant que D1 n'est pas connecté.

## Migration future

1. Créer une base D1 `apex-gaming-db`.
2. Ajouter le binding `DB` dans `wrangler.toml`.
3. Exécuter `schema.sql`, puis `seed.sql`.
4. Remplacer progressivement le stockage local par `/api/orders`.
5. Ajouter une authentification administrateur avant d'exposer les données clients.

La route `/api/admin/orders` attend l'en-tête `Authorization: Bearer <ADMIN_API_TOKEN>`. Le token doit rester dans les variables secrètes Cloudflare et ne doit jamais être placé dans le front-end.

Ne jamais placer de clé secrète dans `app.js`, `data.js` ou le dépôt public.
