const config = require('./src/config');
const app = require('./src/app');

app.listen(config.app.port, function () {
	console.log(`Controle de Geracao de Versao rodando na porta ${config.app.port}`);
});
