<?php
declare(strict_types=1);

require_once __DIR__ . '/../../cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../api.helper.php';

$userId = trim($_GET['userId'] ?? '');

if ($userId === '' || strlen($userId) > 200 || preg_match('/["\\\\\n\r]/', $userId)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid userId.']);
    exit;
}

$fields = 'summary,status,project,duedate,updated,assignee,comment';
$jql    = 'assignee = "' . $userId . '" AND duedate < now() AND statusCategory != Done ORDER BY duedate ASC';

try {
    $issues = jira_cache('user_overdue_v2_' . $userId, 300, function () use ($jql, $fields): array {
        return jira_pack_issue_list(jira_search_all($jql, $fields));
    });

    echo json_encode(['ok' => true, 'issues' => $issues]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
