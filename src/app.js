const config = require('./config/');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const logRoutes = require('./routes/logRoutes');
const warnRoutes = require('./routes/warnRoutes');

const JWT = require('jsonwebtoken');
const {logRequest, checkUser, USER_VALID, USER_INVALID, USER_NOTSEND } = require('./utils');

function verifyToken(req, res, next){
    var token = req.headers['x-access-token'];
    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
    
    JWT.verify(token, config.app.secretKey, function(err, decoded) {
      if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
      
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

        this.app.use(authRoutes);
        this.app.use(logRoutes);

        this.app.use('/exec', verifyToken, require('./routes/execRoutes'));
        this.app.use('/', verifyToken, warnRoutes);

        //The 404 Route (ALWAYS Keep this as the last route)
        this.app.get('*', function(req, res){
            res.sendFile(__dirname+'/client/error404.html');
        });
    }
}

module.exports = new AppController().app;