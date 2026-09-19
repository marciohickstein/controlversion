#!/bin/bash
# Script FAKE para desenvolvimento: emula o bloqueio do repositorio.
set -u

STATE_FILE="${REPO_STATE_FILE:-$(dirname "$(readlink -f "$0")")/repo.state}"

if ! touch "$STATE_FILE" 2>/dev/null; then
	echo "Falha ao bloquear o repositorio: nao foi possivel gravar em $STATE_FILE" >&2
	exit 1
fi

echo "LOCKED"
