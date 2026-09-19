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
		imobUser: process.env.IMOBUSER,
		imobPass: process.env.IMOBPASS,
	}
}