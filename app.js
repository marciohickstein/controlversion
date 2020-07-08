require('dotenv').config();
const PORT_DEFAULT = 3000;

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

// Main

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
    res.sendFile(__dirname+'/client/error404.html');
});

app.listen(PORT_DEFAULT, function() {
    console.log(`Cotrole de Geração de Versão rodando na porta ${PORT_DEFAULT}`);
  });