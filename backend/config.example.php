<?php
declare(strict_types=1);

/**
 * Copy this file to backend/Api/config.php and fill in real values.
 * backend/Api/config.php is gitignored and must be created on every
 * environment individually - it is never committed.
 */

return [
    // Jira REST API v3 credentials (used by everything under backend/Api/)
    'jira_base_url'  => 'https://your-domain.atlassian.net',
    'jira_email'     => 'you@example.com',
    'jira_api_token' => 'your-jira-api-token',

    // MySQL credentials (used by Chat, Dev Tracker, Password Manager)
    'db_host'     => 'localhost',
    'db_name'     => 'jira_chat',
    'db_user'     => 'root',
    'db_password' => '',

    // Optional: root directory File Bridge is allowed to browse/download from.
    // Without this, it falls back to a few hardcoded mount points and
    // directory-name heuristics - see backend/features/finder/*.php.
    'finder_root' => '/path/to/allowed/finder/root',

    // Optional: extra folder/file names to exclude from File Bridge listings,
    // merged with the built-in exclusion list.
    'finder_exclude' => [],
];
