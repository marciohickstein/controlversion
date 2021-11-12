const { readdirSync } = require('fs');

const users = [
    { id: 1, username: 'suporte', password: 'sup@rte4' },
    { id: 2, username: 'geracao', password: '!m@biliar' }
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

function checkUser(user, passwd) {
    if (!user || !passwd) {
        return USER_NOTSEND; // Faltou usuario ou senha
    }

    // Valida senha hardcode
    for (const userList of users) {
        if (userList.username === user && userList.password === passwd)
            return USER_VALID;
    }

    return USER_INVALID;
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
    const data = Object.keys(req.body).length != 0 ? JSON.stringify(req.body) : '';
    console.log(`Recv: [${req.method}] ${req.originalUrl} ${data ? "[DATA] " + data : ''}`);
    return next();
}

const setOKResponse = (message) => {
    return {
        error: false,
        message
    };
}

const setErrorResponse = (message) => {
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
