<?php
declare(strict_types=1);

// Resolves where config.php lives. Defaults to Api/config.php (the normal,
// non-Docker layout), but is overridable via the CONFIG_PATH env var so
// docker-compose.yml can point it at a bind-mounted, persistent location
// outside the app's code directory - see docker-compose.yml's `backend`
// service. A file bind-mounted directly onto Api/config.php would have to
// already exist on the host before the first `docker compose up`, which is
// exactly what the setup wizard is meant to avoid, so Docker uses a
// dedicated data directory instead.
function app_config_path(): string
{
    $override = getenv('CONFIG_PATH');
    if ($override !== false && trim($override) !== '') {
        return $override;
    }

    return __DIR__ . '/Api/config.php';
}
