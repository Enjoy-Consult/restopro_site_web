<?php
require_once __DIR__ . '/config.php';
setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Methode non autorisee']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Donnees invalides']);
    exit();
}

function mapServiceType($value) {
    $mapping = [
        'urgence_ddpp' => 'Sos DDPP',
        'audit_hygiene' => 'Audit Hygiène',
        'accompagnement_administratif' => 'Accompagnement Administratif',
        'autre' => 'Autre demande'
    ];
    return $mapping[$value] ?? $value;
}

function mapUrgency($value) {
    $mapping = [
        'urgent' => 'Urgent (contrôle en cours)',
        'normal' => 'Normal',
        'information' => 'Simple renseignement'
    ];
    return $mapping[$value] ?? $value;
}

function formatPhone($phoneNumber) {
    if (empty($phoneNumber)) return '';

    $cleaned = preg_replace('/[\s.\-]/', '', $phoneNumber);

    if (strpos($cleaned, '0') === 0) {
        $cleaned = '(+33) ' . implode(' ', str_split(substr($cleaned, 1), 2));
    }

    return $cleaned;
}

$airtableData = [
    'records' => [
        [
            'fields' => [
                'Nom du client' => $input['contact_name'] ?? '',
                'Adresse Mail' => $input['email'] ?? '',
                'Numéro de téléphone (contact)' => formatPhone($input['phone'] ?? ''),
                'Raison de la prise de contact' => mapServiceType($input['service_type'] ?? ''),
                'Message' => $input['message'] ?? '',
                'Urgence' => mapUrgency($input['urgency'] ?? ''),
                'Demande spécifique' => $input['restaurant_name'] ?? ''
            ]
        ]
    ],
    'typecast' => true
];

$result = airtableRequest('Base%20de%20donn%C3%A9e%20client', 'POST', $airtableData);

if ($result['status'] !== 200) {
    http_response_code($result['status']);
    echo json_encode(['error' => 'Erreur API Airtable', 'details' => $result]);
    exit();
}

echo json_encode(['success' => true, 'data' => $result['data']]);
