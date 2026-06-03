<?php
declare(strict_types=1);

$_cfg = require __DIR__ . '/config.php';

define('JIRA_BASE_URL',  (string) $_cfg['jira_base_url']);
define('JIRA_EMAIL',     (string) $_cfg['jira_email']);
define('JIRA_API_TOKEN', (string) $_cfg['jira_api_token']);

unset($_cfg);

function jira_get(string $path, array $query = []): array
{
    $url = JIRA_BASE_URL . $path;

    if (!empty($query)) {
        $url .= '?' . http_build_query($query);
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERPWD        => JIRA_EMAIL . ':' . JIRA_API_TOKEN,
        CURLOPT_HTTPAUTH       => CURLAUTH_BASIC,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);

    $raw  = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if ($raw === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new RuntimeException('cURL error: ' . $error);
    }

    curl_close($ch);

    if ($http >= 400) {
        throw new RuntimeException('Jira returned HTTP ' . $http);
    }

    $data = json_decode((string) $raw, true);

    if (!is_array($data)) {
        throw new RuntimeException('Unexpected response from Jira.');
    }

    return $data;
}

function jira_search_all(string $jql, string $fields, int $pageSize = 100): array
{
    $all           = [];
    $nextPageToken = null;

    while (true) {
        $query = ['jql' => $jql, 'fields' => $fields, 'maxResults' => $pageSize];
        if ($nextPageToken !== null) {
            $query['nextPageToken'] = $nextPageToken;
        }

        $res    = jira_get('/rest/api/3/search/jql', $query);
        $issues = $res['issues'] ?? [];

        if (empty($issues)) break;

        foreach ($issues as $issue) {
            $all[] = $issue;
        }

        $isLast        = ($res['isLast'] ?? false) === true;
        $nextPageToken = $res['nextPageToken'] ?? null;

        if ($isLast || $nextPageToken === null) break;
    }

    return $all;
}

function jira_pack_issue_list(array $issues): array
{
    $out = [];
    foreach ($issues as $i) {
        $out[] = [
            'key'            => $i['key'] ?? '',
            'summary'        => $i['fields']['summary'] ?? '',
            'projectKey'     => $i['fields']['project']['key'] ?? '',
            'projectName'    => $i['fields']['project']['name'] ?? '',
            'assigneeName'   => $i['fields']['assignee']['displayName'] ?? null,
            'duedate'        => $i['fields']['duedate'] ?? null,
            'updated'        => isset($i['fields']['updated'])
                                    ? substr((string) $i['fields']['updated'], 0, 10)
                                    : null,
            'status'         => $i['fields']['status']['name'] ?? '',
            'statusCategory' => $i['fields']['status']['statusCategory']['name'] ?? '',
            'commentCount'   => isset($i['fields']['comment']['total']) ? (int) $i['fields']['comment']['total'] : 0,
        ];
    }
    return $out;
}

function jira_cache(string $key, int $ttl, callable $fetch): array
{
    $dir  = __DIR__ . '/cache';
    $safe = preg_replace('/[^a-zA-Z0-9_-]/', '_', $key);
    $file = $dir . '/' . $safe . '.json';

    if (is_file($file) && (time() - filemtime($file)) < $ttl) {
        $data = json_decode((string) file_get_contents($file), true);
        if (is_array($data)) return $data;
    }

    $data = $fetch();

    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    file_put_contents($file, json_encode($data));

    return $data;
}
