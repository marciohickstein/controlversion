const config = require('../config');
const path = require('path');
const fs = require('fs');
const { getDateFormatted } = require('../utils')
const logger = require('../logger');

// Grava o registro no inicio do arquivo, criando o diretorio e o arquivo se
// ainda nao existirem.
async function prependFile(file, content) {
	await fs.promises.mkdir(path.dirname(file), { recursive: true });

	let current = '';
	try {
		current = await fs.promises.readFile(file, 'utf8');
	} catch (err) {
		if (err.code !== 'ENOENT')
			throw err;
	}

	await fs.promises.writeFile(file, content + current);
}

module.exports = {
	saveData: (req, res) => {
		let response;
		let { file, data } = req.body;

		if (!file || !data) {
			response = { error: 'Parameter file and data are required' };
			logger.warn('Gravacao de log sem os parametros file/data');
			return res.status(400).json(response);
		}

		file = `${config.app.dirVersao}${file}`;
		const contentData = `${getDateFormatted()}: ${data}\n`;

		prependFile(file, contentData)
			.then(() => {
				response = { success: `Success: ${file} Log file write with: ${data}` };
				logger.debug(`Registro gravado em ${file}`);
				res.json(response);
			})
			.catch((err) => {
				response = { error: err.message };
				logger.error(`Falha ao gravar em ${file}`, err);
				res.status(500).json(response);
			});
	},
	getData: (req, res) => {
		let file = req.query.file;

		if (!file) {
			logger.warn('Leitura de log sem o parametro file');
			return res.status(400).json({ error: 'Parameter file is required' });
		}

		const filename = path.basename(file);
		file = `${config.app.dirVersao}${filename}`;
		fs.readFile(file, (err, data) => {
			if (err) {
				logger.warn(`Nao foi possivel ler o arquivo de log ${file}: ${err.message}`);
				const status = err.code === 'ENOENT' ? 404 : 500;
				return res.status(status).json({ error: err.message });
			}

			return res.json(data.toString());
		});
	}
}