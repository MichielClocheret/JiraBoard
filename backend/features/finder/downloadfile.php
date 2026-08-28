<?php
declare(strict_types=1);

require_once __DIR__ . '/../../cors.php';
require_once __DIR__ . '/../../config_path.php';

$config = [];
$configFile = app_config_path();
if (is_file($configFile)) {
    $loaded = require $configFile;
    if (is_array($loaded)) {
        $config = $loaded;
    }
}

function resolveFinderRoot(array $config): ?string
{
    $candidates = [];

    if (!empty($config['finder_root']) && is_string($config['finder_root'])) {
        $candidates[] = $config['finder_root'];
    }

    $envFinderRoot = getenv('JIRA_FINDER_ROOT');
    if (is_string($envFinderRoot) && trim($envFinderRoot) !== '') {
        $candidates[] = trim($envFinderRoot);
    }

    $candidates[] = '/Volumes/Veaudeville_Server';
    $candidates[] = '/media/Veaudeville_Server';
    $candidates[] = '/mnt/Veaudeville_Server';

    $projectRoot = realpath(__DIR__ . '/../..') ?: (__DIR__ . '/../..');
    $normalizedProjectRoot = str_replace('\\', '/', $projectRoot);
    $webDevMarker = '/web_development/';
    $markerPos = strpos($normalizedProjectRoot, $webDevMarker);
    if ($markerPos !== false && $markerPos > 0) {
        $derived = substr($normalizedProjectRoot, 0, $markerPos);
        if (is_string($derived) && $derived !== '') {
            $candidates[] = $derived;
        }
    }

    $cursor = $projectRoot;
    while ($cursor && $cursor !== DIRECTORY_SEPARATOR && dirname($cursor) !== $cursor) {
        if (strcasecmp(basename($cursor), 'Veaudeville_Server') === 0) {
            $candidates[] = $cursor;
            break;
        }
        $cursor = dirname($cursor);
    }

    $uniqueCandidates = [];
    foreach ($candidates as $candidate) {
        if (!is_string($candidate) || trim($candidate) === '') {
            continue;
        }
        $clean = rtrim($candidate, '/');
        if ($clean === '') {
            $clean = '/';
        }
        if (!in_array($clean, $uniqueCandidates, true)) {
            $uniqueCandidates[] = $clean;
        }
    }

    foreach ($uniqueCandidates as $candidate) {
        if (is_dir($candidate) && is_readable($candidate)) {
            return $candidate;
        }
    }

    return null;
}

function failDownload(int $statusCode, string $message): void
{
    http_response_code($statusCode);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

$root = resolveFinderRoot($config);
if ($root === null) {
    failDownload(500, 'Finder root is not accessible.');
}

$requestedPath = (string) ($_GET['path'] ?? '');
if ($requestedPath === '') {
    failDownload(400, 'Missing file path.');
}

$resolvedRoot = realpath($root);
$resolvedFile = realpath($requestedPath);
if ($resolvedRoot === false || $resolvedFile === false) {
    failDownload(404, 'File not found.');
}

$normalizedRoot = rtrim(str_replace('\\', '/', $resolvedRoot), '/') . '/';
$normalizedFile = str_replace('\\', '/', $resolvedFile);

if (strpos($normalizedFile, $normalizedRoot) !== 0) {
    failDownload(403, 'File path is outside the allowed root.');
}

if (!is_file($resolvedFile) || !is_readable($resolvedFile)) {
    failDownload(404, 'File is not readable.');
}

$mime = mime_content_type($resolvedFile);
if (!is_string($mime) || trim($mime) === '') {
    $mime = 'application/octet-stream';
}

$fileName = basename($resolvedFile);

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($resolvedFile));
header('Content-Disposition: attachment; filename="' . addslashes($fileName) . '"');
header('X-Content-Type-Options: nosniff');

readfile($resolvedFile);
exit;
