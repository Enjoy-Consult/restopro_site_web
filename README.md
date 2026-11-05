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

En mode maquette (`VITE_BILLING_MOCK=true`), l'API est simulée. L'adresse e-mail saisie à l'inscription choisit le scénario (voir `src/lib/billing/mock.js`) : `existant@`, `indispo@`, `ko@`, `role@`, `comptes@`, `expire@` (401), `refus@` (403), `bloque@` (403 sur la page de retour), `sepa@`, `lent@`, `validation@`, `validationautre@` (400 VALIDATION_ERROR), `cgvobsolete@`, `cgvpaiement@`, `dejaactif@`, `gere@`, ou un SIRET commençant par `000000`. Avec `npm run dev` seulement, `annule@` et le paramètre `?maquette=` (par exemple `/abonnement/retour?maquette=impaye`, liste dans le même fichier) simulent l'annulation, chaque statut de compte, le 401 et le 429.

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

## Documents légaux

Source unique pour le site, l'application et l'API : `src/content/legal/<document>/<version>.md`, décrits dans `src/content/legal/documents.json` (version en vigueur, date d'entrée en vigueur `enVigueurLe`, statut).

| Document | Page en vigueur | Page d'une version |
|---|---|---|
| `mentions-legales` | `/MentionsLegales` | `/MentionsLegales/<version>` |
| `cgv` | `/cgv` | `/cgv/<version>` |
| `accord-sous-traitance` | `/accord-sous-traitance` | `/accord-sous-traitance/<version>` |
| `confidentialite-site` | `/confidentialite` | `/confidentialite/<version>` |
| `cookies` | `/cookies` | `/cookies/<version>` |
| `cgu-app` | `/application/cgu` | `/application/cgu/<version>` |
| `confidentialite-app` | `/application/confidentialite` | `/application/confidentialite/<version>` |

- Les pages `/application/…` n'ont ni en-tête ni pied de page, et leurs textes ne contiennent ni prix, ni mention d'abonnement payant, ni lien d'achat (vérifié par `npm test`).
- `/PolitiqueConfidentialite` (ancienne URL des magasins) redirige en 301 vers `/application/confidentialite` (`public/.htaccess`).
- Une version publiée ne se modifie plus : on ajoute un fichier `<version>.md`, on le déclare dans `documents.json` et on change `versionEnVigueur`. Quand le statut d'une version n'est plus `projet`, son `sha256` doit être enregistré dans `documents.json` ; `npm test` échoue si le texte change ensuite.
- Le build publie `https://restoclair.fr/legal/index.json` (versions en vigueur), `https://restoclair.fr/legal/historique.json` (toutes les versions) et chaque texte sous `https://restoclair.fr/legal/<document>/<version>.md`. `npm run legal:index` affiche le même index en local.
- L'inscription envoie `cgvVersion` et `cgvSha256` de la version en vigueur ; un 409 `CGV_VERSION_OBSOLETE` demande de recharger la page pour accepter la nouvelle version. Au checkout, le compte existe déjà et la page n'a plus de case à cocher : le même code renvoie vers l'espace client ou le téléphone.

Format de l'index (une entrée par document) :

```json
{ "document": "cgv", "version": "0.1", "enVigueurLe": "2026-11-03", "sha256": "…", "url": "https://restoclair.fr/cgv/0.1", "markdown": "https://restoclair.fr/legal/cgv/0.1.md", "statut": "projet" }
```

### Calcul de l'empreinte (identique pour le site, l'application et Apirest)

`sha256` est calculé sur le texte publié, normalisé ainsi (`scripts/legal.mjs`, `normaliserTexteLegal`) :

1. décoder le fichier en UTF-8 et retirer la marque d'ordre des octets (BOM) s'il y en a une ;
2. remplacer chaque fin de ligne `\r\n` ou `\r` par `\n` ;
3. retirer le bandeau « projet » : le bloc de lignes consécutives commençant par `>` qui contient « Projet à faire relire par un avocat », ainsi que la ligne vide qui le suit immédiatement ;
4. supprimer les `\n` en fin de texte, puis en ajouter exactement un ;
5. empreinte : SHA-256 des octets UTF-8 du résultat, en hexadécimal minuscule.

Le texte affiché à l'utilisateur peut garder le bandeau : il n'entre pas dans l'empreinte.
