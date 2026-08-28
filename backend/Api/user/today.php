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

$today  = date('Y-m-d');
$fields = 'summary,status,project,duedate,updated,assignee,comment,customfield_10015';
$base   = 'assignee = "' . $userId . '"';

try {
    $data = jira_cache('user_today_v3_' . $userId . '_' . $today, 300, function () use ($base, $fields, $today): array {
        $issues = jira_search_all(
            $base . ' AND statusCategory IN ("To Do", "In Progress")'
            . ' AND ('
                . 'duedate = "' . $today . '"'
                . ' OR (customfield_10015 IS NOT EMPTY'
                    . ' AND customfield_10015 <= "' . $today . '"'
                    . ' AND duedate >= "' . $today . '")'
            . ') ORDER BY updated DESC',
            $fields
        );

        $todo     = [];
        $progress = [];

        foreach (jira_pack_issue_list($issues) as $it) {
            $cat = $it['statusCategory'] ?? '';
            if ($cat === 'To Do')           $todo[]     = $it;
            elseif ($cat === 'In Progress') $progress[] = $it;
        }

        return compact('todo', 'progress');
    });

    echo json_encode(['ok' => true] + $data);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
