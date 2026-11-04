#!/bin/sh
# Installe deploiement/nginx-securite.conf dans le service Web Station de restoclair.fr.
# DSM : Panneau de configuration > Planificateur de tâches > Créer > Tâche planifiée > Script défini par l'utilisateur.
# Utilisateur : root. Désactiver la planification, coller ce script, enregistrer, puis « Exécuter » une seule fois.
# Le script s'arrête sans rien changer si le service n'est pas celui attendu. Si nginx refuse le bloc, il le retire.
# Pour annuler : supprimer le fichier user.conf indiqué à la fin, puis lancer synosystemctl restart nginx.
set -u
SITE="restoclair.fr"
RACINE="/usr/local/etc/nginx"

arret() { echo "ARRET, rien n'a été changé : $1"; exit 1; }

W3CONF=$(grep -l "$SITE" "$RACINE"/sites-available/*.w3conf 2>/dev/null)
[ "$(printf '%s\n' "$W3CONF" | grep -c .)" = "1" ] || arret "il faut un seul fichier .w3conf pour $SITE, trouvé : $W3CONF"

SERVICE=$(grep -o "$RACINE/conf.d/\.service\.[^ ;]*\.conf" "$W3CONF" | tail -n 1)
[ -n "$SERVICE" ] && [ -f "$SERVICE" ] || arret "fichier .service introuvable dans $W3CONF"

UUID=$(basename "$SERVICE" .conf | awk -F. '{print $NF}')
CIBLE="$RACINE/conf.d/$UUID/user.conf"
grep -q "$CIBLE" "$SERVICE" || arret "$SERVICE n'inclut pas $CIBLE"
[ ! -e "$CIBLE" ] || arret "$CIBLE existe déjà : à fusionner à la main"

mkdir -p "$RACINE/conf.d/$UUID"
cat > "$CIBLE" <<'BLOC_NGINX'
# Sécurité de restoclair.fr : à placer dans le bloc server du site (fichier user.conf de Web Station).
# Le .htaccess n'a aucun effet : nginx ne le lit pas.

# Chemins commençant par un point (.git, .claude, .DS_Store, .htaccess, .env...), à tous les niveaux.
# /.well-known/ reste ouvert : le renouvellement du certificat Let's Encrypt en a besoin.
location ~ "/\.(?!well-known(?:/|$))" {
    return 404;
}

# Dossier local et fichiers de test, en attendant qu'ils soient retirés du serveur.
location ^~ /_to_delete/ {
    return 404;
}
location = /php-api/test.php {
    return 404;
}
location = /php-api/test-airtable.php {
    return 404;
}
location = /php-api/LISEZMOI.txt {
    return 404;
}

add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
# Dans script-src, les deux empreintes autorisent les scripts écrits dans index.html :
# - sha256-QULh... : consentement refusé par défaut (après la sortie du correctif du consentement) ;
# - sha256-15DG... : ancien chargeur de Google Tag Manager, à retirer dès que ce correctif est en ligne.
# Toute modification de ces scripts dans index.html change leur empreinte : il faut alors mettre ce bloc à jour.
# fonts.googleapis.com et fonts.gstatic.com : à retirer quand les polices seront hébergées par le site.
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'sha256-QULhTizkQlJ6JUqllmQ/4QmXkIrNQiHe5223lqFSIPk=' 'sha256-15DGBmnrCkuUqxqlfaOCBOGqt/B+rEJMzRvOTHgZqEU=' https://www.googletagmanager.com https://www.googleadservices.com https://www.google.com https://googleads.g.doubleclick.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://restoclair.fr https://api.restoclair.fr https://formsubmit.co https://www.googletagmanager.com https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com https://www.google.fr https://ad.doubleclick.net https://stats.g.doubleclick.net https://*.analytics.google.com https://*.google-analytics.com; frame-src https://www.googletagmanager.com https://td.doubleclick.net; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
BLOC_NGINX

if ! nginx -t; then
  rm -f "$CIBLE"
  echo "ERREUR : nginx refuse ce bloc, il a été retiré. Le site n'a pas changé."
  exit 1
fi

synosystemctl restart nginx
echo "OK : bloc installé dans $CIBLE"
