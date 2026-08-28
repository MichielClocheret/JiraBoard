<?php
declare(strict_types=1);

// First-run setup: GET reports whether backend/Api/config.php exists yet
// (plus DB defaults sourced from the environment, so a Docker Compose
// deployment can pre-fill them); POST writes config.php from form/JSON
// input after verifying the Jira credentials actually work. Deliberately
// does NOT require api.helper.php - that file itself requires config.php
// to exist, which is exactly the thing this endpoint exists to create.

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config_path.php';

header('Content-Type: application/json');

function setup_respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

$configPath = app_config_path();
$method     = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    setup_respond([
        'ok'         => true,
        'configured' => is_file($configPath),
        // Pre-fill hints only - never secrets the user hasn't already put
        // in their own environment (e.g. Docker Compose's `db` service).
        'defaults'   => [
            'db_host'       => getenv('DB_HOST') ?: 'localhost',
            'db_name'       => getenv('DB_NAME') ?: 'jira_chat',
            'db_user'       => getenv('DB_USER') ?: 'root',
            'db_password'   => getenv('DB_PASSWORD') ?: '',
            'jira_base_url' => getenv('JIRA_BASE_URL') ?: '',
        ],
    ]);
}

if ($method !== 'POST') {
    setup_respond(['ok' => false, 'error' => 'Method not allowed.'], 405);
}

// Never silently overwrite an existing config via this endpoint - once
// set up, changes go through the file directly (or delete it to re-run
// setup), same convention as most self-hosted app installers.
if (is_file($configPath)) {
    setup_respond(['ok' => false, 'error' => 'Already configured. Edit backend/Api/config.php directly, or delete it to run setup again.'], 409);
}

$input = $_POST;
if (empty($input)) {
    $decoded = json_decode((string) file_get_contents('php://input'), true);
    if (is_array($decoded)) {
        $input = $decoded;
    }
}

$required = ['jira_base_url', 'jira_email', 'jira_api_token', 'db_host', 'db_name', 'db_user'];
foreach ($required as $key) {
    if (trim((string) ($input[$key] ?? '')) === '') {
        setup_respond(['ok' => false, 'error' => "Missing required field: {$key}"], 422);
    }
}

$jiraBaseUrl = rtrim(trim((string) $input['jira_base_url']), '/');
$jiraEmail   = trim((string) $input['jira_email']);
$jiraToken   = trim((string) $input['jira_api_token']);

if (!preg_match('#^https?://#i', $jiraBaseUrl)) {
    setup_respond(['ok' => false, 'error' => 'Jira URL must start with https:// (e.g. https://your-domain.atlassian.net).'], 422);
}

// Verify the Jira credentials actually work before writing anything.
$ch = curl_init($jiraBaseUrl . '/rest/api/3/myself');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_USERPWD        => $jiraEmail . ':' . $jiraToken,
    CURLOPT_HTTPAUTH       => CURLAUTH_BASIC,
    CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    CURLOPT_TIMEOUT        => 10,
]);
$raw       = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);

if ($raw === false) {
    setup_respond(['ok' => false, 'error' => "Could not reach Jira at {$jiraBaseUrl}: {$curlError}"], 422);
}
if ($httpCode >= 400) {
    setup_respond(['ok' => false, 'error' => "Jira rejected these credentials (HTTP {$httpCode}). Double-check the URL, email, and API token."], 422);
}

$config = [
    'jira_base_url'  => $jiraBaseUrl,
    'jira_email'     => $jiraEmail,
    'jira_api_token' => $jiraToken,
    'db_host'        => trim((string) $input['db_host']),
    'db_name'        => trim((string) $input['db_name']),
    'db_user'        => trim((string) $input['db_user']),
    'db_password'    => (string) ($input['db_password'] ?? ''),
];

$finderRoot = trim((string) ($input['finder_root'] ?? ''));
if ($finderRoot !== '') {
    $config['finder_root'] = $finderRoot;
}

$php = "<?php\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";

if (@file_put_contents($configPath, $php) === false) {
    setup_respond(['ok' => false, 'error' => 'Could not write backend/Api/config.php - check that the Api/ folder is writable.'], 500);
}

setup_respond(['ok' => true]);
