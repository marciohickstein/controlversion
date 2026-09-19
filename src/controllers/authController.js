const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../logger');

const { checkUser, USER_VALID, USER_INVALID, USER_NOTSEND } = require('../utils');

module.exports = {
	login: async (req, res) => {
		const { user, passwd } = req.body;
		let ret = await checkUser(user, passwd);
		let response = {};

		if (ret === USER_NOTSEND) {
			response = { auth: false, token: null, error: 'Por favor, entre com o usuário e senha' }
			logger.warn('Login sem usuario ou senha informados');
			return res.send(response);
		}

		if (ret === USER_INVALID) {
			response = { auth: false, token: null, error: 'Usuário ou senha incorreto(s)' };
			logger.warn(`Login negado para o usuario "${user}"`);
			return res.send(response);
		}

		if (ret === USER_VALID) {
			jwt.sign({ username: user }, config.app.secretKey, { algorithm: 'HS256' }, function (err, token) {
				if (err) {
					logger.error(`Falha ao gerar o token para o usuario "${user}"`, err);
					return res.send({ auth: false, token: null, error: err.message });
				}

				logger.info(`Login efetuado pelo usuario "${user}"`);
				return res.send({ auth: true, token: token });
			});
		}
	},
	logout: (req, res) => {
		logger.info('Logout efetuado');
		return res.send({ auth: false, token: null });
	}
}

