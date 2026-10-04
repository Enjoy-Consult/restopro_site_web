<?php
// Demandes d'essai gratuit (page /essai-gratuit) -> table Airtable "DemandesEssai"
require_once __DIR__ . '/config.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Méthode non autorisée']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Requête invalide']);
    exit();
}

// Pot de miel anti-spam : on répond "succès" sans rien enregistrer
if (trim((string)($input['_honey'] ?? '')) !== '') {
    echo json_encode(['success' => true]);
    exit();
}

function clean($value, $max) {
    $value = trim(strip_tags((string)$value));
    return mb_substr($value, 0, $max);
}

$nom        = clean($input['nom'] ?? '', 100);
$prenom     = clean($input['prenom'] ?? '', 100);
$entreprise = clean($input['entreprise'] ?? '', 150);
$poste      = clean($input['poste'] ?? '', 150);
$telephone  = clean($input['telephone'] ?? '', 30);
$email      = clean($input['email'] ?? '', 254);
$consent    = !empty($input['consentement']);

$errors = [];
foreach (['nom' => $nom, 'prenom' => $prenom, 'entreprise' => $entreprise, 'poste' => $poste, 'telephone' => $telephone] as $k => $v) {
    if ($v === '') $errors[] = $k;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) $errors[] = 'email';
if (strlen(preg_replace('/\D/', '', $telephone)) < 6) $errors[] = 'telephone';
if (!$consent) $errors[] = 'consentement';

if ($errors) {
    http_response_code(422);
    echo json_encode(['success' => false, 'error' => 'Champs invalides', 'fields' => array_values(array_unique($errors))]);
    exit();
}

$result = airtableRequest('DemandesEssai', 'POST', [
    'records' => [[
        'fields' => [
            'Nom'                => $nom,
            'Prénom'             => $prenom,
            'Entreprise'         => $entreprise,
            'Poste'              => $poste,
            'Téléphone'          => $telephone,
            'Email'              => $email,
            'Consentement'       => true,
            'Rappelé'            => false,
            'Date de la demande' => gmdate('c'),
            'Source'             => 'restoclair.fr/essai-gratuit',
        ],
    ]],
]);

if (($result['status'] ?? 500) !== 200) {
    error_log('essai.php Airtable error: ' . json_encode($result));
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Enregistrement impossible']);
    exit();
}

echo json_encode(['success' => true, 'id' => $result['data']['records'][0]['id'] ?? null]);
