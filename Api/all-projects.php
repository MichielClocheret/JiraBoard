<?php
declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/api.helper.php';

try {
    $projects = jira_cache('all_projects_v3', 300, function (): array {
        $all     = [];
        $startAt = 0;
        $max     = 50;

        while (true) {
            $res    = jira_get('/rest/api/3/project/search', [
                'startAt'    => $startAt,
                'maxResults' => $max,
                'orderBy'    => 'name',
            ]);
            $values = $res['values'] ?? [];

            foreach ($values as $p) {
                $key = $p['key'] ?? null;
                if (!$key) continue;
                $all[$key] = [
                    'name'        => $p['name'] ?? $key,
                    'To Do'       => 0,
                    'In Progress' => 0,
                    'Feedback'    => 0,
                ];
            }

            $isLast = ($res['isLast'] ?? false) === true;
            if ($isLast || count($values) < $max) break;
            $startAt += $max;
        }

        $issues = jira_search_all(
            'statusCategory IN ("To Do", "In Progress") ORDER BY project ASC',
            'project,status'
        );

        foreach ($issues as $issue) {
            $pKey = $issue['fields']['project']['key'] ?? null;
            if (!$pKey) continue;

            if (!isset($all[$pKey])) {
                $all[$pKey] = [
                    'name'        => $issue['fields']['project']['name'] ?? $pKey,
                    'To Do'       => 0,
                    'In Progress' => 0,
                    'Feedback'    => 0,
                ];
            }

            $cat        = $issue['fields']['status']['statusCategory']['name'] ?? '';
            $statusName = $issue['fields']['status']['name'] ?? '';

            if ($statusName === 'Feedback') {
                $all[$pKey]['Feedback']++;
                continue;
            }
            if (!isset($all[$pKey][$cat])) $all[$pKey][$cat] = 0;
            $all[$pKey][$cat]++;
        }

        uasort($all, fn($a, $b) => strcmp($a['name'], $b['name']));
        return $all;
    });

    echo json_encode(['ok' => true, 'projects' => $projects]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
