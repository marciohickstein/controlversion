const config = require('./src/config');
const logger = require('./src/logger');
const app = require('./src/app');

// Sem isso, uma excecao nao tratada derruba o processo sem deixar rastro no arquivo.
process.on('uncaughtException', (error) => {
	logger.error('Excecao nao tratada. Encerrando a aplicacao', error);
	process.exit(1);
});

process.on('unhandledRejection', (reason) => {
	logger.error('Promise rejeitada sem tratamento', reason);
});

app.listen(config.app.port, function () {
	logger.info(`Controle de Geracao de Versao ${config.app.version} rodando na porta ${config.app.port}`);
	logger.info(`Log da aplicacao: ${logger.file()} (nivel ${config.app.logLevel})`);
});
