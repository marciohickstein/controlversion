require('dotenv').config();
const JWT = require('jsonwebtoken');
const {logRequest, checkUser, USER_VALID, USER_INVALID, USER_NOTSEND } = require('./utils');

const PORT_DEFAULT = 8001;


function verifyToken(req, res, next){
    var token = req.headers['x-access-token'];
    if (!token) return res.status(401).json({ auth: false, message: 'No token provided.' });
    
    JWT.verify(token, process.env.KEY, function(err, decoded) {
      if (err) return res.status(500).json({ auth: false, message: 'Failed to authenticate token.' });
      
      // se tudo estiver ok, salva no request para uso posterior
      req.userId = decoded.id;
      next();
    });
}

// Requires
const express = require("express");
const app = express();
const {routerLog} = require("./routes/log");
const {routerExec} = require('./routes/exec');

// Middleware
app.use(express.json());
app.use("/", express.static('client/'));
app.use("/log", routerLog);
app.use('/exec', verifyToken, routerExec);

app.post('/login', logRequest, (req, res) => {
    const { user, passwd } = req.body;
    let ret = checkUser(user, passwd);
    let response = {};

    if (ret === USER_NOTSEND) {
        response = {auth: false, token: null, error: 'Por favor, entre com o usuário e senha'}
        console.log(response);
        return res.send(response);
    }

    if (ret === USER_INVALID) {
        response = {auth: false, token: null, error: 'Usuário ou senha incorreto(s)'};
        console.log(response);
        return res.send(response);
    }

    if (ret === USER_VALID) {
        JWT.sign({username: user}, process.env.KEY, {algorithm: 'HS256'}, function(err, token) {
            if (err) {
                return res.send({auth: false, token: null, error: 'Não foi possível criar o token de autorização'});
            }

            return res.send({ auth: true, token: token });
        });
    }
});

app.get('/logout', (req, res) => {
    return res.send({auth: false, token: null});
})

// Main

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
    res.sendFile(__dirname+'/client/error404.html');
});

const port = process.env.PORT || PORT_DEFAULT;
app.listen(port, function() {
    console.log(`Controle de Geracao de Versao rodando na porta ${port}`);
  });
