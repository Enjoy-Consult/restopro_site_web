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

En mode maquette (`VITE_BILLING_MOCK=true`), l'API est simulée. L'adresse e-mail saisie à l'inscription choisit le scénario (voir `src/lib/billing/mock.js`) : `existant@`, `indispo@`, `ko@`, `role@`, `comptes@`, `expire@` (401), `refus@` (403), `bloque@` (403 sur la page de retour), `sepa@`, `lent@`, `validation@`, `validationautre@` (400 VALIDATION_ERROR), `cgvobsolete@`, `cgvpaiement@`, `dejaactif@`, `gere@`, ou un SIRET commençant par `000000`. La page `/abonnement/reprendre` (reprise d'une inscription non payée, par un lien reçu par e-mail) se teste avec `/abonnement/reprendre#jeton=maquette-reprise-valide`, ou `-expire`, `-utilise`, `-actif`, `-activation`, `-indispo`, `-trop` ; la demande d'un lien accepte toute adresse, sauf `trop@`, `indispo@` et `validation@`. Avec `npm run dev` seulement, `annule@` et le paramètre `?maquette=` (par exemple `/abonnement/retour?maquette=impaye`, liste dans le même fichier) simulent l'annulation, chaque statut de compte, le 401 et le 429.

**Hors du site de production** (`src/lib/environnement.js`). Seul un build `vite build`, en mode `production`, charge Google et écrit vers `php-api/`. Sous `npm run dev` et dans un build `vite build --mode test` (site de test), le bandeau des cookies ne s'affiche pas, Google Tag Manager n'est jamais chargé, et le formulaire de contact comme la demande d'essai n'envoient rien : un message le dit à l'écran. Le blog et les avis restent lus depuis la production. Même en production, Google n'est jamais chargé sur `/application/…`, `/abonnement/reprendre` et `/mon-abonnement…`.

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

**Le piège : ne jamais activer `VITE_BILLING_ACTIF` sur `main` avant la fusion de `feature/abonnements`.** La variable appartient au dépôt, pas à une branche : déjà active, elle s'appliquerait au premier build de la fusion. Soit la fusion publie directement la vente, sans étape de vérification, soit le garde-fou refuse le build et plus rien ne se publie depuis `main`, même une correction sans rapport. Fusionner d'abord, activer ensuite.

**Garde-fou.** Avec `VITE_BILLING_ACTIF=true`, le build de production échoue, en disant pourquoi, si `cgv`, `accord-sous-traitance` ou `cgu-app` ont le statut `projet` (ou un statut inconnu) dans leur version en vigueur, ou si `VITE_API_URL` ou `VITE_APP_WEB_URL` sont vides (`scripts/garde-fou-vente.mjs`). En cas d'échec, la branche `production` ne change pas. Ne sont pas concernés : `npm run dev`, la maquette et un build sans `VITE_BILLING_ACTIF`. Tant que la variable reste active, chaque push sur `main` repasse ce contrôle.

À vérifier à la main :

- **Documents.** `cgv`, `accord-sous-traitance` et `cgu-app` sont validés : statut `publie`, `sha256` enregistré, sans bandeau ni marque jaune. Lancer `npm test`, qui contrôle ces textes : le workflow ne le lance pas. `mentions-legales`, `confidentialite-site`, `cookies` et `confidentialite-app` ne bloquent pas le build : les relire aussi.
- **API.** Les routes `/api/billing/catalogue`, `/inscription`, `/checkout`, `/compte`, `/reprise/demande` et `/reprise` répondent sous `VITE_API_URL` (les noms des deux routes de reprise sont provisoires, à aligner sur Apirest). Apirest autorise les origines `https://restoclair.fr` et `https://www.restoclair.fr` (CORS), avec les en-têtes `Content-Type`, `X-Client-Type` et `Authorization`.
- **`SITE_URL` côté Apirest.** Elle vaut exactement `https://restoclair.fr`, sans `www` ni `/` final : les retours Stripe en dépendent.
- **Retours Stripe.** Adresses relevées dans le code d'Apirest : succès `{SITE_URL}/abonnement/retour?session_id={CHECKOUT_SESSION_ID}`, annulation `{SITE_URL}/tarifs?paiement=annule`. À confirmer en production par un vrai passage sur la page de paiement, dans les deux sens.
- **Accès direct à `/abonnement/retour`, sur le serveur.** Stripe y ramène le client par une adresse directe. `https://restoclair.fr/abonnement/retour?session_id=essai`, ouverte dans un nouvel onglet, doit recevoir `index.html` et répondre 200, pas un 404 du serveur. Faire le même contrôle sur `/tarifs?paiement=annule` et sur `/abonnement/reprendre`, où mène le lien de reprise envoyé par e-mail. `public/.htaccess` ne vaut que sous Apache : nginx l'ignore, ainsi que sa redirection de `/PolitiqueConfidentialite` et ses blocages. Sous nginx, il faut l'équivalent dans la configuration du serveur (`try_files $uri $uri/ /index.html;`).
- **Redirection `www`.** `https://www.restoclair.fr/…` redirige en 301 vers `https://restoclair.fr/…`, chemin et paramètres compris. Le jeton de `sessionStorage` est propre à chaque origine : un client inscrit sur `www` reviendrait de Stripe sur l'adresse sans `www`, sans jeton, et la page de retour ne pourrait pas confirmer son paiement.

**Ordre d'ouverture :**

1. Mettre en production Apirest et le service de paiement, avec `SITE_URL` et le CORS.
2. Régler le serveur du site : accès direct et redirection `www`.
3. Fusionner `feature/abonnements` dans `main`, variable absente ou à `false`. Faire le pull depuis le DSM et vérifier que le site reste sans « Tarifs ».
4. Publier les documents validés sur `main`, avec `npm test` au vert.
5. Renseigner `VITE_API_URL` et `VITE_APP_WEB_URL`, puis mettre `VITE_BILLING_ACTIF` à `true`.
6. Relancer le workflow à la main, sur la branche `main` (Actions > Deploiement production > Run workflow) : changer une variable ne lance aucun build. Puis faire le pull depuis le DSM.
7. Vérifier le parcours en ligne : tarifs, inscription, paiement, retour, annulation.
8. Le jour de l'ouverture seulement, ajouter `/tarifs` à `public/sitemap.xml`, `src/pages/Sitemap.jsx` et `public/llms.txt`. Ne pas y mettre `/inscription` ni `/abonnement/retour`, exclues de l'indexation.

**Ordre de fermeture**, dans l'autre sens, pour qu'aucun visiteur n'arrive sur une page qui appelle une API coupée :

1. Retirer `/tarifs` de `public/sitemap.xml`, `src/pages/Sitemap.jsx` et `public/llms.txt`.
2. Mettre `VITE_BILLING_ACTIF` à `false`, relancer le workflow sur `main`, faire le pull depuis le DSM. Les pages et les liens disparaissent. Un client alors sur la page de Stripe revient sur une page introuvable : choisir une heure creuse.
3. Laisser l'API et les webhooks en service tant que des paiements peuvent arriver : une session Stripe reste ouverte 24 h par défaut.
4. Ne toucher au drapeau `BILLING_ACTIF` d'Apirest qu'ensuite, et seulement sans abonnement en cours : les abonnés gèrent leur compte depuis `VITE_APP_WEB_URL`, pas depuis ce site.

## Documents légaux

Source unique pour le site, l'application et l'API : `src/content/legal/<document>/<version>.md`, décrits dans `src/content/legal/documents.json` (version en vigueur, date d'entrée en vigueur `enVigueurLe`, statut).

| Document | Page en vigueur | Page d'une version |
|---|---|---|
| `mentions-legales` | `/MentionsLegales` | `/MentionsLegales/<version>` |
| `cgv` | `/cgv` | `/cgv/<version>` |
| `accord-sous-traitance` | `/accord-sous-traitance` | `/accord-sous-traitance/<version>` |
| `conditions-acheteurs-publics` | `/conditions-acheteurs-publics` | `/conditions-acheteurs-publics/<version>` |
| `confidentialite-site` | `/confidentialite` | `/confidentialite/<version>` |
| `cookies` | `/cookies` | `/cookies/<version>` |
| `cgu-app` | `/application/cgu` | `/application/cgu/<version>` |
| `confidentialite-app` | `/application/confidentialite` | `/application/confidentialite/<version>` |

- Les pages `/application/…` n'ont ni en-tête ni pied de page, et leurs textes ne contiennent ni prix, ni mention d'abonnement payant, ni lien d'achat (vérifié par `npm test`). Leurs versions en vigueur, recopiées dans les applications iOS et Android, ne citent ni moyen ni rythme de paiement, renvoient aux CGV par une phrase neutre et n'ont que des liens absolus.
- `/PolitiqueConfidentialite` (ancienne URL des magasins) redirige en 301 vers `/application/confidentialite` (`public/.htaccess`).
- Statuts admis dans `documents.json` : `projet` et `publie` (`STATUTS_ADMIS`, `scripts/legal.mjs`). Hors `projet`, un texte ne contient ni bandeau, ni marque jaune, ni renvoi `[À VALIDER…]` (vérifié par `npm test`). Toute portion de texte entre accents graves s'affiche en jaune.
- Une version publiée ne se modifie plus : on ajoute un fichier `<version>.md`, on le déclare dans `documents.json` et on change `versionEnVigueur`. Quand le statut d'une version n'est plus `projet`, son `sha256` doit être enregistré dans `documents.json` ; `npm test` échoue si le texte change ensuite.
- Le build publie `https://restoclair.fr/legal/index.json` (versions en vigueur), `https://restoclair.fr/legal/historique.json` (toutes les versions) et chaque texte sous `https://restoclair.fr/legal/<document>/<version>.md`. `npm run legal:index` affiche le même index en local.
- L'inscription et le checkout envoient `cgv: { version, sha256 }` de la version en vigueur (contrat final d'Apirest du 05/11, § D : bloc absent ou différent, 409 `CGV_VERSION_OBSOLETE`). À l'inscription, ce 409 demande de recharger la page pour accepter la nouvelle version. Au checkout, le compte existe déjà et la page n'a plus de case à cocher : le même code renvoie vers l'espace client ou le téléphone.

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
