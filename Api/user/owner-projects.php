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
    $projects = jira_cache('user_owner_projects_v3_' . $userId, 300, function () use ($userId): array {
        // Step 1: find all projects where user is lead
        $ownedKeys = [];
        $startAt   = 0;
        $max       = 50;

        while (true) {
            $res    = jira_get('/rest/api/3/project/search', [
                'startAt'    => $startAt,
                'maxResults' => $max,
                'orderBy'    => 'name',
                'expand'     => 'lead',
            ]);
            $values = $res['values'] ?? [];

            foreach ($values as $p) {
                if (($p['lead']['accountId'] ?? '') !== $userId) continue;
                $key = $p['key'] ?? null;
                if (!$key) continue;
                $ownedKeys[$key] = [
                    'name'        => $p['name'] ?? $key,
                    'To Do'       => 0,
                    'In Progress' => 0,
                    'Feedback'    => 0,
                    'Done'        => 0,
                ];
            }

            $isLast = ($res['isLast'] ?? false) === true;
            if ($isLast || count($values) < $max) break;
            $startAt += $max;
        }

        if (empty($ownedKeys)) return [];

        // Step 2: count issues per owned project
        $keys    = array_keys($ownedKeys);
        $chunks  = array_chunk($keys, 50);

        foreach ($chunks as $chunk) {
            $quoted = array_map(fn($k) => '"' . str_replace('"', '\\"', $k) . '"', $chunk);
            $jql    = 'project IN (' . implode(',', $quoted) . ')'
                    . ' AND (statusCategory IN ("To Do", "In Progress") OR status = "Feedback" OR statusCategory = Done)'
                    . ' ORDER BY project ASC';

            $issues = jira_search_all($jql, 'project,status');

            foreach ($issues as $issue) {
                $pKey       = $issue['fields']['project']['key'] ?? null;
                if (!$pKey || !isset($ownedKeys[$pKey])) continue;

                $cat        = $issue['fields']['status']['statusCategory']['name'] ?? 'Unknown';
                $statusName = $issue['fields']['status']['name'] ?? '';

                if ($statusName === 'Feedback') {
                    $ownedKeys[$pKey]['Feedback']++;
                    continue;
                }
                if (!isset($ownedKeys[$pKey][$cat])) $ownedKeys[$pKey][$cat] = 0;
                $ownedKeys[$pKey][$cat]++;
            }
        }

        uasort($ownedKeys, fn($a, $b) => strcmp($a['name'], $b['name']));
        return $ownedKeys;
    });

    echo json_encode(['ok' => true, 'projects' => $projects]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
