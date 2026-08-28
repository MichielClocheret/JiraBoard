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
    ensureProjectsTableExists($pdo);
    ensureProjectsColumnsExist($pdo);
    ensureTasksTableExists($pdo);
} catch (Throwable $e) {
    respondError('Database is not available: ' . $e->getMessage(), 500);
}

$action = (string)($_REQUEST['action'] ?? 'list');

switch ($action) {
    case 'create':
        requirePost();
        handleCreate($pdo);
        break;

    case 'update':
        requirePost();
        handleUpdate($pdo);
        break;

    case 'list':
        handleList($pdo);
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

function insertDefaultTasksForProject(PDO $pdo, int $projectId, string $buildType): void
{
    $tasksJsonPath = __DIR__ . '/dev-tasks.json';
    if (!file_exists($tasksJsonPath)) {
        return;
    }

    $jsonContent = file_get_contents($tasksJsonPath);
    if ($jsonContent === false) {
        return;
    }

    $decoded = json_decode($jsonContent, true);
    if (!is_array($decoded)) {
        return;
    }

    $buildTypeNorm = strtolower(trim($buildType));
    if ($buildTypeNorm === '') {
        return;
    }

    $matchedKey = null;
    foreach (array_keys($decoded) as $key) {
        if (strtolower(trim((string)$key)) === $buildTypeNorm) {
            $matchedKey = (string)$key;
            break;
        }
    }

    if ($matchedKey === null) {
        foreach (array_keys($decoded) as $key) {
            $keyNorm = strtolower(trim((string)$key));
            if ($keyNorm !== '' && (strpos($buildTypeNorm, $keyNorm) !== false || strpos($keyNorm, $buildTypeNorm) !== false)) {
                $matchedKey = (string)$key;
                break;
            }
        }
    }

    if ($matchedKey === null || !isset($decoded[$matchedKey]) || !is_array($decoded[$matchedKey])) {
        return;
    }

    $checkStmt = $pdo->prepare('SELECT COUNT(*) FROM veau_dev_project_tasks WHERE project_id = :projectId AND is_custom = 0');
    $checkStmt->execute([':projectId' => $projectId]);
    if ((int)$checkStmt->fetchColumn() > 0) {
        return;
    }

    $insertStmt = $pdo->prepare(
           'INSERT INTO veau_dev_project_tasks (project_id, task_name, task_notes, is_custom, is_done)
            VALUES (:projectId, :taskName, NULL, 0, 0)'
    );

    foreach ($decoded[$matchedKey] as $taskName) {
        $taskNameStr = trim((string)$taskName);
        if ($taskNameStr === '') {
            continue;
        }

        $insertStmt->execute([
            ':projectId' => $projectId,
            ':taskName'  => $taskNameStr,
        ]);
    }
}

function handleCreate(PDO $pdo): void
{
    $projectName = trim((string)($_POST['projectName'] ?? ''));
    if ($projectName === '') {
        respondError('Project name is required.', 422);
    }

    if (mb_strlen($projectName) > 190) {
        respondError('Project name must be 190 characters or fewer.', 422);
    }

    $buildType = trim((string)($_POST['buildType'] ?? ''));
    if (mb_strlen($buildType) > 100) {
        respondError('Build type must be 100 characters or fewer.', 422);
    }

    $designFilePath = trim((string)($_POST['designFilePath'] ?? ''));
    $designFileName = trim((string)($_POST['designFileName'] ?? ''));
    $archiveFolderPath = trim((string)($_POST['archiveFolderPath'] ?? ''));
    $archiveFolderName = trim((string)($_POST['archiveFolderName'] ?? ''));
    $assetsFolderPath = trim((string)($_POST['assetsFolderPath'] ?? ''));
    $assetsFolderName = trim((string)($_POST['assetsFolderName'] ?? ''));
    $designLink = trim((string)($_POST['designLink'] ?? ''));
    $deployHost = trim((string)($_POST['deployHost'] ?? ''));
    $deployUsername = trim((string)($_POST['deployUsername'] ?? ''));
    $deployPassword = trim((string)($_POST['deployPassword'] ?? ''));
    $webhostingLink = trim((string)($_POST['webhostingLink'] ?? ''));
    $deployMode = trim((string)($_POST['deployMode'] ?? ''));
    $webhostingMode = trim((string)($_POST['webhostingMode'] ?? ''));
    $webhostingPersonalNotes = trim((string)($_POST['webhostingPersonalNotes'] ?? ''));
    $deployPort = trim((string)($_POST['deployPort'] ?? ''));
    $projectNotes = trim((string)($_POST['projectNotes'] ?? ''));

    $stmt = $pdo->prepare(
        'INSERT INTO veau_dev_projects (project_name, build_type, design_file_path, design_file_name, archive_folder_path, archive_folder_name, assets_folder_path, assets_folder_name, design_link, deploy_host, deploy_username, deploy_password, webhosting_link, deploy_mode, webhosting_mode, webhosting_personal_notes, deploy_port, project_notes)
         VALUES (:projectName, :buildType, :designFilePath, :designFileName, :archiveFolderPath, :archiveFolderName, :assetsFolderPath, :assetsFolderName, :designLink, :deployHost, :deployUsername, :deployPassword, :webhostingLink, :deployMode, :webhostingMode, :webhostingPersonalNotes, :deployPort, :projectNotes)
         ON DUPLICATE KEY UPDATE
             build_type = VALUES(build_type),
             design_file_path = VALUES(design_file_path),
             design_file_name = VALUES(design_file_name),
             archive_folder_path = VALUES(archive_folder_path),
             archive_folder_name = VALUES(archive_folder_name),
             assets_folder_path = VALUES(assets_folder_path),
             assets_folder_name = VALUES(assets_folder_name),
             design_link = VALUES(design_link),
             deploy_host = VALUES(deploy_host),
             deploy_username = VALUES(deploy_username),
             deploy_password = VALUES(deploy_password),
             webhosting_link = VALUES(webhosting_link),
             deploy_mode = VALUES(deploy_mode),
             webhosting_mode = VALUES(webhosting_mode),
             webhosting_personal_notes = VALUES(webhosting_personal_notes),
             deploy_port = VALUES(deploy_port),
             project_notes = VALUES(project_notes),
             created_at = CURRENT_TIMESTAMP'
    );
    $stmt->execute([
        ':projectName'    => $projectName,
        ':buildType'      => $buildType,
        ':designFilePath' => $designFilePath !== '' ? $designFilePath : null,
        ':designFileName' => $designFileName !== '' ? $designFileName : null,
        ':archiveFolderPath' => $archiveFolderPath !== '' ? $archiveFolderPath : null,
        ':archiveFolderName' => $archiveFolderName !== '' ? $archiveFolderName : null,
        ':assetsFolderPath' => $assetsFolderPath !== '' ? $assetsFolderPath : null,
        ':assetsFolderName' => $assetsFolderName !== '' ? $assetsFolderName : null,
        ':designLink'     => $designLink !== '' ? $designLink : null,
        ':deployHost'     => $deployHost !== '' ? $deployHost : null,
        ':deployUsername' => $deployUsername !== '' ? $deployUsername : null,
        ':deployPassword' => $deployPassword !== '' ? $deployPassword : null,
        ':webhostingLink' => $webhostingLink !== '' ? $webhostingLink : null,
        ':deployMode'     => $deployMode !== '' ? $deployMode : null,
        ':webhostingMode' => $webhostingMode !== '' ? $webhostingMode : null,
        ':webhostingPersonalNotes' => $webhostingPersonalNotes !== '' ? $webhostingPersonalNotes : null,
        ':deployPort'     => $deployPort !== '' ? $deployPort : null,
        ':projectNotes'   => $projectNotes !== '' ? $projectNotes : null,
    ]);

    $projectId = (int)$pdo->lastInsertId();
    if (!$projectId) {
        $findStmt = $pdo->prepare('SELECT id FROM veau_dev_projects WHERE project_name = :projectName LIMIT 1');
        $findStmt->execute([':projectName' => $projectName]);
        $projectId = (int)($findStmt->fetchColumn() ?: 0);
    }

    if ($projectId > 0) {
        insertDefaultTasksForProject($pdo, $projectId, $buildType);
    }

    respondSuccess(['message' => 'Project saved.']);
}

function handleUpdate(PDO $pdo): void
{
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        respondError('Invalid project id.', 422);
    }

    $projectName = trim((string)($_POST['projectName'] ?? ''));
    if ($projectName === '') {
        respondError('Project name is required.', 422);
    }

    $buildType = trim((string)($_POST['buildType'] ?? ''));
    $designFilePath = trim((string)($_POST['designFilePath'] ?? ''));
    $designFileName = trim((string)($_POST['designFileName'] ?? ''));
    $archiveFolderPath = trim((string)($_POST['archiveFolderPath'] ?? ''));
    $archiveFolderName = trim((string)($_POST['archiveFolderName'] ?? ''));
    $assetsFolderPath = trim((string)($_POST['assetsFolderPath'] ?? ''));
    $assetsFolderName = trim((string)($_POST['assetsFolderName'] ?? ''));
    $designLink = trim((string)($_POST['designLink'] ?? ''));
    $deployHost = trim((string)($_POST['deployHost'] ?? ''));
    $deployUsername = trim((string)($_POST['deployUsername'] ?? ''));
    $deployPassword = trim((string)($_POST['deployPassword'] ?? ''));
    $webhostingLink = trim((string)($_POST['webhostingLink'] ?? ''));
    $deployMode = trim((string)($_POST['deployMode'] ?? ''));
    $webhostingMode = trim((string)($_POST['webhostingMode'] ?? ''));
    $webhostingPersonalNotes = trim((string)($_POST['webhostingPersonalNotes'] ?? ''));
    $deployPort = trim((string)($_POST['deployPort'] ?? ''));
    $projectNotes = trim((string)($_POST['projectNotes'] ?? ''));

    $stmt = $pdo->prepare(
        'UPDATE veau_dev_projects
         SET project_name = :projectName,
             build_type = :buildType,
             design_file_path = :designFilePath,
             design_file_name = :designFileName,
             archive_folder_path = :archiveFolderPath,
             archive_folder_name = :archiveFolderName,
             assets_folder_path = :assetsFolderPath,
             assets_folder_name = :assetsFolderName,
             design_link = :designLink,
             deploy_host = :deployHost,
             deploy_username = :deployUsername,
             deploy_password = :deployPassword,
             webhosting_link = :webhostingLink,
             deploy_mode = :deployMode,
             webhosting_mode = :webhostingMode,
             webhosting_personal_notes = :webhostingPersonalNotes,
             deploy_port = :deployPort,
             project_notes = :projectNotes
         WHERE id = :id'
    );
    $stmt->execute([
        ':projectName'    => $projectName,
        ':buildType'      => $buildType,
        ':designFilePath' => $designFilePath !== '' ? $designFilePath : null,
        ':designFileName' => $designFileName !== '' ? $designFileName : null,
        ':archiveFolderPath' => $archiveFolderPath !== '' ? $archiveFolderPath : null,
        ':archiveFolderName' => $archiveFolderName !== '' ? $archiveFolderName : null,
        ':assetsFolderPath' => $assetsFolderPath !== '' ? $assetsFolderPath : null,
        ':assetsFolderName' => $assetsFolderName !== '' ? $assetsFolderName : null,
        ':designLink'     => $designLink !== '' ? $designLink : null,
        ':deployHost'     => $deployHost !== '' ? $deployHost : null,
        ':deployUsername' => $deployUsername !== '' ? $deployUsername : null,
        ':deployPassword' => $deployPassword !== '' ? $deployPassword : null,
        ':webhostingLink' => $webhostingLink !== '' ? $webhostingLink : null,
        ':deployMode'     => $deployMode !== '' ? $deployMode : null,
        ':webhostingMode' => $webhostingMode !== '' ? $webhostingMode : null,
        ':webhostingPersonalNotes' => $webhostingPersonalNotes !== '' ? $webhostingPersonalNotes : null,
        ':deployPort'     => $deployPort !== '' ? $deployPort : null,
        ':projectNotes'   => $projectNotes !== '' ? $projectNotes : null,
        ':id'             => $id,
    ]);

    respondSuccess(['message' => 'Project updated.']);
}

function handleList(PDO $pdo): void
{
    $stmt = $pdo->query(
        'SELECT
             p.id,
             p.project_name,
             p.build_type,
             p.design_file_path,
             p.design_file_name,
             p.archive_folder_path,
             p.archive_folder_name,
             p.assets_folder_path,
             p.assets_folder_name,
             p.design_link,
             p.deploy_host,
             p.deploy_username,
             p.deploy_password,
             p.webhosting_link,
             p.deploy_mode,
             p.webhosting_mode,
             p.webhosting_personal_notes,
             p.deploy_port,
             p.project_notes,
             p.created_at,
             COUNT(t.id) AS total_tasks,
             SUM(CASE WHEN t.is_done = 1 THEN 1 ELSE 0 END) AS done_tasks
         FROM veau_dev_projects p
         LEFT JOIN veau_dev_project_tasks t ON t.project_id = p.id
         GROUP BY p.id
         ORDER BY created_at DESC, id DESC
         LIMIT 200'
    );

    $projects = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $projects[] = [
            'id'          => (int)($row['id'] ?? 0),
            'projectName'    => (string)($row['project_name'] ?? ''),
            'buildType'      => (string)($row['build_type'] ?? ''),
            'designFilePath' => (string)($row['design_file_path'] ?? ''),
            'designFileName' => (string)($row['design_file_name'] ?? ''),
            'archiveFolderPath' => (string)($row['archive_folder_path'] ?? ''),
            'archiveFolderName' => (string)($row['archive_folder_name'] ?? ''),
            'assetsFolderPath' => (string)($row['assets_folder_path'] ?? ''),
            'assetsFolderName' => (string)($row['assets_folder_name'] ?? ''),
            'designLink'     => (string)($row['design_link'] ?? ''),
            'deployHost'     => (string)($row['deploy_host'] ?? ''),
            'deployUsername' => (string)($row['deploy_username'] ?? ''),
            'deployPassword' => (string)($row['deploy_password'] ?? ''),
            'webhostingLink' => (string)($row['webhosting_link'] ?? ''),
            'deployMode'     => (string)($row['deploy_mode'] ?? ''),
            'webhostingMode' => (string)($row['webhosting_mode'] ?? ''),
            'webhostingPersonalNotes' => (string)($row['webhosting_personal_notes'] ?? ''),
            'deployPort'     => (string)($row['deploy_port'] ?? ''),
            'projectNotes'   => (string)($row['project_notes'] ?? ''),
            'createdAt'      => (string)($row['created_at'] ?? ''),
            'totalTasks'     => (int)($row['total_tasks'] ?? 0),
            'doneTasks'      => (int)($row['done_tasks'] ?? 0),
        ];
    }

    respondSuccess(['projects' => $projects]);
}

function handleDelete(PDO $pdo): void
{
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) {
        respondError('Invalid project id.', 422);
    }

    $pdo->beginTransaction();

    try {
        $deleteTasksStmt = $pdo->prepare('DELETE FROM veau_dev_project_tasks WHERE project_id = :projectId');
        $deleteTasksStmt->execute([':projectId' => $id]);

        $deleteProjectStmt = $pdo->prepare('DELETE FROM veau_dev_projects WHERE id = :id');
        $deleteProjectStmt->execute([':id' => $id]);

        if ($deleteProjectStmt->rowCount() === 0) {
            $pdo->rollBack();
            respondError('Project not found.', 404);
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        respondError('Unable to delete project: ' . $e->getMessage(), 500);
    }

    respondSuccess(['message' => 'Project deleted.']);
}

function ensureProjectsTableExists(PDO $pdo): void
{
    $stmt = $pdo->query(
        "SELECT 1
         FROM INFORMATION_SCHEMA.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'veau_dev_projects'
         LIMIT 1"
    );

    if (!$stmt->fetchColumn()) {
        $pdo->exec(
            'CREATE TABLE veau_dev_projects (
                id INT PRIMARY KEY AUTO_INCREMENT,
                project_name VARCHAR(190) NOT NULL,
                build_type VARCHAR(100) NULL,
                design_file_path VARCHAR(1024) NULL,
                design_file_name VARCHAR(255) NULL,
                archive_folder_path VARCHAR(1024) NULL,
                archive_folder_name VARCHAR(255) NULL,
                assets_folder_path VARCHAR(1024) NULL,
                assets_folder_name VARCHAR(255) NULL,
                design_link VARCHAR(1024) NULL,
                deploy_host VARCHAR(255) NULL,
                deploy_username VARCHAR(255) NULL,
                deploy_password VARCHAR(255) NULL,
                webhosting_link VARCHAR(1024) NULL,
                deploy_mode VARCHAR(50) NULL,
                webhosting_mode VARCHAR(50) NULL,
                webhosting_personal_notes TEXT NULL,
                deploy_port VARCHAR(50) NULL,
                project_notes TEXT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_project_name (project_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }
}

function ensureProjectsColumnsExist(PDO $pdo): void
{
    $columnStmt = $pdo->query(
        "SELECT COLUMN_NAME
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'veau_dev_projects'"
    );

    $columns = [];
    while ($columnName = $columnStmt->fetchColumn()) {
        $columns[(string)$columnName] = true;
    }

    if (!isset($columns['design_file_path'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN design_file_path VARCHAR(1024) NULL AFTER build_type");
    }
    if (!isset($columns['design_file_name'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN design_file_name VARCHAR(255) NULL AFTER design_file_path");
    }
    if (!isset($columns['archive_folder_path'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN archive_folder_path VARCHAR(1024) NULL AFTER design_file_name");
    }
    if (!isset($columns['archive_folder_name'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN archive_folder_name VARCHAR(255) NULL AFTER archive_folder_path");
    }
    if (!isset($columns['assets_folder_path'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN assets_folder_path VARCHAR(1024) NULL AFTER archive_folder_name");
    }
    if (!isset($columns['assets_folder_name'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN assets_folder_name VARCHAR(255) NULL AFTER assets_folder_path");
    }
    if (!isset($columns['design_link'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN design_link VARCHAR(1024) NULL AFTER assets_folder_name");
    }
    if (!isset($columns['deploy_host'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN deploy_host VARCHAR(255) NULL AFTER design_link");
    }
    if (!isset($columns['deploy_username'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN deploy_username VARCHAR(255) NULL AFTER deploy_host");
    }
    if (!isset($columns['deploy_password'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN deploy_password VARCHAR(255) NULL AFTER deploy_username");
    }
    if (!isset($columns['webhosting_link'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN webhosting_link VARCHAR(1024) NULL AFTER deploy_password");
    }
    if (!isset($columns['deploy_mode'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN deploy_mode VARCHAR(50) NULL AFTER webhosting_link");
    }
    if (!isset($columns['webhosting_mode'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN webhosting_mode VARCHAR(50) NULL AFTER deploy_mode");
    }
    if (!isset($columns['webhosting_personal_notes'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN webhosting_personal_notes TEXT NULL AFTER webhosting_mode");
    }
    if (!isset($columns['deploy_port'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN deploy_port VARCHAR(50) NULL AFTER webhosting_personal_notes");
    }
    if (!isset($columns['project_notes'])) {
        $pdo->exec("ALTER TABLE veau_dev_projects ADD COLUMN project_notes TEXT NULL AFTER deploy_port");
    }
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
