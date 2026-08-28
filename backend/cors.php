<?php
declare(strict_types=1);

/**
 * Shared CORS bootstrap, required at the top of every backend entrypoint.
 *
 * Local dev normally goes through the Vite dev-server proxy (same origin as
 * the PHP server, so the browser never sends a cross-origin request and none
 * of this matters). This file exists for a genuinely cross-origin deployment
 * (frontend served from a different host/port than this PHP backend).
 *
 * Configure allowed origins via the VEAU_ALLOWED_ORIGINS env var
 * (comma-separated). Falls back to the default Vite dev-server ports.
 */

$allowedOrigins = array_values(array_filter(array_map(
    'trim',
    explode(',', (string) (getenv('VEAU_ALLOWED_ORIGINS') ?: ''))
)));

if (empty($allowedOrigins)) {
    $allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ];
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
