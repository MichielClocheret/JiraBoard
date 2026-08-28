<?php
declare(strict_types=1);

require_once __DIR__ . '/../cors.php';

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/api.helper.php';

try {
    $startAt  = 0;
    $pageSize = 50;
    $allUsers = [];

    do {
        $page = jira_get('/rest/api/3/users/search', [
            'startAt'    => $startAt,
            'maxResults' => $pageSize,
        ]);

        foreach ($page as $user) {
            if (($user['accountType'] ?? '') !== 'atlassian') {
                continue;
            }

            if (($user['active'] ?? false) !== true) {
                continue;
            }

            $allUsers[] = $user;
        }

        $startAt  += $pageSize;
    } while (count($page) === $pageSize);

    echo json_encode([
        'ok'    => true,
        'users' => $allUsers,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'ok'    => false,
        'error' => $e->getMessage(),
    ]);
}
