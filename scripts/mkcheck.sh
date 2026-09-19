#!/bin/bash
# Script FAKE para desenvolvimento: emula a verificacao de bloqueio do repositorio.
# Em producao este papel e do mkcheck.sh no servidor de geracao.
# Saida esperada pela aplicacao: a palavra LOCKED ou UNLOCKED em uma linha.
set -u

STATE_FILE="${REPO_STATE_FILE:-$(dirname "$(readlink -f "$0")")/repo.state}"

if [ -f "$STATE_FILE" ]; then
	echo "LOCKED"
else
	echo "UNLOCKED"
fi
