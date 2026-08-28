<?php
declare(strict_types=1);

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../config_path.php';

header('Content-Type: application/json');

$configPath = app_config_path();
if (!file_exists($configPath)) {
    respondError('Backend is not configured yet.', 503);
}

/** @var array<string,mixed> $config */
$config = require $configPath;

require_once __DIR__ . '/../chat/chat-db.php';

try {
    $pdo = getChatPdo($config);
    ensureTasksTableExists($pdo);
} catch (Throwable $e) {
    respondError('Database is not available: ' . $e->getMessage(), 500);
}

$action = (string)($_REQUEST['action'] ?? 'get_tasks');

switch ($action) {
    case 'get_tasks':
        handleGetTasks($pdo);
        break;

    case 'save_task_state':
        requirePost();
        handleSaveTaskState($pdo);
        break;

    case 'create_task':
        requirePost();
        handleCreateTask($pdo);
        break;

    case 'update_task':
        requirePost();
        handleUpdateTask($pdo);
        break;

    case 'delete_task':
        requirePost();
        handleDeleteTask($pdo);
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

function handleGetTasks(PDO $pdo): void
{
    $projectId = (int)($_REQUEST['projectId'] ?? 0);
    if ($projectId <= 0) {
        respondError('Invalid project id.', 422);
    }

    ensureDefaultTasksForProject($pdo, $projectId);

    $stmt = $pdo->prepare(
        'SELECT id, task_name, task_notes, assignee_account_id, assignee_name, priority, is_custom, is_done
         FROM veau_dev_project_tasks
         WHERE project_id = :projectId
         ORDER BY is_custom ASC, created_at ASC'
    );
    $stmt->execute([':projectId' => $projectId]);

    $defaultTasks = [];
    $customTasks = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $task = [
            'id'     => (int)($row['id'] ?? 0),
            'text'   => (string)($row['task_name'] ?? ''),
            'notes'  => (string)($row['task_notes'] ?? ''),
            'assigneeAccountId' => (string)($row['assignee_account_id'] ?? ''),
            'assigneeName' => (string)($row['assignee_name'] ?? ''),
            'priority' => normalizeTaskPriority((string)($row['priority'] ?? 'medium')),
            'isDone' => (bool)($row['is_done'] ?? false),
            'isCustom' => (bool)($row['is_custom'] ?? false),
        ];

        if ((bool)($row['is_custom'] ?? false)) {
            $customTasks[] = $task;
        } else {
            $defaultTasks[] = $task;
        }
    }

    respondSuccess([
        'defaultTasks' => $defaultTasks,
        'customTasks'  => $customTasks,
    ]);
}

function ensureDefaultTasksForProject(PDO $pdo, int $projectId): void
{
    $projectStmt = $pdo->prepare('SELECT build_type FROM veau_dev_projects WHERE id = :id LIMIT 1');
    $projectStmt->execute([':id' => $projectId]);
    $buildType = trim((string)($projectStmt->fetchColumn() ?: ''));

    if ($buildType === '') {
        return;
    }

    $hasDefaultsStmt = $pdo->prepare('SELECT COUNT(*) FROM veau_dev_project_tasks WHERE project_id = :projectId AND is_custom = 0');
    $hasDefaultsStmt->execute([':projectId' => $projectId]);
    if ((int)$hasDefaultsStmt->fetchColumn() > 0) {
        return;
    }

    $defaultTasks = resolveDefaultTasksForBuildType($buildType);
    if (!$defaultTasks) {
        return;
    }

    $insertStmt = $pdo->prepare(
        'INSERT INTO veau_dev_project_tasks (project_id, task_name, is_custom, is_done)
         VALUES (:projectId, :taskName, 0, 0)'
    );

    foreach ($defaultTasks as $taskName) {
        $insertStmt->execute([
            ':projectId' => $projectId,
            ':taskName'  => $taskName,
        ]);
    }
}

/**
 * @return array<int,string>
 */
function resolveDefaultTasksForBuildType(string $buildType): array
{
    $template = loadDefaultTaskTemplate();
    if (!$template) {
        return [];
    }

    $target = normalizeBuildType($buildType);
    if ($target === '') {
        return [];
    }

    $keys = array_keys($template);
    $matchedKey = '';

    foreach ($keys as $key) {
        if (normalizeBuildType((string)$key) === $target) {
            $matchedKey = (string)$key;
            break;
        }
    }

    if ($matchedKey === '') {
        foreach ($keys as $key) {
            $normalizedKey = normalizeBuildType((string)$key);
            if ($normalizedKey !== '' && (strpos($target, $normalizedKey) !== false || strpos($normalizedKey, $target) !== false)) {
                $matchedKey = (string)$key;
                break;
            }
        }
    }

    if ($matchedKey === '' || !isset($template[$matchedKey]) || !is_array($template[$matchedKey])) {
        return [];
    }

    $tasks = [];
    foreach ($template[$matchedKey] as $task) {
        $taskName = trim((string)$task);
        if ($taskName !== '') {
            $tasks[] = $taskName;
        }
    }

    return $tasks;
}

/**
 * @return array<string,array<int,string>>
 */
function loadDefaultTaskTemplate(): array
{
    $tasksJsonPath = __DIR__ . '/dev-tasks.json';
    if (!file_exists($tasksJsonPath)) {
        return [];
    }

    $jsonContent = file_get_contents($tasksJsonPath);
    if ($jsonContent === false) {
        return [];
    }

    $decoded = json_decode($jsonContent, true);
    if (!is_array($decoded)) {
        return [];
    }

    return $decoded;
}

function normalizeBuildType(string $value): string
{
    return strtolower(trim($value));
}

function handleSaveTaskState(PDO $pdo): void
{
    $taskId = (int)($_POST['taskId'] ?? 0);
    if ($taskId <= 0) {
        respondError('Invalid task id.', 422);
    }

    $isDone = filter_var($_POST['isDone'] ?? false, FILTER_VALIDATE_BOOLEAN);

    $stmt = $pdo->prepare(
        'UPDATE veau_dev_project_tasks SET is_done = :isDone WHERE id = :id'
    );
    $stmt->execute([
        ':isDone' => $isDone ? 1 : 0,
        ':id'     => $taskId,
    ]);

    respondSuccess(['message' => 'Task state updated.']);
}

function handleCreateTask(PDO $pdo): void
{
    $projectId = (int)($_POST['projectId'] ?? 0);
    if ($projectId <= 0) {
        respondError('Invalid project id.', 422);
    }

    $taskName = trim((string)($_POST['taskName'] ?? ''));
    if ($taskName === '') {
        respondError('Task name is required.', 422);
    }

    $taskNotes = trim((string)($_POST['taskNotes'] ?? ''));
    $assigneeAccountId = trim((string)($_POST['assigneeAccountId'] ?? ''));
    $assigneeName = trim((string)($_POST['assigneeName'] ?? ''));
    $priority = normalizeTaskPriority((string)($_POST['priority'] ?? 'medium'));

    $stmt = $pdo->prepare(
        'INSERT INTO veau_dev_project_tasks (project_id, task_name, task_notes, assignee_account_id, assignee_name, priority, is_custom, is_done)
         VALUES (:projectId, :taskName, :taskNotes, :assigneeAccountId, :assigneeName, :priority, 1, 0)'
    );
    $stmt->execute([
        ':projectId' => $projectId,
        ':taskName'  => $taskName,
        ':taskNotes' => $taskNotes !== '' ? $taskNotes : null,
        ':assigneeAccountId' => $assigneeAccountId !== '' ? $assigneeAccountId : null,
        ':assigneeName' => $assigneeName !== '' ? $assigneeName : null,
        ':priority' => $priority,
    ]);

    respondSuccess([
        'message' => 'Task created.',
        'taskId'  => (int)$pdo->lastInsertId(),
    ]);
}

function handleUpdateTask(PDO $pdo): void
{
    $taskId = (int)($_POST['taskId'] ?? 0);
    if ($taskId <= 0) {
        respondError('Invalid task id.', 422);
    }

    $taskName = trim((string)($_POST['taskName'] ?? ''));
    if ($taskName === '') {
        respondError('Task name is required.', 422);
    }

    $taskNotes = trim((string)($_POST['taskNotes'] ?? ''));
    $assigneeAccountId = trim((string)($_POST['assigneeAccountId'] ?? ''));
    $assigneeName = trim((string)($_POST['assigneeName'] ?? ''));
    $priority = normalizeTaskPriority((string)($_POST['priority'] ?? 'medium'));

    $stmt = $pdo->prepare(
        'UPDATE veau_dev_project_tasks
         SET task_name = :taskName,
             task_notes = :taskNotes,
             assignee_account_id = :assigneeAccountId,
             assignee_name = :assigneeName,
             priority = :priority
         WHERE id = :id'
    );
    $stmt->execute([
        ':taskName' => $taskName,
        ':taskNotes' => $taskNotes !== '' ? $taskNotes : null,
        ':assigneeAccountId' => $assigneeAccountId !== '' ? $assigneeAccountId : null,
        ':assigneeName' => $assigneeName !== '' ? $assigneeName : null,
        ':priority' => $priority,
        ':id' => $taskId,
    ]);

    respondSuccess(['message' => 'Task updated.']);
}

function handleDeleteTask(PDO $pdo): void
{
    $taskId = (int)($_POST['taskId'] ?? 0);
    if ($taskId <= 0) {
        respondError('Invalid task id.', 422);
    }

    $stmt = $pdo->prepare(
        'DELETE FROM veau_dev_project_tasks WHERE id = :id AND is_custom = 1'
    );
    $stmt->execute([':id' => $taskId]);

    if ($stmt->rowCount() === 0) {
        respondError('Task not found or is not custom.', 404);
    }

    respondSuccess(['message' => 'Task deleted.']);
}

function ensureTasksTableExists(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'veau_dev_project_tasks'
         LIMIT 1"
    );

    if (!$stmt->fetchColumn()) {
        $pdo->exec(
            'CREATE TABLE veau_dev_project_tasks (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_id INT NOT NULL,
                task_name VARCHAR(255) NOT NULL,
                task_notes TEXT NULL,
                assignee_account_id VARCHAR(255) NULL,
                assignee_name VARCHAR(255) NULL,
                priority VARCHAR(20) NOT NULL DEFAULT \'medium\',
                is_custom BOOLEAN DEFAULT TRUE,
                is_done BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                KEY (project_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
        return;
    }

    $columnStmt = $pdo->query(
        "SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'veau_dev_project_tasks'"
    );

    $columns = [];
    while ($columnName = $columnStmt->fetchColumn()) {
        $columns[(string)$columnName] = true;
    }

    if (!isset($columns['task_notes'])) {
        $pdo->exec("ALTER TABLE veau_dev_project_tasks ADD COLUMN task_notes TEXT NULL AFTER task_name");
    }
    if (!isset($columns['assignee_account_id'])) {
        $pdo->exec("ALTER TABLE veau_dev_project_tasks ADD COLUMN assignee_account_id VARCHAR(255) NULL AFTER task_notes");
    }
    if (!isset($columns['assignee_name'])) {
        $pdo->exec("ALTER TABLE veau_dev_project_tasks ADD COLUMN assignee_name VARCHAR(255) NULL AFTER assignee_account_id");
    }
    if (!isset($columns['priority'])) {
        $pdo->exec("ALTER TABLE veau_dev_project_tasks ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'medium' AFTER assignee_name");
    }
}

function normalizeTaskPriority(string $value): string
{
    $normalized = strtolower(trim($value));
    return in_array($normalized, ['low', 'medium', 'high'], true) ? $normalized : 'medium';
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
