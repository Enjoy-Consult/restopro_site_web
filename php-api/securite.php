<?php
// En-têtes de sécurité des réponses de l'API. Le site, lui, reçoit les siens de nginx (deploiement/nginx-securite.conf).
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
