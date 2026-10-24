# Checklist de mise en production

## 1. Cloudflare

- Créer un projet Pages nommé `apex-gaming`.
- Créer une base D1 nommée `apex-gaming-db`.
- Ajouter le binding `DB` dans `wrangler.toml` avec le vrai `database_id`.
- Ajouter le secret `ADMIN_API_TOKEN` dans les variables secrètes Cloudflare.
- Ajouter `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID` dans les secrets GitHub Actions.

## 2. Données

Depuis la racine du projet :

```powershell
npx wrangler d1 execute apex-gaming-db --remote --file=schema.sql
npx wrangler d1 execute apex-gaming-db --remote --file=seed.sql
```

## 3. Vérifications

```powershell
node scripts/smoke-check.mjs
npx wrangler pages dev .
```

Tester ensuite :

- `/api/health` retourne `ok: true` ;
- `/api/catalog` retourne `D1_NOT_CONFIGURED` avant le binding, puis le catalogue après migration ;
- `/api/orders` accepte une commande valide ;
- `/api/admin/orders` refuse une requête sans token ;
- `/api/orders/<reference>?phone=<numero>` retourne uniquement le statut correspondant ;
- le workflow GitHub valide le projet avant le déploiement.

## 4. Avant ouverture au public

- Remplacer les numéros de paiement d'exemple dans `data.js`.
- Vérifier les prix, régions et stocks.
- Remplacer les textes légaux par les conditions validées pour l'activité.
- Configurer un vrai domaine et HTTPS.
- Ne jamais committer de token, mot de passe ou code de carte cadeau.
