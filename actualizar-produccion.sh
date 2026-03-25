#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_PATH="/home/cloudmallorca-monitor/htdocs/energiaMonitor"
APP_DOWN=0

BRANCH=""
SKIP_ASSETS=0
SKIP_PULL=0
NO_MAINTENANCE=0

PHP_BIN="${PHP_BIN:-}"
COMPOSER_BIN="${COMPOSER_BIN:-}"
NPM_BIN="${NPM_BIN:-}"

usage() {
    cat <<'EOF'
Uso:
  ./actualizar-produccion.sh [opciones]

Opciones:
  --branch <rama>      Rama a desplegar. Si no se indica, se puede elegir en terminal.
  --skip-assets        No ejecuta npm ci ni npm run build.
  --skip-pull          No hace git fetch / git pull.
  --no-maintenance     No pone la app en mantenimiento durante la actualizacion.
  -h, --help           Muestra esta ayuda.

Variables opcionales:
  PHP_BIN              Ruta al binario de PHP.
  COMPOSER_BIN         Ruta al binario de Composer.
  NPM_BIN              Ruta al binario de npm.
EOF
}

log() {
    printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

fail() {
    log "ERROR: $*"
    exit 1
}

resolve_php_bin() {
    if [[ -n "$PHP_BIN" ]]; then
        [[ -x "$PHP_BIN" ]] || fail "PHP_BIN no es ejecutable: $PHP_BIN"
        printf '%s\n' "$PHP_BIN"
        return
    fi

    local candidate
    for candidate in /usr/bin/php8.4 php8.4 /usr/bin/php php; do
        if command -v "$candidate" >/dev/null 2>&1; then
            command -v "$candidate"
            return
        fi
    done

    fail "No se ha encontrado PHP. Define PHP_BIN o instala php/php8.4."
}

resolve_composer_bin() {
    if [[ -n "$COMPOSER_BIN" ]]; then
        if [[ -x "$COMPOSER_BIN" || -f "$COMPOSER_BIN" ]]; then
            printf '%s\n' "$COMPOSER_BIN"
            return
        fi
        fail "COMPOSER_BIN no es valido: $COMPOSER_BIN"
    fi

    if command -v composer >/dev/null 2>&1; then
        command -v composer
        return
    fi

    if [[ -f "$PROJECT_PATH/composer.phar" ]]; then
        printf '%s\n' "$PROJECT_PATH/composer.phar"
        return
    fi

    fail "No se ha encontrado Composer. Define COMPOSER_BIN o instala composer."
}

resolve_npm_bin() {
    if [[ -n "$NPM_BIN" ]]; then
        if [[ -x "$NPM_BIN" || -f "$NPM_BIN" ]]; then
            printf '%s\n' "$NPM_BIN"
            return
        fi
        fail "NPM_BIN no es valido: $NPM_BIN"
    fi

    if command -v npm >/dev/null 2>&1; then
        command -v npm
        return
    fi

    printf '\n'
}

run() {
    log ">> $*"
    "$@"
}

get_current_branch() {
    git branch --show-current
}

list_branches() {
    {
        git for-each-ref --format='%(refname:short)' refs/heads
        git for-each-ref --format='%(refname:strip=3)' refs/remotes/origin | grep -v '^HEAD$' || true
    } | awk 'NF && !seen[$0]++'
}

select_branch() {
    local current_branch selection
    local branches=()

    current_branch="$(get_current_branch || true)"

    while IFS= read -r branch; do
        [[ -n "$branch" ]] && branches+=("$branch")
    done < <(list_branches)

    [[ ${#branches[@]} -gt 0 ]] || fail "No se encontraron ramas disponibles."

    printf '\nRamas disponibles:\n'

    local i=1
    local marker=""
    for branch in "${branches[@]}"; do
        marker=""
        if [[ -n "$current_branch" && "$branch" == "$current_branch" ]]; then
            marker=" (actual)"
        fi
        printf '  %2d) %s%s\n' "$i" "$branch" "$marker"
        ((i++))
    done

    if [[ -n "$current_branch" ]]; then
        printf '\nSelecciona una rama por numero o nombre [%s]: ' "$current_branch"
    else
        printf '\nSelecciona una rama por numero o nombre: '
    fi

    read -r selection

    if [[ -z "$selection" ]]; then
        [[ -n "$current_branch" ]] || fail "Debes indicar una rama."
        BRANCH="$current_branch"
        return
    fi

    if [[ "$selection" =~ ^[0-9]+$ ]]; then
        local index=$((selection - 1))
        (( index >= 0 && index < ${#branches[@]} )) || fail "Seleccion no valida: $selection"
        BRANCH="${branches[$index]}"
        return
    fi

    local branch
    for branch in "${branches[@]}"; do
        if [[ "$branch" == "$selection" ]]; then
            BRANCH="$branch"
            return
        fi
    done

    fail "La rama indicada no existe: $selection"
}

checkout_branch() {
    local branch="$1"

    if git show-ref --verify --quiet "refs/heads/$branch"; then
        run git checkout "$branch"
        return
    fi

    if git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
        run git checkout -B "$branch" "origin/$branch"
        return
    fi

    fail "No existe la rama '$branch' ni en local ni en origin."
}

cleanup() {
    local exit_code=$?

    if [[ "$APP_DOWN" -eq 1 ]]; then
        log "Levantando la aplicacion..."
        "$PHP_BIN" artisan up || true
    fi

    if [[ $exit_code -ne 0 ]]; then
        log "Actualizacion abortada."
    fi

    exit $exit_code
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --branch)
            [[ $# -ge 2 ]] || fail "Falta el valor de --branch"
            BRANCH="$2"
            shift 2
            ;;
        --skip-assets)
            SKIP_ASSETS=1
            shift
            ;;
        --skip-pull)
            SKIP_PULL=1
            shift
            ;;
        --no-maintenance)
            NO_MAINTENANCE=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            fail "Opcion no reconocida: $1"
            ;;
    esac
done

trap cleanup EXIT

cd "$PROJECT_PATH" || fail "No se puede acceder al proyecto en $PROJECT_PATH"

PHP_BIN="$(resolve_php_bin)"
COMPOSER_BIN="$(resolve_composer_bin)"
NPM_BIN="$(resolve_npm_bin)"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
    fail "Hay cambios locales sin confirmar. Limpia el arbol antes de actualizar."
fi

if [[ "$SKIP_PULL" -eq 0 ]]; then
    run git fetch --all --prune
fi

if [[ -z "$BRANCH" ]]; then
    if [[ -t 0 ]]; then
        select_branch
    else
        BRANCH="$(get_current_branch)"
    fi
fi

[[ -n "$BRANCH" ]] || fail "No se pudo determinar la rama actual."

log "Proyecto: $PROJECT_PATH"
log "Rama: $BRANCH"
log "PHP: $PHP_BIN"
log "Composer: $COMPOSER_BIN"

if [[ "$NO_MAINTENANCE" -eq 0 ]]; then
    run "$PHP_BIN" artisan down --retry=60
    APP_DOWN=1
fi

if [[ "$SKIP_PULL" -eq 0 ]]; then
    current_branch="$(git branch --show-current)"
    if [[ "$current_branch" != "$BRANCH" ]]; then
        checkout_branch "$BRANCH"
    fi
    run git pull --ff-only origin "$BRANCH"
else
    current_branch="$(git branch --show-current)"
    if [[ "$current_branch" != "$BRANCH" ]]; then
        checkout_branch "$BRANCH"
    fi
fi

if [[ "$COMPOSER_BIN" == *.phar ]]; then
    run "$PHP_BIN" "$COMPOSER_BIN" install --no-dev --prefer-dist --optimize-autoloader --no-interaction
else
    run "$COMPOSER_BIN" install --no-dev --prefer-dist --optimize-autoloader --no-interaction
fi

run "$PHP_BIN" artisan optimize:clear
run "$PHP_BIN" artisan migrate --force
run "$PHP_BIN" artisan config:cache
run "$PHP_BIN" artisan route:cache
run "$PHP_BIN" artisan view:cache
run "$PHP_BIN" artisan event:cache
run "$PHP_BIN" artisan queue:restart
run "$PHP_BIN" artisan schedule:clear-cache

if [[ "$SKIP_ASSETS" -eq 0 ]]; then
    if [[ -n "$NPM_BIN" ]]; then
        log "npm: $NPM_BIN"
        run "$NPM_BIN" ci
        run "$NPM_BIN" run build
    else
        log "npm no esta disponible. Se omite la compilacion de assets."
    fi
else
    log "Compilacion de assets omitida por parametro."
fi

if [[ "$APP_DOWN" -eq 1 ]]; then
    run "$PHP_BIN" artisan up
    APP_DOWN=0
fi

log "Actualizacion completada correctamente."
