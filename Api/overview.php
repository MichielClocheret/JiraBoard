<?php
declare(strict_types=1);

header('Content-Type: application/json');

require_once __DIR__ . '/api.helper.php';

try {
    $today    = date('Y-m-d');
    $monthKey = date('Y-m');

    /*
     * Today's data — drives BOTH the user grid badges AND the "All Tasks For Today" columns.
     * One query, two outputs: per-user counts (for cards) + flat lists (for columns).
     */
    $todayData = jira_cache('overview_today_v5_' . $today, 300, function () use ($today): array {
        $fields = 'summary,status,project,duedate,updated,assignee,comment,customfield_10015';
        $issues = jira_search_all(
            'statusCategory IN ("To Do", "In Progress")'
            . ' AND ('
                . 'duedate = "' . $today . '"'
                . ' OR (customfield_10015 IS NOT EMPTY'
                    . ' AND customfield_10015 <= "' . $today . '"'
                    . ' AND duedate >= "' . $today . '")'
            . ') ORDER BY updated DESC',
            $fields
        );

        $userMap  = [];
        $todoList = [];
        $progList = [];

        foreach ($issues as $i) {
            $cat       = $i['fields']['status']['statusCategory']['name'] ?? '';
            $accountId = $i['fields']['assignee']['accountId'] ?? null;
            $packed    = jira_pack_issue_list([$i])[0];

            if ($accountId) {
                if (!isset($userMap[$accountId])) {
                    $userMap[$accountId] = [
                        'accountId'   => $accountId,
                        'displayName' => $i['fields']['assignee']['displayName'] ?? '',
                        'avatarUrl'   => $i['fields']['assignee']['avatarUrls']['48x48'] ?? '',
                        'todo'        => 0,
                        'progress'    => 0,
                    ];
                }
                if ($cat === 'To Do')           $userMap[$accountId]['todo']++;
                elseif ($cat === 'In Progress') $userMap[$accountId]['progress']++;
            }

            if ($cat === 'To Do')           $todoList[] = $packed;
            elseif ($cat === 'In Progress') $progList[] = $packed;
        }

        $users = array_values($userMap);
        usort($users, fn($a, $b) =>
            ($b['todo'] + $b['progress']) <=> ($a['todo'] + $a['progress'])
        );

        return [
            'users'    => $users,
            'allTasks' => ['todo' => $todoList, 'progress' => $progList],
        ];
    });

    /*
     * Chart data — this month's tasks per user (duedate within current month).
     */
    $chartData = jira_cache('overview_chart_v2_' . $monthKey, 300, function (): array {
        $fields = 'status,duedate,assignee';
        $issues = jira_search_all(
            'statusCategory IN ("To Do", "In Progress")'
            . ' AND duedate >= startOfMonth()'
            . ' AND duedate < startOfMonth("+1M")'
            . ' AND assignee IS NOT EMPTY ORDER BY updated DESC',
            $fields
        );

        $userMap = [];
        $today   = date('Y-m-d');

        foreach ($issues as $i) {
            $cat       = $i['fields']['status']['statusCategory']['name'] ?? '';
            $duedate   = $i['fields']['duedate'] ?? '';
            $accountId = $i['fields']['assignee']['accountId'] ?? null;
            $name      = $i['fields']['assignee']['displayName'] ?? 'Unknown';
            if (!$accountId) continue;

            if (!isset($userMap[$accountId])) {
                $userMap[$accountId] = [
                    'accountId'   => $accountId,
                    'displayName' => $name,
                    'todo'        => 0,
                    'progress'    => 0,
                    'overdue'     => 0,
                    'totalOpen'   => 0,
                ];
            }

            if ($cat === 'To Do')           $userMap[$accountId]['todo']++;
            elseif ($cat === 'In Progress') $userMap[$accountId]['progress']++;
            if ($duedate !== '' && $duedate < $today) $userMap[$accountId]['overdue']++;
        }

        foreach ($userMap as &$u) {
            $u['totalOpen'] = $u['todo'] + $u['progress'];
        }
        unset($u);

        $rows = array_values($userMap);
        usort($rows, fn($a, $b) =>
            (($b['totalOpen'] + $b['overdue']) <=> ($a['totalOpen'] + $a['overdue']))
            ?: strcmp($a['displayName'], $b['displayName'])
        );

        return $rows;
    });

    /*
     * Everyone's tasks — matches jira folder exactly:
     *   todo:     assigned + statusCategory = "To Do"
     *   progress: assigned + statusCategory = "In Progress"  (includes Feedback status)
     *   feedback: status = "Feedback"  (separate column, may overlap with progress)
     */
    $everyone = jira_cache('overview_everyone_v4', 300, function (): array {
        $fields = 'summary,status,project,duedate,updated,assignee,comment';

        $todoIssues     = jira_search_all(
            'assignee IS NOT EMPTY AND statusCategory = "To Do" ORDER BY duedate ASC, updated DESC',
            $fields
        );
        $progIssues     = jira_search_all(
            'assignee IS NOT EMPTY AND statusCategory = "In Progress" ORDER BY updated DESC',
            $fields
        );
        $feedbackIssues = jira_search_all(
            'status = "Feedback" ORDER BY updated DESC',
            $fields
        );

        return [
            'todo'     => jira_pack_issue_list($todoIssues),
            'progress' => jira_pack_issue_list($progIssues),
            'feedback' => jira_pack_issue_list($feedbackIssues),
        ];
    });

    /*
     * Overdue — matches jira folder exactly:
     *   statusCategory != Done AND duedate < startOfDay()
     */
    $overdue = jira_cache('overview_overdue_v3', 300, function (): array {
        $fields = 'summary,status,project,duedate,updated,assignee,comment';
        $issues = jira_search_all(
            'statusCategory != Done AND duedate IS NOT EMPTY'
            . ' AND duedate < startOfDay() ORDER BY duedate ASC',
            $fields
        );
        return jira_pack_issue_list($issues);
    });

    $users    = $todayData['users'];
    $totalTodo     = array_sum(array_column($users, 'todo'));
    $totalProgress = array_sum(array_column($users, 'progress'));

    echo json_encode([
        'ok'        => true,
        'users'     => $users,
        'totals'    => ['todo' => $totalTodo, 'progress' => $totalProgress],
        'allTasks'  => $todayData['allTasks'],
        'chartData' => $chartData,
        'everyone'  => $everyone,
        'overdue'   => $overdue,
    ]);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
