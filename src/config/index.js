require('dotenv').config();

if (!process.env.SECRET_KEY) {
	throw new Error('SECRET_KEY nao definida: defina-a no .env antes de iniciar a aplicacao.');
}

module.exports = {
	app: {
		version: "1.0",
		port: process.env.PORT || 8001,
		secretKey: process.env.SECRET_KEY,
		dirModbase: process.env.DIR_MODBASE,
		// dirVersao: arquivos exibidos no painel (servidor.log, cliente.log, ...)
		// DIR_LOG e aceito por compatibilidade com .env anteriores a renomeacao da pasta.
		dirVersao: process.env.DIR_VERSAO || process.env.DIR_LOG,
		// dirAppLog: log de diagnostico da propria aplicacao, separado do anterior
		dirAppLog: process.env.DIR_APP_LOG || './logs',
		logLevel: process.env.LOG_LEVEL || 'info',
		logRetentionDays: Number(process.env.LOG_RETENTION_DAYS || 7),
		// Servidor e scripts que controlam o bloqueio do repositorio
		repoHost: process.env.REPO_HOST,
		repoPort: Number(process.env.REPO_PORT || 22),
		repoScriptDir: (process.env.REPO_SCRIPT_DIR || '').replace(/\/+$/, ''),
		// Cliente SSH usado para rodar os scripts no servidor de repositorio.
		// Aceita argumentos fixos junto ("sshpass -e ssh", "ssh -o StrictHostKeyChecking=accept-new").
		sshCommand: (process.env.SSH_COMMAND || '').trim() || 'ssh',
		imobUser: process.env.IMOBUSER,
		imobPass: process.env.IMOBPASS,
	}
}