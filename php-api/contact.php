<?php
// Demandes de contact (page /Contact) -> table Airtable "Base de donnée client"
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/securite.php';
require_once __DIR__ . '/config.php';
setCorsHeaders();

// Cet envoi écrit dans Airtable : seul le site peut l'appeler, quelle que soit la liste de config.php.
const ORIGINES_SITE = ['https://restoclair.fr', 'https://www.restoclair.fr'];
const TAILLE_MAX = 20000;
const LIMITE_10_MIN = 5;
const LIMITE_24_H = 20;

function repondre($code, $corps) {
    http_response_code($code);
    echo json_encode($corps);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    repondre(405, ['success' => false, 'error' => 'Méthode non autorisée']);
}

if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '', ORIGINES_SITE, true)) {
    repondre(403, ['success' => false, 'error' => 'Origine non autorisée']);
}

$brut = file_get_contents('php://input');
if (strlen($brut) > TAILLE_MAX) {
    repondre(413, ['success' => false, 'error' => 'Requête trop longue']);
}

$input = json_decode($brut, true);
if (!is_array($input)) {
    repondre(400, ['success' => false, 'error' => 'Requête invalide']);
}

function clean($value, $max) {
    if (!is_scalar($value)) return '';
    return mb_substr(trim(strip_tags((string)$value)), 0, $max);
}

// Pot de miel anti-spam : on répond "succès" sans rien enregistrer
if (clean($input['_honey'] ?? '', 100) !== '') {
    repondre(200, ['success' => true]);
}

// Options de liste Airtable. Le formulaire envoie subject ; service_type est l'ancien nom du champ.
const RAISONS = [
    'urgence' => 'Sos DDPP',
    'urgence_ddpp' => 'Sos DDPP',
    'audit' => 'Audit Hygiène',
    'audit_hygiene' => 'Audit Hygiène',
    'dossiers' => 'Accompagnement Administratif',
    'accompagnement_administratif' => 'Accompagnement Administratif',
    'autre' => 'Autre demande',
];
const URGENCES = [
    'urgent' => 'Urgent (contrôle en cours)',
    'normal' => 'Normal',
    'information' => 'Simple renseignement',
];

function formatPhone($phoneNumber) {
    if ($phoneNumber === '') return '';

    $cleaned = preg_replace('/[\s.\-]/', '', $phoneNumber);

    if (strpos($cleaned, '0') === 0) {
        $cleaned = '(+33) ' . implode(' ', str_split(substr($cleaned, 1), 2));
    }

    return $cleaned;
}

// Le formulaire envoie name et restaurant ; contact_name et restaurant_name sont les anciens noms des champs.
$nom        = clean($input['name'] ?? $input['contact_name'] ?? '', 100);
$restaurant = clean($input['restaurant'] ?? $input['restaurant_name'] ?? '', 150);
$email      = clean($input['email'] ?? '', 254);
$telephone  = clean($input['phone'] ?? '', 30);
$raison     = clean($input['subject'] ?? $input['service_type'] ?? '', 50);
$urgence    = clean($input['urgency'] ?? '', 50);
$message    = clean($input['message'] ?? '', 5000);

$errors = [];
if ($nom === '') $errors[] = 'name';
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if ($telephone !== '' && strlen(preg_replace('/\D/', '', $telephone)) < 6) $errors[] = 'phone';
if ($raison !== '' && !isset(RAISONS[$raison])) $errors[] = 'subject';
if ($urgence !== '' && !isset(URGENCES[$urgence])) $errors[] = 'urgency';

if ($errors) {
    repondre(422, ['success' => false, 'error' => 'Champs invalides', 'fields' => $errors]);
}

// Le formulaire actuel n'a plus de champ urgence : on la déduit du sujet, comme la version corrigée sur le serveur.
if ($urgence === '' && $raison !== '') {
    $urgence = ($raison === 'urgence' || $raison === 'urgence_ddpp') ? 'urgent' : 'normal';
}

// Limite d'envoi : le compteur garde une empreinte de l'adresse IP, jamais l'adresse.
// Une empreinte sans envoi depuis 24 h est effacée à la demande suivante, quelle qu'en soit l'origine.
// Si le dossier n'est pas accessible, on laisse passer : un client ne doit pas être bloqué par une panne du compteur.
function limiteDepassee($ip) {
    $dossier = sys_get_temp_dir() . '/restoclair_contact';
    if (!is_dir($dossier) && !@mkdir($dossier, 0700, true) && !is_dir($dossier)) {
        error_log('contact.php : dossier du compteur indisponible');
        return false;
    }

    $maintenant = time();
    $fichier = @fopen($dossier . '/' . hash_hmac('sha256', $ip, AIRTABLE_TOKEN), 'c+');
    if (!$fichier || !flock($fichier, LOCK_EX)) {
        error_log('contact.php : compteur indisponible');
        return false;
    }

    $dates = json_decode(stream_get_contents($fichier), true);
    $dates = array_values(array_filter(is_array($dates) ? $dates : [], fn($d) => is_int($d) && $d > $maintenant - 86400));
    $recentes = array_filter($dates, fn($d) => $d > $maintenant - 600);
    $depassee = count($recentes) >= LIMITE_10_MIN || count($dates) >= LIMITE_24_H;

    if (!$depassee) $dates[] = $maintenant;
    ftruncate($fichier, 0);
    rewind($fichier);
    fwrite($fichier, json_encode($dates));
    flock($fichier, LOCK_UN);
    fclose($fichier);

    foreach (glob($dossier . '/*') ?: [] as $ancien) {
        if (filemtime($ancien) < $maintenant - 86400) @unlink($ancien);
    }

    return $depassee;
}

if (limiteDepassee($_SERVER['REMOTE_ADDR'] ?? '')) {
    header('Retry-After: 600');
    repondre(429, ['success' => false, 'error' => 'Trop de demandes, réessayez plus tard']);
}

$fields = array_filter([
    'Nom du client' => $nom,
    'Adresse Mail' => $email,
    'Numéro de téléphone (contact)' => formatPhone($telephone),
    'Raison de la prise de contact' => RAISONS[$raison] ?? '',
    'Message' => $message,
    'Urgence' => URGENCES[$urgence] ?? '',
    'Demande spécifique' => $restaurant,
    "Nom de l'établissement" => $restaurant,
], fn($valeur) => $valeur !== '');

$result = airtableRequest('Base%20de%20donn%C3%A9e%20client', 'POST', [
    'records' => [['fields' => $fields]],
    'typecast' => true,
]);

if (($result['status'] ?? 500) !== 200) {
    error_log('contact.php Airtable error: ' . json_encode($result));
    repondre(502, ['success' => false, 'error' => 'Enregistrement impossible']);
}

echo json_encode(['success' => true, 'id' => $result['data']['records'][0]['id'] ?? null]);
