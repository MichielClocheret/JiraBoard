<?php
declare(strict_types=1);

function getChatPdo(array $config): PDO
{
    $host     = (string) ($config['db_host'] ?? 'localhost');
    $database = (string) ($config['db_name'] ?? 'jira_chat');
    $username = (string) ($config['db_user'] ?? 'root');
    $password = (string) ($config['db_password'] ?? '');

    $baseDsn = sprintf('mysql:host=%s;charset=utf8mb4', $host);
    $dsn     = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $host, $database);

    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        $pdo = new PDO($dsn, $username, $password, $options);
    } catch (PDOException $exception) {
        if (strpos($exception->getMessage(), 'Unknown database') === false) {
            throw $exception;
        }

        $creator = new PDO($baseDsn, $username, $password, $options);
        $creator->exec(sprintf(
            'CREATE DATABASE IF NOT EXISTS `%s` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
            str_replace('`', '``', $database)
        ));
        $creator = null;

        $pdo = new PDO($dsn, $username, $password, $options);
    }

    $pdo->exec("SET time_zone = '+00:00'");
    return $pdo;
}

function ensureChatSchema(PDO $pdo): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS chat_users (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            display_name VARCHAR(150) NOT NULL,
            email VARCHAR(190) NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            jira_account_id VARCHAR(190) NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    if (!chatColumnExists($pdo, 'chat_users', 'jira_account_id')) {
        $pdo->exec('ALTER TABLE chat_users ADD COLUMN jira_account_id VARCHAR(190) NULL AFTER password_hash');
    }

    try {
        $pdo->exec('ALTER TABLE chat_users MODIFY COLUMN email VARCHAR(190) NULL');
    } catch (Throwable $e) { /* backward compat */ }

    try {
        $pdo->exec('ALTER TABLE chat_users ADD UNIQUE KEY uniq_chat_users_jira_account_id (jira_account_id)');
    } catch (Throwable $e) { /* may already exist */ }

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS chat_messages (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            project_key VARCHAR(120) NOT NULL,
            user_id INT UNSIGNED NOT NULL,
            message TEXT NOT NULL,
            reply_to_message_id BIGINT UNSIGNED NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_chat_messages_user FOREIGN KEY (user_id) REFERENCES chat_users(id) ON DELETE CASCADE,
            INDEX idx_project_created (project_key, created_at),
            INDEX idx_chat_messages_reply (reply_to_message_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    if (!chatColumnExists($pdo, 'chat_messages', 'reply_to_message_id')) {
        $pdo->exec('ALTER TABLE chat_messages ADD COLUMN reply_to_message_id BIGINT UNSIGNED NULL AFTER message');
    }

    try {
        $pdo->exec('ALTER TABLE chat_messages ADD INDEX idx_chat_messages_reply (reply_to_message_id)');
    } catch (Throwable $e) { /* may already exist */ }

    $pdo->exec("DELETE FROM chat_messages WHERE message = ''");

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS chat_pinned_projects (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNSIGNED NOT NULL,
            project_key VARCHAR(120) NOT NULL,
            project_name VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_chat_pinned_projects_user FOREIGN KEY (user_id) REFERENCES chat_users(id) ON DELETE CASCADE,
            UNIQUE KEY uniq_chat_pinned_project (user_id, project_key),
            INDEX idx_chat_pinned_projects_created (user_id, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function chatColumnExists(PDO $pdo, string $tableName, string $columnName): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName AND COLUMN_NAME = :columnName LIMIT 1'
    );
    $stmt->execute([':tableName' => $tableName, ':columnName' => $columnName]);
    return (bool) $stmt->fetchColumn();
}
