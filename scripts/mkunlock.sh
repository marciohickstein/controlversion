#!/bin/bash
# Script FAKE para desenvolvimento: emula o desbloqueio do repositorio.
set -u

STATE_FILE="${REPO_STATE_FILE:-$(dirname "$(readlink -f "$0")")/repo.state}"

if [ -f "$STATE_FILE" ] && ! rm -f "$STATE_FILE" 2>/dev/null; then
	echo "Falha ao desbloquear o repositorio: nao foi possivel remover $STATE_FILE" >&2
	exit 1
fi

echo "UNLOCKED"
