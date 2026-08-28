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
$base   = 'assignee = "' . $userId . '"';

try {
    $data = jira_cache('user_issues_v4_' . $userId, 300, function () use ($base, $fields): array {
        $noDueDateTodo = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = "To Do" AND status != "Feedback" AND duedate IS EMPTY ORDER BY updated DESC',
            $fields
        ));
        $withDueDateTodo = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = "To Do" AND status != "Feedback" AND duedate IS NOT EMPTY ORDER BY duedate ASC, updated DESC',
            $fields
        ));
        $progress = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = "In Progress" AND status != "Feedback" ORDER BY duedate ASC, updated DESC',
            $fields
        ));
        $feedback = jira_pack_issue_list(jira_search_all(
            $base . ' AND status = "Feedback" ORDER BY duedate ASC, updated DESC',
            $fields
        ));
        $done = jira_pack_issue_list(jira_search_all(
            $base . ' AND statusCategory = Done AND updated >= -30d ORDER BY updated DESC',
            $fields
        ));

        return compact('noDueDateTodo', 'withDueDateTodo', 'progress', 'feedback', 'done');
    });

    echo json_encode(['ok' => true] + $data);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
