const config = require('./config');
const path = require('path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const versaoRoutes = require('./routes/versaoRoutes');
const warnRoutes = require('./routes/warnRoutes');

const JWT = require('jsonwebtoken');
const logger = require('./logger');
const { logRequest, checkUser, USER_VALID, USER_INVALID, USER_NOTSEND } = require('./utils');

// Diferencia navegacao no site (browser) de chamada de API.
// O browser pede text/html na barra de enderecos; jQuery/fetch pedem */* ou json.
function isBrowsing(req) {
    if (req.xhr) return false;

    return req.accepts(['json', 'html']) === 'html';
}

// Responde a rota inexistente: pagina de erro para o browser, JSON para a API.
function notFound(req, res) {
    logger.warn(`Rota nao encontrada: [${req.method}] ${req.originalUrl}`);

    if (isBrowsing(req))
        return res.status(404).sendFile(path.join(__dirname, '..', 'client', 'error404.html'));

    return res.status(404).json({ error: 'Not found' });
}

function verifyToken(req, res, next) {
    if (req.path === '/connect') {
        next();
        return ;
    }

    // Navegacao no site nunca envia o token: e uma URL que nao existe, nao uma falha de auth.
    if (isBrowsing(req)) return notFound(req, res);

    var token = req.headers['x-access-token'];
    if (!token) {
        logger.warn(`Requisicao sem token: [${req.method}] ${req.originalUrl}`);
        return res.status(401).json({ auth: false, message: 'No token provided.' });
    }

    JWT.verify(token, config.app.secretKey, { algorithms: ['HS256'] }, function (err, decoded) {
        if (err) {
            logger.warn(`Token invalido em [${req.method}] ${req.originalUrl}: ${err.message}`);
            return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
        }

        // se tudo estiver ok, salva no request para uso posterior
        req.userId = decoded.id;
        next();
    });
}

class AppController {
    constructor() {
        this.app = express();
        this.middleware();
        this.routes();
    }

    middleware() {
        this.app.use(express.json());
    }

    routes() {
        this.app.use("/", express.static('client/'));

        // O client usa jQuery, que fica no node_modules da raiz (fora de client/)
        this.app.use('/vendor/jquery', express.static(path.join(__dirname, '..', 'node_modules', 'jquery', 'dist')));

        this.app.use(authRoutes);
        this.app.use(versaoRoutes);

        this.app.use('/exec', verifyToken, require('./routes/execRoutes'));
        this.app.use('/', verifyToken, warnRoutes);

        //The 404 Route (ALWAYS Keep this as the last route)
        this.app.use(notFound);
    }
}

module.exports = new AppController().app;