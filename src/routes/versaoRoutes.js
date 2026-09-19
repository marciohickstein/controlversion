const router = require('express').Router();
const { logRequest } = require('../utils');
const logger = require('../logger');
const VersaoController = require('../controllers/versaoController');

// Historico de versao do Imobiliar: o que o painel exibe na aba "Versao".
router.post("/versao", logRequest, VersaoController.saveData);
router.get("/versao", logRequest, VersaoController.getData);

// Compatibilidade: /log era o nome anterior e ainda e usado pelos scripts de
// geracao de versao (ver curl-examples.txt). Remover quando eles migrarem.
function deprecatedPath(req, res, next) {
	logger.warn(`Rota obsoleta [${req.method}] ${req.originalUrl}: utilizar /versao`);
	return next();
}

router.post("/log", logRequest, deprecatedPath, VersaoController.saveData);
router.get("/log", logRequest, deprecatedPath, VersaoController.getData);

module.exports = router;
