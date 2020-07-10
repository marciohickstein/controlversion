function pad(n){
    return n < 10 ? '0' + n : n;
}

// Get date no timezone Brazil Sao Paulo
function getDateFormatted(){
    let dateTime = getDateTime();
    let date = `${pad(dateTime.getDate())}-${pad(dateTime.getMonth())}-${dateTime.getFullYear()}`;
    let time = `${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}:${pad(dateTime.getSeconds())}`;
    let dateTimeFormatted = `${date} ${time}`;

    return dateTimeFormatted;
}

function getDateTime(){
    const dateString = new Date().toLocaleString('en-us',
    {
        timeZone: 'America/Sao_Paulo'
    });
    return new Date(dateString);
}

// Return string JSON to Object
function parserData(data){
    let dataParsed = null;
    
    try{
        dataParsed = JSON.parse(data);
    }catch(err){}

    return dataParsed;
}

// Format request received to output
function logRequest(req, res, next){
    const data = Object.keys(req.body).length != 0 ? JSON.stringify(req.body) : '';
    console.log(`Recv: [${req.method}] ${req.originalUrl} ${data ? "[DATA] " + data : ''  }`);
    return next();
}

// Resources exported
module.exports = {parserData, getDateTime, logRequest, getDateFormatted};


