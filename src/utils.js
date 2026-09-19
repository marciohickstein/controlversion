const { readdirSync } = require('fs');
const { scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');
const logger = require('./logger');

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

// As senhas nao ficam no fonte: guarda-se salt + hash scrypt.
// Para cadastrar ou trocar uma senha: node tools/hash-senha.js '<senha>'
const users = [
    {
        id: 1, username: 'suporte',
        salt: 'c28754d41c14de347b2fe8f07de5ef4c',
        hash: '3de6a1867f1efdf3239c9448aa331148e864fbd1a04209c371df5a0a583ce0c19fe5cdcaf361cd35f43e27dff20eb8a8716fc4ddd6a1e36e0ed5dafba6b9dd12'
    },
    {
        id: 2, username: 'geracao',
        salt: '424730ef91adf9e4f467eeff052ca5d8',
        hash: '05b8516ac32b49871cd82f837b948f976340e0447898894585abe53f6b61779e044a90cbbb1c7dda0a6a8c0eed5e5401965ed923024dc3deced81d714e9e4620'
    }
]

const USER_VALID = 0;
const USER_INVALID = 1;
const USER_NOTSEND = 2;

// Le um diretorio e retorna um array com os arquivos contidos
const readDir = (dir) => {
    const files = readdirSync(dir);

    return Array.isArray(files) ? files : null;
}

// Le a pasta onde esta os arquivos de modificacao de base e retorna o proximo numero disponivel
const getNextModbase = () => {

    // Obtem a lista de arquivos de modbase
    const files = readDir(process.env.DIR_MODBASE);

    if (files === null)
        return '';

    // Retorna apenas os arquivos com formato de modbase. Formato: "mod_base_sql.XXXX.proximo"
    const modbases = files.filter((file) => {
        return (/^mod_base_sql\.\d{4}\.proximo$/g.test(file));
    });

    if (!Array.isArray(modbases))
        return '';

    // Percorre a lista pelo proximo modbase mais recente. 
    const modbase = modbases.reduce((modbaseAvailable, modbase) => {

        if (modbaseAvailable === '')
            return modbase;

        const modbaseNum = Number(modbase.split('.')[1]);

        const modbaseNumAvailable = Number(modbaseAvailable.split('.')[1]);

        return (modbaseNum < modbaseNumAvailable) ? modbase : modbaseAvailable;
    }, '');

    return modbase;
}

async function checkUser(user, passwd) {
    if (!user || !passwd) {
        return USER_NOTSEND; // Faltou usuario ou senha
    }

    const registro = users.find((cadastrado) => cadastrado.username === user);

    // Mesmo sem usuario correspondente o hash e calculado, usando um registro de
    // referencia: assim o tempo de resposta nao denuncia quais usuarios existem.
    const alvo = registro || users[0];
    const calculado = await scryptAsync(passwd, alvo.salt, KEY_LENGTH);
    const confere = timingSafeEqual(calculado, Buffer.from(alvo.hash, 'hex'));

    return (registro && confere) ? USER_VALID : USER_INVALID;
}

function pad(n) {
    return n < 10 ? '0' + n : n;
}

// Get date no timezone Brazil Sao Paulo
function getDateFormatted() {
    let dateTime = getDateTime();
    let date = `${pad(dateTime.getDate())}-${pad(dateTime.getMonth() + 1)}-${dateTime.getFullYear()}`;
    let time = `${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}:${pad(dateTime.getSeconds())}`;
    let dateTimeFormatted = `${date} ${time}`;

    return dateTimeFormatted;
}

function getDateTime() {
    const dateString = new Date().toLocaleString('en-us',
        {
            timeZone: 'America/Sao_Paulo'
        });
    return new Date(dateString);
}

// Return string JSON to Object
function parserData(data) {
    let dataParsed = null;

    try {
        dataParsed = JSON.parse(data);
    } catch (err) { }

    return dataParsed;
}

// Format request received to output
function logRequest(req, res, next) {
    const start = Date.now();
    const body = Object.keys(req.body).length != 0 ? logger.redact(req.body) : undefined;

    logger.info(`Recv: [${req.method}] ${req.originalUrl}`, body);

    res.on('finish', () => {
        logger.info(`Send: [${req.method}] ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
    });

    return next();
}

const setOKResponse = (message = '') => {
    return {
        error: false,
        message
    };
}

const setErrorResponse = (message = '') => {
    return {
        error: true,
        message
    };
}


module.exports = {
    parserData,
    getDateTime,
    logRequest,
    getDateFormatted,
    checkUser,
    setOKResponse,
    setErrorResponse,
    getNextModbase,
    readDir,
    USER_VALID,
    USER_INVALID,
    USER_NOTSEND
};
