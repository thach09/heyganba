#!/usr/bin/env sh
set -eu
umask 077
: "${PGDATABASE:?Set PGDATABASE}"
: "${PGUSER:?Set PGUSER}"
case "$PGDATABASE" in *[!a-zA-Z0-9_]*|'') echo 'Invalid PGDATABASE' >&2; exit 2;; esac
retention=${BACKUP_RETENTION_DAYS:-14}
case "$retention" in *[!0-9]*|'') exit 2;; esac
[ "$retention" -ge 1 ] && [ "$retention" -le 365 ] || exit 2
backup_dir=${BACKUP_DIR:-./backups/postgres}
mkdir -p "$backup_dir"
backup_dir=$(cd "$backup_dir" && pwd -P)
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$backup_dir/${PGDATABASE}_${stamp}.dump"
[ ! -e "$target" ] || { echo 'Backup already exists' >&2; exit 2; }
trap 'rm -f "$target.partial"' EXIT HUP INT TERM
pg_dump --no-password --format=custom --file="$target.partial"
pg_restore --list "$target.partial" >/dev/null
mv "$target.partial" "$target"
# Only this database's timestamped dump files in the resolved backup directory.
find "$backup_dir" -maxdepth 1 -type f -name "${PGDATABASE}_[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]T[0-9][0-9][0-9][0-9][0-9][0-9]Z.dump" -mtime "+$retention" -exec rm -f {} \;
printf 'Backup verified: %s\n' "$target"
