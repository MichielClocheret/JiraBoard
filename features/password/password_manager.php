<?php
declare(strict_types=1);

header('Content-Type: application/json');

$configPath = __DIR__ . '/../../Api/config.php';
if (!file_exists($configPath)) {
    respondError('Missing config.php.', 500);
}

/** @var array<string,mixed> $config */
$config = require $configPath;

require_once __DIR__ . '/../chat/chat-db.php';

try {
    $pdo = getChatPdo($config);
    ensurePasswordProjectsTableExists($pdo);
} catch (Throwable $e) {
    respondError('Database is not available: ' . $e->getMessage(), 500);
}

$action = (string)($_REQUEST['action'] ?? 'list');

switch ($action) {
    case 'list':
        handleList($pdo);
        break;

    case 'create':
        requirePost();
        handleCreate($pdo);
        break;

    case 'update':
        requirePost();
        handleUpdate($pdo);
        break;

    case 'delete':
        requirePost();
        handleDelete($pdo);
        break;

    default:
        respondError('Unsupported action.', 400);
}

function requirePost(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respondError('This endpoint only accepts POST requests for this action.', 405);
    }
}

function handleList(PDO $pdo): void
{
    $stmt = $pdo->query(
        'SELECT id, project_name, entry_type, login_username, login_password, licence_key, created_at
         FROM veau_password_projects
         ORDER BY created_at DESC, id DESC
         LIMIT 300'
    );

    $projects = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $projects[] = [
            'id' => (int)($row['id'] ?? 0),
            'projectName' => (string)($row['project_name'] ?? ''),
            'entryType' => (string)($row['entry_type'] ?? ''),
            'loginUsername' => (string)($row['login_username'] ?? ''),
            'loginPassword' => (string)($row['login_password'] ?? ''),
            'licenceKey' => (string)($row['licence_key'] ?? ''),
            'createdAt' => (string)($row['created_at'] ?? ''),
        ];
    }

    respondSuccess(['projects' => $projects]);
}

function handleCreate(PDO $pdo): void
{
    $input = readPasswordProjectInput();

    $stmt = $pdo->prepare(
        'INSERT INTO veau_password_projects (project_name, entry_type, login_username, login_password, licence_key)
         VALUES (:projectName, :entryType, :loginUsername, :loginPassword, :licenceKey)'
    );
    $stmt->execute([
        ':projectName' => $input['projectName'],
        ':entryType' => $input['entryType'],
        ':loginUsername' => $input['entryType'] === 'login' && $input['loginUsername'] !== '' ? $input['loginUsername'] : null,
        ':loginPassword' => $input['entryType'] === 'login' && $input['loginPassword'] !== '' ? $input['loginPassword'] : null,
        ':licenceKey' => $input['entryType'] === 'licence' && $input['licenceKey'] !== '' ? $input['licenceKey'] : null,
    ]);

    respondSuccess([
        'message' => 'Password project saved.',
        'id' => (int)$pdo->lastInsertId(),
    ]);
}

function handleUpdate(PDO $pdo): void
{
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        respondError('Missing password project id.', 422);
    }

    $input = readPasswordProjectInput();

    $stmt = $pdo->prepare(
        'UPDATE veau_password_projects
         SET project_name = :projectName,
             entry_type = :entryType,
             login_username = :loginUsername,
             login_password = :loginPassword,
             licence_key = :licenceKey
         WHERE id = :id
         LIMIT 1'
    );
    $stmt->execute([
        ':id' => $id,
        ':projectName' => $input['projectName'],
        ':entryType' => $input['entryType'],
        ':loginUsername' => $input['entryType'] === 'login' && $input['loginUsername'] !== '' ? $input['loginUsername'] : null,
        ':loginPassword' => $input['entryType'] === 'login' && $input['loginPassword'] !== '' ? $input['loginPassword'] : null,
        ':licenceKey' => $input['entryType'] === 'licence' && $input['licenceKey'] !== '' ? $input['licenceKey'] : null,
    ]);

    respondSuccess([
        'message' => 'Password project updated.',
        'id' => $id,
    ]);
}

function handleDelete(PDO $pdo): void
{
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        respondError('Missing password project id.', 422);
    }

    $stmt = $pdo->prepare(
        'DELETE FROM veau_password_projects WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $id]);

    if ($stmt->rowCount() < 1) {
        respondError('Password project not found.', 404);
    }

    respondSuccess([
        'message' => 'Password project deleted.',
        'id' => $id,
    ]);
}

/**
 * @return array{projectName:string,entryType:string,loginUsername:string,loginPassword:string,licenceKey:string}
 */
function readPasswordProjectInput(): array
{
    $projectName = trim((string)($_POST['projectName'] ?? ''));
    if ($projectName === '') {
        respondError('Project name is required.', 422);
    }
    if (mb_strlen($projectName) > 190) {
        respondError('Project name must be 190 characters or fewer.', 422);
    }

    $entryType = strtolower(trim((string)($_POST['entryType'] ?? '')));
    if (!in_array($entryType, ['login', 'licence'], true)) {
        respondError('Please choose login or licence.', 422);
    }

    $loginUsername = trim((string)($_POST['loginUsername'] ?? ''));
    $loginPassword = trim((string)($_POST['loginPassword'] ?? ''));
    $licenceKey = trim((string)($_POST['licenceKey'] ?? ''));

    if ($entryType === 'login' && $loginUsername === '' && $loginPassword === '') {
        respondError('Please fill in a username or password.', 422);
    }

    if ($entryType === 'licence' && $licenceKey === '') {
        respondError('Please fill in the licence key.', 422);
    }

    return [
        'projectName' => $projectName,
        'entryType' => $entryType,
        'loginUsername' => $loginUsername,
        'loginPassword' => $loginPassword,
        'licenceKey' => $licenceKey,
    ];
}

function ensurePasswordProjectsTableExists(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'veau_password_projects'
         LIMIT 1"
    );

    if (!$stmt->fetchColumn()) {
        $pdo->exec(
            'CREATE TABLE veau_password_projects (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_name VARCHAR(190) NOT NULL,
                entry_type VARCHAR(20) NOT NULL,
                login_username VARCHAR(255) NULL,
                login_password VARCHAR(255) NULL,
                licence_key TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_project_name (project_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }
}

/**
 * @param array<string,mixed> $data
 */
function respondSuccess(array $data = []): void
{
    echo json_encode(array_merge(['success' => true], $data), JSON_UNESCAPED_UNICODE);
    exit;
}

function respondError(string $message, int $statusCode = 400): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
