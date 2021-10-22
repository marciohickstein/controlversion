const users = [
    { id: 1, username: 'suporte', password: 'sup@rte4' },
    { id: 2, username: 'geracao', password: '!m@biliar' }
]

const USER_VALID = 0;
const USER_INVALID = 1;
const USER_NOTSEND = 2;

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
    USER_VALID,
    USER_INVALID,
    USER_NOTSEND
};
