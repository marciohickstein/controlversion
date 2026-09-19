const { spawn } = require('child_process');
const logger = require('../logger');

module.exports = {
	exec: (req, res) => {
		let execCmd = true;
		const { cmd, params } = req.body;

		if (!cmd) {
			execCmd = false;
			response = { error: "Command parameter is required" }
			logger.warn('Requisicao de execucao sem o parametro cmd');
			res.json(response);
		}

		if (params && !Array.isArray(params)) {
			execCmd = false;
			response = { error: "Params have to be an array" }
			logger.warn('Requisicao de execucao com params fora do formato de array');
			res.json(response);
		}

		if (execCmd) {
			let stdout = "", stderr = "";
			const command = spawn(cmd, params ? params : []);

			command.stdout.on('data', (data) => {
				stdout = data.toString();
			})

			command.stderr.on('data', (data) => {
				stderr = data.toString();
			})

			command.on('error', (error) => {
				logger.error(`Falha ao executar "${cmd}"`, error);
			})

			command.on('close', (code) => {
				logger.debug(`Comando "${cmd}" terminou com codigo ${code}`);
				response = {
					code: code,
					stdout: stdout,
					stderr: code === -2 ? 'Command not found' : stderr
				}
				res.json(response);
			});
		}
	}
}