const fs = require('fs');
const path = require('path');
const config = require('./config');

// Logger de diagnostico da aplicacao.
// ATENCAO: grava em config.app.dirAppLog (./logs por padrao), que e diferente
// de config.app.dirVersao (./versao), onde ficam os arquivos exibidos no painel.

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const FILE_PATTERN = /^app-\d{4}-\d{2}-\d{2}\.log$/;
const SENSITIVE_KEYS = ['passwd', 'password', 'pass', 'senha', 'token', 'secret', 'secretkey', 'imobpass'];

const dir = config.app.dirAppLog;
const threshold = LEVELS[config.app.logLevel] !== undefined ? LEVELS[config.app.logLevel] : LEVELS.info;

let lastCleanupDay = null;

function pad(value, size = 2) {
	return String(value).padStart(size, '0');
}

function timestamp(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function currentDay(date = new Date()) {
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Arquivo do dia: app-AAAA-MM-DD.log
function currentFile(date = new Date()) {
	return path.join(dir, `app-${currentDay(date)}.log`);
}

// Remove apenas os arquivos gerados por este logger, mais antigos que a retencao.
function removeExpiredFiles() {
	const days = config.app.logRetentionDays;

	if (!days || days <= 0) return;

	try {
		const limit = Date.now() - (days * 24 * 60 * 60 * 1000);

		for (const name of fs.readdirSync(dir)) {
			if (!FILE_PATTERN.test(name)) continue;

			const file = path.join(dir, name);

			if (fs.statSync(file).mtimeMs < limit)
				fs.unlinkSync(file);
		}
	} catch (error) {
		// Limpeza e best effort: nunca deve interromper a aplicacao.
	}
}

function serialize(value) {
	if (value === undefined) return '';

	if (value instanceof Error)
		return ` ${value.stack || value.message}`;

	if (typeof value === 'string')
		return ` ${value}`;

	try {
		return ` ${JSON.stringify(value)}`;
	} catch (error) {
		return ` ${String(value)}`;
	}
}

// Substitui senhas e tokens por *** antes de qualquer coisa ir para o arquivo.
function redact(value) {
	if (!value || typeof value !== 'object') return value;

	const copy = Array.isArray(value) ? [...value] : { ...value };

	for (const key of Object.keys(copy)) {
		if (SENSITIVE_KEYS.includes(key.toLowerCase()))
			copy[key] = '***';
		else if (copy[key] && typeof copy[key] === 'object')
			copy[key] = redact(copy[key]);
	}

	return copy;
}

function write(level, message, meta) {
	if (LEVELS[level] > threshold) return;

	const now = new Date();
	const line = `${timestamp(now)} [${level.toUpperCase().padEnd(5)}] ${message}${serialize(meta)}`;

	if (level === 'error')
		console.error(line);
	else
		console.log(line);

	try {
		fs.mkdirSync(dir, { recursive: true });

		const day = currentDay(now);
		if (day !== lastCleanupDay) {
			lastCleanupDay = day;
			removeExpiredFiles();
		}

		fs.appendFileSync(currentFile(now), `${line}\n`);
	} catch (error) {
		// Falha ao gravar nao pode derrubar a aplicacao; sobra o console.
		console.error(`${timestamp()} [ERROR] Falha ao gravar no log da aplicacao: ${error.message}`);
	}
}

module.exports = {
	error: (message, meta) => write('error', message, meta),
	warn: (message, meta) => write('warn', message, meta),
	info: (message, meta) => write('info', message, meta),
	debug: (message, meta) => write('debug', message, meta),
	redact,
	file: currentFile
};
