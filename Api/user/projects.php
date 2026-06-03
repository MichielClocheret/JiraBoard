<?php
declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/../api.helper.php';

$userId = trim($_GET['userId'] ?? '');

if ($userId === '' || strlen($userId) > 200 || preg_match('/["\\\\\n\r]/', $userId)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid userId.']);
    exit;
}

try {
    $projects = jira_cache('user_projects_v3_' . $userId, 300, function () use ($userId): array {
        $result = [];
        $issues = jira_search_all(
            'assignee = "' . $userId . '" ORDER BY updated DESC',
            'project,status'
        );

        foreach ($issues as $issue) {
            $proj = $issue['fields']['project'] ?? null;
            if (!$proj) continue;

            $pKey       = $proj['key']  ?? 'UNKNOWN';
            $pName      = $proj['name'] ?? $pKey;
            $cat        = $issue['fields']['status']['statusCategory']['name'] ?? 'Unknown';
            $statusName = $issue['fields']['status']['name'] ?? '';

            if (!isset($result[$pKey])) {
                $result[$pKey] = [
                    'name'        => $pName,
                    'To Do'       => 0,
                    'In Progress' => 0,
                    'Feedback'    => 0,
                    'Done'        => 0,
                ];
            }

            if ($statusName === 'Feedback') {
                $result[$pKey]['Feedback']++;
                continue;
            }

            if (!isset($result[$pKey][$cat])) $result[$pKey][$cat] = 0;
            $result[$pKey][$cat]++;
        }

        uasort($result, fn($a, $b) => strcmp($a['name'], $b['name']));
        return $result;
    });

    echo json_encode(['ok' => true, 'projects' => $projects]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
