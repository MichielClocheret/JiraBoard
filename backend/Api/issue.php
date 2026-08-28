<?php
declare(strict_types=1);

require_once __DIR__ . '/../cors.php';

header('Content-Type: application/json');

require_once __DIR__ . '/api.helper.php';

$key = trim($_GET['key'] ?? '');

if ($key === '' || strlen($key) > 50 || !preg_match('/^[A-Z][A-Z0-9_]+-\d+$/i', $key)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Missing or invalid issue key.']);
    exit;
}

function adf_to_text(mixed $node): string
{
    if (!$node) return '';
    if (is_string($node)) return $node;
    if (!is_array($node)) return '';

    $type = $node['type'] ?? '';

    switch ($type) {
        case 'mention':
            $name = $node['attrs']['text'] ?? $node['attrs']['displayName'] ?? $node['attrs']['id'] ?? 'unknown';
            return '@' . ltrim((string) $name, '@');
        case 'media':
            $filename = $node['attrs']['alt'] ?? $node['attrs']['filename'] ?? $node['attrs']['title'] ?? $node['attrs']['__fileName'] ?? null;
            return $filename ? "\n📎 " . $filename : "\n📎 [attachment]";
        case 'mediaGroup':
        case 'mediaSingle':
            $out = '';
            foreach ($node['content'] ?? [] as $child) $out .= adf_to_text($child);
            return $out;
        case 'inlineCard':
        case 'blockCard':
        case 'embedCard':
            $url = $node['attrs']['url'] ?? null;
            return $url ? ' [' . $url . ']' : '';
        case 'emoji':
            return $node['attrs']['text'] ?? $node['attrs']['shortName'] ?? '';
        case 'hardBreak':
            return "\n";
        case 'rule':
            return "\n---\n";
    }

    if (isset($node['text']) && is_string($node['text'])) {
        return $node['text'];
    }

    $out        = '';
    $blockTypes = ['paragraph', 'heading', 'blockquote', 'listItem', 'bulletList', 'orderedList', 'codeBlock', 'panel'];

    if (isset($node['content']) && is_array($node['content'])) {
        foreach ($node['content'] as $child) {
            $out .= adf_to_text($child);
            $ct = $child['type'] ?? '';
            if (in_array($ct, $blockTypes, true)) $out .= "\n";
        }
    }

    $out = preg_replace("/[ \t]+\n/", "\n", $out);
    $out = preg_replace("/\n{3,}/", "\n\n", $out);
    return trim((string) $out);
}

try {
    $data = jira_cache('issue_v1_' . strtoupper($key), 300, function () use ($key): array {
        $res    = jira_get('/rest/api/3/issue/' . rawurlencode($key), [
            'fields' => 'summary,project,status,duedate,comment',
        ]);
        $fields   = $res['fields'] ?? [];
        $comments = $fields['comment']['comments'] ?? [];

        $feedback = [];
        foreach ($comments as $comment) {
            $feedback[] = [
                'id'      => $comment['id'] ?? null,
                'author'  => $comment['author']['displayName'] ?? '',
                'created' => isset($comment['created']) ? substr((string) $comment['created'], 0, 10) : '',
                'text'    => adf_to_text($comment['body'] ?? null),
            ];
        }

        return [
            'key'      => $key,
            'summary'  => $fields['summary'] ?? '',
            'project'  => [
                'key'  => $fields['project']['key'] ?? '',
                'name' => $fields['project']['name'] ?? '',
            ],
            'status'   => $fields['status']['name'] ?? '',
            'duedate'  => $fields['duedate'] ?? null,
            'feedback' => $feedback,
        ];
    });

    echo json_encode(['ok' => true] + $data);
} catch (RuntimeException $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
