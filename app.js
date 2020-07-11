require('dotenv').config();
const PORT_DEFAULT = 8001;

// Requires
const express = require("express");
const app = express();
const {routerLog} = require("./routes/log");
const {routerExec} = require('./routes/exec');

// Middleware
app.use(express.json());
app.use("/", express.static('client/'));
app.use("/log", routerLog);
app.use('/exec', routerExec);
app.use('/login', (req, res) => {
    let response = {};
    const {user, passwd} = req.query;

    if (!user || !passwd){
        response.login = 'fail';
        response.error = 'Por favor, entre com o usuário e senha';
        return res.send(response);
    }

    if ((user === 'suporte' && passwd === 'sup@rte') ||
        (user === 'geracao' && passwd === '!m@biliar')){
        response.login = 'success';
        response.error = '';
        res.send(response);
    }

    response.login = 'fail';
    response.error = 'Usuário ou senha incorreto(s)';
    return res.send(response);
});

// Main

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
    res.sendFile(__dirname+'/client/error404.html');
});

const port = process.env.PORT || PORT_DEFAULT;
app.listen(port, function() {
    console.log(`Controle de Geracao de Versao rodando na porta ${port}`);
  });