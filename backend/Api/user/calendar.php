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

$fields = 'summary,status,project,duedate,customfield_10015';
$base   = 'assignee = "' . $userId . '"';

function add_days(string $date, int $days): ?string
{
    try {
        $dt = new DateTimeImmutable($date);
    } catch (Exception $e) {
        return null;
    }

    return $dt->modify(($days >= 0 ? '+' : '') . $days . ' days')->format('Y-m-d');
}

try {
    $events = jira_cache('user_calendar_v5_' . $userId, 300, function () use ($base, $fields): array {
        $open = jira_search_all(
            $base . ' AND duedate IS NOT EMPTY AND statusCategory != Done ORDER BY duedate ASC',
            $fields
        );
        $done = jira_search_all(
            $base . ' AND duedate IS NOT EMPTY AND statusCategory = Done AND updated >= -30d ORDER BY duedate ASC',
            $fields
        );

        $events = [];

        foreach (array_merge($open, $done) as $i) {
            $fieldsData = $i['fields'] ?? [];
            $duedate    = $fieldsData['duedate'] ?? null;
            if (!$duedate) continue;

            $startDate = $fieldsData['customfield_10015'] ?? null;
            if (!is_string($startDate) || $startDate === '') {
                $startDate = $duedate;
            }

            $cat        = $fieldsData['status']['statusCategory']['name'] ?? '';
            $statusName = strtolower((string) ($fieldsData['status']['name'] ?? ''));

            if ($cat === 'In Progress') {
                $class     = 'evt-progress';
                $statusKey = 'progress';
            } elseif ($cat === 'Done') {
                $class     = 'evt-done';
                $statusKey = 'done';
            } else {
                $class     = 'evt-todo';
                $statusKey = 'todo';
            }

            $classNames = [$class];
            if ($statusName === 'feedback') {
                $classNames[] = 'evt-feedback';
            }

            $event = [
                'id'            => $i['key'],
                'title'         => ($fieldsData['summary'] ?? '') ?: $i['key'],
                'start'         => $startDate,
                'classNames'    => $classNames,
                'extendedProps' => [
                    'status'      => $statusKey,
                    'issueKey'    => $i['key'],
                    'projectKey'  => $fieldsData['project']['key'] ?? '',
                    'projectName' => $fieldsData['project']['name'] ?? '',
                    'summary'     => ($fieldsData['summary'] ?? '') ?: $i['key'],
                ],
            ];

            if ($startDate !== $duedate) {
                $endDate = add_days($duedate, 1);
                if ($endDate !== null) {
                    $event['end'] = $endDate;
                }
            }

            $events[] = $event;
        }

        return $events;
    });

    echo json_encode(['ok' => true, 'events' => $events]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
