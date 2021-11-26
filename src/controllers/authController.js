const jwt = require('jsonwebtoken');
const config = require('../config');

const { checkUser, USER_VALID, USER_INVALID, USER_NOTSEND } = require('../utils');

module.exports = {
	login: (req, res) => {
		const { user, passwd } = req.body;
		let ret = checkUser(user, passwd);
		let response = {};

		if (ret === USER_NOTSEND) {
			response = { auth: false, token: null, error: 'Por favor, entre com o usuário e senha' }
			console.log(response);
			return res.send(response);
		}

		if (ret === USER_INVALID) {
			response = { auth: false, token: null, error: 'Usuário ou senha incorreto(s)' };
			console.log(response);
			return res.send(response);
		}

		if (ret === USER_VALID) {
			jwt.sign({ username: user }, config.app.secretKey, { algorithm: 'HS256' }, function (err, token) {
				if (err) {
					return res.send({ auth: false, token: null, error: 'Não foi possível criar o token de autorização' });
				}

				return res.send({ auth: true, token: token });
			});
		}
	},
	logout: (req, res) => {
		return res.send({ auth: false, token: null });
	}
}

