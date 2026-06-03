<?php
declare(strict_types=1);

const CHAT_SESSION_LIFETIME_SECONDS = 2592000; // 30 days

ini_set('session.gc_maxlifetime', (string) CHAT_SESSION_LIFETIME_SECONDS);
ini_set('session.cookie_lifetime', (string) CHAT_SESSION_LIFETIME_SECONDS);

session_set_cookie_params([
    'lifetime' => CHAT_SESSION_LIFETIME_SECONDS,
    'path' => '/',
    'domain' => '',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_start();
header('Content-Type: application/json');

$chatConfig = require __DIR__ . '/../../Api/config.php';
require __DIR__ . '/chat-db.php';

try {
    $pdo = getChatPdo($chatConfig);
    ensureChatSchema($pdo);
} catch (Throwable $e) {
    respondError('Chat service is not available: ' . $e->getMessage(), 500);
}

$action = (string) ($_REQUEST['action'] ?? '');

if (isGuestAccess() && in_array($action, ['pinned_projects', 'pin_project', 'messages', 'send', 'delete_message'], true)) {
    respondError('Guests cannot access project chats.', 403);
}

switch ($action) {
    case 'login':
        requirePost();
        handleLogin($pdo, $chatConfig);
        break;

    case 'pinned_projects':
        handlePinnedProjects($pdo);
        break;

    case 'pin_project':
        requirePost();
        handlePinProject($pdo);
        break;

    case 'logout':
        requirePost();
        handleLogout();
        break;

    case 'whoami':
        handleWhoAmI($pdo);
        break;

    case 'messages':
        handleFetchMessages($pdo);
        break;

    case 'send':
        requirePost();
        handleSendMessage($pdo);
        break;

    case 'delete_message':
        requirePost();
        handleDeleteMessage($pdo);
        break;

    case 'change_password':
        requirePost();
        handleChangePassword($pdo);
        break;

    default:
        respondError('Unsupported action.', 400);
}

function requirePost(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('This endpoint only accepts POST requests.', 405);
    }
}

function isGuestAccess(): bool
{
    return currentUserId() === null;
}

function handleLogin(PDO $pdo, array $config): void
{
    $accountId = normalizeAccountId((string) ($_POST['accountId'] ?? ($_COOKIE['username'] ?? '')));
    $password  = (string) ($_POST['password'] ?? '');

    if ($accountId === '') {
        respondError('Select a user first before signing in.', 422);
    }

    if (strlen($password) < 6) {
        respondError('Password must be at least 6 characters long.', 422);
    }

    $displayName = trim((string) ($_POST['displayName'] ?? ''));
    $profile     = resolveJiraProfileByAccountId($accountId, $config);

    if ($displayName === '') {
        $displayName = trim((string) ($profile['displayName'] ?? ''));
    }

    $email = strtolower(trim((string) ($profile['email'] ?? '')));
    $email = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;

    if ($displayName === '') {
        $displayName = $accountId;
    }

    if (mb_strlen($displayName) > 120) {
        $displayName = mb_substr($displayName, 0, 120);
    }

    $user = findUserByAccountId($pdo, $accountId);

    if (!$user && $email !== null) {
        $user = findUserByEmail($pdo, $email);
        if ($user && empty($user['jira_account_id'])) {
            $linkStmt = $pdo->prepare('UPDATE chat_users SET jira_account_id = :accountId WHERE id = :id');
            $linkStmt->execute([':accountId' => $accountId, ':id' => $user['id']]);
            $user['jira_account_id'] = $accountId;
        }
    }

    if ($user) {
        if (!password_verify($password, $user['password_hash'])) {
            respondError('Incorrect password for this user.', 401);
        }

        if ($displayName !== $user['display_name']) {
            $stmt = $pdo->prepare('UPDATE chat_users SET display_name = :displayName WHERE id = :id');
            $stmt->execute([':displayName' => $displayName, ':id' => $user['id']]);
        }

        if ($email !== null && ($user['email'] ?? null) !== $email) {
            $stmt = $pdo->prepare('UPDATE chat_users SET email = :email WHERE id = :id');
            $stmt->execute([':email' => $email, ':id' => $user['id']]);
        }

        completeLogin((int) $user['id']);
        respondSuccess(['user' => ['id' => (int) $user['id'], 'displayName' => $displayName, 'email' => $email]]);
        return;
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO chat_users (display_name, email, password_hash, jira_account_id) VALUES (:displayName, :email, :passwordHash, :accountId)'
    );
    $insertStmt->execute([
        ':displayName'  => $displayName,
        ':email'        => $email,
        ':passwordHash' => password_hash($password, PASSWORD_DEFAULT),
        ':accountId'    => $accountId,
    ]);

    $userId = (int) $pdo->lastInsertId();
    completeLogin($userId);
    respondSuccess(['user' => ['id' => $userId, 'displayName' => $displayName, 'email' => $email ?? '']]);
}

function handlePinnedProjects(PDO $pdo): void
{
    $userId = currentUserId();
    if ($userId === null) {
        respondSuccess(['projects' => []]);
    }

    $stmt = $pdo->prepare(
        'SELECT project_key, project_name
         FROM chat_pinned_projects
         WHERE user_id = :userId
         ORDER BY created_at DESC, id DESC'
    );
    $stmt->execute([':userId' => $userId]);

    $projects = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $projects[] = [
            'projectKey'  => strtoupper((string) ($row['project_key'] ?? '')),
            'projectName' => (string) ($row['project_name'] ?? ''),
        ];
    }

    respondSuccess(['projects' => $projects]);
}

function handlePinProject(PDO $pdo): void
{
    $userId = currentUserId();
    if ($userId === null) {
        respondError('Sign in to pin chats.', 401);
    }

    $projectKey  = normalizeProjectKey((string) ($_POST['projectKey'] ?? ''));
    $projectName = trim((string) ($_POST['projectName'] ?? $projectKey));
    $pinned      = (string) ($_POST['pinned'] ?? '1') === '1';

    if ($projectKey === '') {
        respondError('Project key is required.', 422);
    }

    if ($pinned) {
        $stmt = $pdo->prepare(
            'INSERT INTO chat_pinned_projects (user_id, project_key, project_name)
             VALUES (:userId, :projectKey, :projectName)
             ON DUPLICATE KEY UPDATE project_name = VALUES(project_name)'
        );
        $stmt->execute([
            ':userId'      => $userId,
            ':projectKey'  => $projectKey,
            ':projectName' => $projectName !== '' ? $projectName : $projectKey,
        ]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM chat_pinned_projects WHERE user_id = :userId AND project_key = :projectKey');
        $stmt->execute([':userId' => $userId, ':projectKey' => $projectKey]);
    }

    respondSuccess(['projectKey' => $projectKey, 'pinned' => $pinned]);
}

function handleLogout(): void
{
    $_SESSION = [];

    $cookieParams = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 3600,
        'path'     => $cookieParams['path'] ?: '/',
        'domain'   => $cookieParams['domain'] ?? '',
        'secure'   => (bool) ($cookieParams['secure'] ?? false),
        'httponly' => (bool) ($cookieParams['httponly'] ?? true),
        'samesite' => $cookieParams['samesite'] ?? 'Lax',
    ]);

    if (session_status() === PHP_SESSION_ACTIVE) {
        session_destroy();
    }

    respondSuccess(['message' => 'Logged out.']);
}

function handleWhoAmI(PDO $pdo): void
{
    $userId = currentUserId();
    if ($userId === null) {
        respondSuccess(['user' => null]);
        return;
    }

    $stmt = $pdo->prepare('SELECT id, display_name, email, jira_account_id FROM chat_users WHERE id = :id');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        respondSuccess(['user' => null]);
        return;
    }

    respondSuccess(['user' => [
        'id'            => (int) $user['id'],
        'displayName'   => $user['display_name'],
        'email'         => $user['email'],
        'jiraAccountId' => $user['jira_account_id'] ?? null,
    ]]);
}

function handleFetchMessages(PDO $pdo): void
{
    $projectKey = normalizeProjectKey((string) ($_GET['projectKey'] ?? ''));
    $afterId    = (int) ($_GET['afterId'] ?? 0);

    if ($projectKey === '') {
        respondError('Provide a project key to load chat messages.', 422);
    }

    if ($afterId > 0) {
        $stmt = $pdo->prepare(
            'SELECT m.id, m.message, m.created_at, u.display_name, u.id AS user_id,
                rm.id AS reply_id, rm.message AS reply_message,
                ru.display_name AS reply_display_name
             FROM chat_messages m
             INNER JOIN chat_users u ON u.id = m.user_id
             LEFT JOIN chat_messages rm ON rm.id = m.reply_to_message_id
             LEFT JOIN chat_users ru ON ru.id = rm.user_id
             WHERE m.project_key = :projectKey AND m.id > :afterId
             ORDER BY m.created_at ASC, m.id ASC
             LIMIT 200'
        );
        $stmt->execute([':projectKey' => $projectKey, ':afterId' => $afterId]);
    } else {
        $stmt = $pdo->prepare(
            'SELECT m.id, m.message, m.created_at, u.display_name, u.id AS user_id,
                rm.id AS reply_id, rm.message AS reply_message,
                ru.display_name AS reply_display_name
             FROM chat_messages m
             INNER JOIN chat_users u ON u.id = m.user_id
             LEFT JOIN chat_messages rm ON rm.id = m.reply_to_message_id
             LEFT JOIN chat_users ru ON ru.id = rm.user_id
             WHERE m.project_key = :projectKey
             ORDER BY m.created_at ASC, m.id ASC
             LIMIT 200'
        );
        $stmt->execute([':projectKey' => $projectKey]);
    }

    $messages = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $replyId    = (int) ($row['reply_id'] ?? 0);
        $messages[] = [
            'id'          => (int) $row['id'],
            'message'     => (string) $row['message'],
            'createdAt'   => formatIsoDate($row['created_at']),
            'displayName' => $row['display_name'],
            'userId'      => (int) $row['user_id'],
            'reply'       => $replyId > 0 ? [
                'id'          => $replyId,
                'displayName' => (string) ($row['reply_display_name'] ?? 'Unknown user'),
                'message'     => (string) ($row['reply_message'] ?? ''),
            ] : null,
        ];
    }

    respondSuccess(['messages' => $messages]);
}

function handleSendMessage(PDO $pdo): void
{
    $userId = currentUserId();
    if ($userId === null) {
        respondError('Sign in to send messages.', 401);
    }

    $projectKey        = normalizeProjectKey((string) ($_POST['projectKey'] ?? ''));
    $message           = trim((string) ($_POST['message'] ?? ''));
    $replyToMessageId  = (int) ($_POST['replyToMessageId'] ?? 0);

    if ($projectKey === '') {
        respondError('Project key is required.', 422);
    }

    if ($message === '' || mb_strlen($message) > 1000) {
        respondError('Message must be between 1 and 1000 characters.', 422);
    }

    if ($replyToMessageId > 0 && !messageExistsInProject($pdo, $replyToMessageId, $projectKey)) {
        respondError('You can only reply to an existing message in this project.', 422);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO chat_messages (project_key, user_id, message, reply_to_message_id)
         VALUES (:projectKey, :userId, :message, :replyToMessageId)'
    );
    $stmt->execute([
        ':projectKey'       => $projectKey,
        ':userId'           => $userId,
        ':message'          => $message,
        ':replyToMessageId' => $replyToMessageId > 0 ? $replyToMessageId : null,
    ]);

    respondSuccess(['message' => 'Saved.']);
}

function handleDeleteMessage(PDO $pdo): void
{
    $userId    = currentUserId();
    if ($userId === null) {
        respondError('Sign in to delete messages.', 401);
    }

    $messageId = (int) ($_POST['messageId'] ?? 0);
    if ($messageId <= 0) {
        respondError('Message id is required.', 422);
    }

    $stmt = $pdo->prepare('SELECT user_id FROM chat_messages WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $messageId]);
    $message = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$message) {
        respondError('Message not found.', 404);
    }

    if ((int) $message['user_id'] !== $userId) {
        respondError('You can only delete your own messages.', 403);
    }

    $pdo->prepare('DELETE FROM chat_messages WHERE id = :id')->execute([':id' => $messageId]);
    respondSuccess(['message' => 'Message deleted.']);
}

function handleChangePassword(PDO $pdo): void
{
    $userId = currentUserId();
    if ($userId === null) {
        respondError('You must be signed in to change your password.', 401);
    }

    $newPassword = (string) ($_POST['newPassword'] ?? '');
    if (strlen($newPassword) < 6) {
        respondError('New password must be at least 6 characters long.', 422);
    }

    $stmt = $pdo->prepare('UPDATE chat_users SET password_hash = :hash WHERE id = :id');
    $stmt->execute([':hash' => password_hash($newPassword, PASSWORD_DEFAULT), ':id' => $userId]);
    respondSuccess(['message' => 'Password changed successfully.']);
}

/**
 * Resolve display name and email for a Jira account ID.
 *
 * @param array<string,mixed> $config
 * @return array{displayName:string,email:string}
 */
function resolveJiraProfileByAccountId(string $accountId, array $config): array
{
    $fallback  = ['displayName' => $accountId, 'email' => ''];
    $cachePath = __DIR__ . '/cache/users_active_atlassian.json';

    if (!file_exists($cachePath)) {
        return $fallback;
    }

    $users = json_decode((string) file_get_contents($cachePath), true);
    if (!is_array($users)) {
        return $fallback;
    }

    foreach ($users as $user) {
        if (($user['accountId'] ?? '') !== $accountId) {
            continue;
        }

        $email = trim((string) ($user['emailAddress'] ?? ''));
        if ($email === '') {
            $email = fetchJiraUserEmailByAccountId($accountId, $config);
        }

        return [
            'displayName' => trim((string) ($user['displayName'] ?? $accountId)) ?: $accountId,
            'email'       => $email,
        ];
    }

    $fallback['email'] = fetchJiraUserEmailByAccountId($accountId, $config);
    return $fallback;
}

/**
 * @param array<string,mixed> $config
 */
function fetchJiraUserEmailByAccountId(string $accountId, array $config): string
{
    static $emailCache = [];

    if ($accountId === '' || array_key_exists($accountId, $emailCache)) {
        return $emailCache[$accountId] ?? '';
    }

    try {
        $baseUrl = rtrim((string) ($config['jira_base_url'] ?? ''), '/');
        $email   = (string) ($config['jira_email'] ?? '');
        $token   = (string) ($config['jira_api_token'] ?? '');

        if ($baseUrl === '' || $email === '' || $token === '') {
            $emailCache[$accountId] = '';
            return '';
        }

        $url = $baseUrl . '/rest/api/3/user?' . http_build_query(['accountId' => $accountId]);
        $ch  = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD        => $email . ':' . $token,
            CURLOPT_HTTPAUTH       => CURLAUTH_BASIC,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);

        $data = is_string($raw) ? json_decode($raw, true) : null;
        $emailCache[$accountId] = trim((string) ($data['emailAddress'] ?? ''));
    } catch (Throwable $e) {
        $emailCache[$accountId] = '';
    }

    return $emailCache[$accountId];
}

function normalizeAccountId(string $accountId): string
{
    $value = trim($accountId);
    $value = preg_replace('/[^a-zA-Z0-9:_-]/', '', $value) ?? '';
    return substr($value, 0, 190);
}

function normalizeProjectKey(string $projectKey): string
{
    $stripped = strtoupper(trim($projectKey));
    $stripped = preg_replace('/[^A-Z0-9_-]/', '', $stripped) ?? '';
    return substr($stripped, 0, 120);
}

/**
 * @return array<string,mixed>|null
 */
function findUserByAccountId(PDO $pdo, string $accountId): ?array
{
    $stmt = $pdo->prepare('SELECT id, display_name, password_hash, jira_account_id, email FROM chat_users WHERE jira_account_id = :accountId LIMIT 1');
    $stmt->execute([':accountId' => $accountId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * @return array<string,mixed>|null
 */
function findUserByEmail(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare('SELECT id, display_name, password_hash, jira_account_id, email FROM chat_users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

function completeLogin(int $userId): void
{
    $_SESSION['chat_user_id'] = $userId;
    session_regenerate_id(true);
}

function messageExistsInProject(PDO $pdo, int $messageId, string $projectKey): bool
{
    $stmt = $pdo->prepare('SELECT 1 FROM chat_messages WHERE id = :id AND project_key = :projectKey LIMIT 1');
    $stmt->execute([':id' => $messageId, ':projectKey' => $projectKey]);
    return (bool) $stmt->fetchColumn();
}

function currentUserId(): ?int
{
    return isset($_SESSION['chat_user_id']) ? (int) $_SESSION['chat_user_id'] : null;
}

function formatIsoDate(?string $value): string
{
    if (!$value) return '';
    try {
        return (new DateTimeImmutable($value))->format(DATE_ATOM);
    } catch (Exception $e) {
        return $value;
    }
}

/**
 * @param array<string,mixed> $payload
 */
function respondSuccess(array $payload = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => true] + $payload);
    exit;
}

function respondError(string $message, int $status = 400): void
{
    http_response_code($status);
    echo json_encode(['success' => false, 'message' => $message]);
    exit;
}
