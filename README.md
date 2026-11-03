# restoclair.fr

Site vitrine de RestOclair : Vite, React 18, Tailwind 4. Le blog, les avis et les formulaires passent par `php-api/` (Airtable).

## Développement

```bash
npm ci
cp .env.example .env.local   # vente d'abonnements active, en mode maquette
npm run dev
npm test                     # calculs, formats et contrôles de la vente d'abonnements
npm run build
```

En mode maquette (`VITE_BILLING_MOCK=true`), l'API est simulée. L'adresse e-mail saisie à l'inscription choisit le scénario (voir `src/lib/billing/mock.js`) : `existant@`, `indispo@`, `ko@`, `role@`, `comptes@`, `expire@` (401), `refus@` (403), `bloque@` (403 sur la page de retour), `sepa@`, `lent@`, ou un SIRET commençant par `000000`.

## Déploiement

1. Un push sur `main` lance `.github/workflows/deploy-production.yml`, qui compile le site et publie le résultat dans la branche `production`. `php-api/config.php` n'est jamais publié.
2. Sur le NAS, le dossier du site suit la branche `production` : on y fait un pull depuis le DSM.

### Variables du dépôt GitHub

Settings > Secrets and variables > Actions > **Variables** (ce ne sont pas des secrets) :

| Variable | Production | Rôle |
|---|---|---|
| `VITE_BILLING_ACTIF` | `true` le jour de l'ouverture, absente ou `false` avant | Enregistre les pages Tarifs, Inscription et Retour de paiement, et ajoute « Tarifs » au menu |
| `VITE_API_URL` | `https://api.restoclair.fr/v1` | API publique d'Apirest ; le site appelle `{VITE_API_URL}/api/billing/…` |
| `VITE_APP_WEB_URL` | `https://app.restoclair.fr` | Version web de l'application ; l'espace client est `{VITE_APP_WEB_URL}/mon-compte` |
| `VITE_APP_STORE_URL` | vide jusqu'à la publication de l'app iOS | Bouton App Store de la page de retour (masqué si vide) |
| `VITE_PLAY_STORE_URL` | vide jusqu'à la publication de l'app Android | Bouton Google Play de la page de retour (masqué si vide) |

Le workflow ne transmet jamais `VITE_BILLING_MOCK` : un build de production ne peut pas être en mode maquette.

### Avant d'activer la vente

- Apirest autorise les origines `https://restoclair.fr` et `https://www.restoclair.fr` (CORS), avec les en-têtes `Content-Type`, `X-Client-Type` et `Authorization`.
- Les routes `/api/billing/catalogue`, `/inscription`, `/checkout` et `/compte` répondent sous `VITE_API_URL`.
- Les pages `/cgv` et `/cgu` ont leur texte définitif (elles sont provisoires).
- Le serveur renvoie `index.html` pour toute adresse inconnue (déjà fait par `.htaccess`).
