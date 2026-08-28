<?php
declare(strict_types=1);

require_once __DIR__ . '/../../cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/../api.helper.php';

$projectKey = strtoupper(trim($_GET['projectKey'] ?? ''));
$userId     = trim($_GET['userId'] ?? '');

if ($projectKey === '' || strlen($projectKey) > 50 || !preg_match('/^[A-Z0-9_-]+$/', $projectKey)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid projectKey.']);
    exit;
}

if ($userId !== '' && (strlen($userId) > 200 || preg_match('/["\\\\\n\r]/', $userId))) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid userId.']);
    exit;
}

try {
    $cacheKey = 'project_issues_v3_' . $projectKey . '_' . ($userId === '' ? 'all' : md5($userId));
    $data = jira_cache($cacheKey, 300, function () use ($projectKey, $userId): array {
        $fields = 'summary,status,project,duedate,updated,assignee,comment';
        $base   = 'project = "' . $projectKey . '"';
        if ($userId !== '') {
            $base .= ' AND assignee = "' . str_replace('"', '\\"', $userId) . '"';
        }

        $todo     = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = "To Do" AND status != "Feedback" ORDER BY duedate ASC, updated DESC',
            $fields
        ));
        $progress = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = "In Progress" AND status != "Feedback" ORDER BY updated DESC',
            $fields
        ));
        $feedback = jira_pack_issue_list(jira_search_all(
            $base . ' AND status = "Feedback" ORDER BY updated DESC',
            $fields
        ));
        $done     = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = Done AND updated >= -30d ORDER BY updated DESC',
            $fields
        ));

        return compact('todo', 'progress', 'feedback', 'done');
    });

    echo json_encode(['ok' => true] + $data);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
