<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/api.helper.php';

try {
    $startAt = 0;
    $pageSize = 50;
    $allProjects = [];
    $managersByAccountId = [];

    do {
        $page = jira_get('/rest/api/3/project/search', [
            'startAt'    => $startAt,
            'maxResults' => $pageSize,
            'expand'     => 'lead',
        ]);

        $projects = $page['values'] ?? [];

        foreach ($projects as $project) {
            $allProjects[] = $project;

            $lead = $project['lead'] ?? null;
            if (!is_array($lead)) {
                continue;
            }

            $accountId = (string) ($lead['accountId'] ?? '');
            if ($accountId === '') {
                continue;
            }

            if (!isset($managersByAccountId[$accountId])) {
                $managersByAccountId[$accountId] = [
                    'accountId'   => $accountId,
                    'displayName' => (string) ($lead['displayName'] ?? 'Unknown'),
                    'avatarUrls'  => $lead['avatarUrls'] ?? [],
                    'projects'    => [],
                ];
            }

            $managersByAccountId[$accountId]['projects'][] = [
                'id'   => $project['id'] ?? null,
                'key'  => $project['key'] ?? '',
                'name' => $project['name'] ?? '',
            ];
        }

        $startAt += $pageSize;
        $isLast = (bool) ($page['isLast'] ?? true);
    } while (!$isLast);

    $managers = array_values($managersByAccountId);

    usort($managers, static function (array $a, array $b): int {
        return strcasecmp((string) $a['displayName'], (string) $b['displayName']);
    });

    echo json_encode([
        'ok'       => true,
        'projects' => $allProjects,
        'managers' => $managers,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => $e->getMessage(),
    ]);
}
