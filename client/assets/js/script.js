const LOCKED   = "LOCKED";
const UNLOCKED = "UNLOCKED";
const CMDREPO  = "/home/svn/repositorio.sh"

const url = window.location.origin;

// Faz chamadas REST no servidor para buscar os dados
function sendGetRest(url, callback) {
    console.log(`Enviando transação para o servidor: [GET] ${url}`);
    fetch(url)
    .then((response) => {
        if (response.status !== 200)
            throw new Error(`${response.status} (${response.statusText})`);
        response.json().then((data) => {
            console.log(`Dados retornado da transação com o servidor: ${JSON.stringify(data)}`);
            callback(null, data); 
        });
    })
    .catch(function(err){ 
        callback(err, null);
    });
}

function sendHttpRest(path, method, data, callbackSuccess){
    let token = sessionStorage.getItem("token");
    $.ajax({
        url: `${url}/${path}`,
        type: method,
        data: JSON.stringify(data),
        processData: false,
        contentType: "application/json; charset=UTF-8",
        headers: {
            'x-access-token': token ? token : ''
        },
        beforeSend : function(){
            console.log(`Enviando transação para o servidor: [${method}] ${this.url}`);
        },
        success: function(data){
            console.log(`Dados retornado da transação com o servidor: ${JSON.stringify(data)}`);
            if (callbackSuccess)
                callbackSuccess(null, data);
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(`Ocorreu um erro na transação com o servidor: ${thrownError}`);
            if (callbackSuccess)
                callbackSuccess(thrownError, null);
        }
    });
}

function createWarning(data, callback){
    let url = `warn`;
    let paramData = { data };

    sendHttpRest(url, "POST", paramData, callback);
}

function testConnection(host, port, callback){
    let url = `connect`;
    let paramData = { host, port };

    sendHttpRest(url, "POST", paramData, callback);
}

function getLog(file, tabLog){
    let urlRest = `${url}/log?file=${file}`;

    sendGetRest(`${urlRest}`, function (error, data) {
        if (error){
            tabLog.html('');
            // console.log(error);
        }else{
            let dataLog = data && data.length > 0 ? data.replace(/\n/g, '<br>') : '';
            tabLog.html(dataLog);
            // console.log(data);
        }
      });
}

function execCommand(command, params, callback){
    let url = `exec`;
    let data = { cmd: command, params: params };

    sendHttpRest(url, "POST", data, callback);
}

function getStatus(){
    let command = CMDREPO;
    let params = ["status"];
    execCommand(command, params, (err, data) => {
        let status = '';

        if (err){
            status = err;
        }else{
            status = (data.code === -2) ? data.stderr : data.stdout;
        }

        let switchButton = $('#switch1')[0];
        switchButton.checked = (status.trim() === LOCKED);
        $('#status').html(status);
    });
}

function normalize(str) {
    return str.toLowerCase().normalize("NFD").replace(/[^a-zA-Zs]/g, "");
}
    
function getTabSelected(nav, log){
    if (!nav)
        nav = $("a[class='nav-link active']")[0];
    if (!log)
        log = "#" + nav.href.split('#')[1];

    let target = $('#target').val();
    let fileLog = `${normalize(nav.innerText)}${target === "desenv" ? "-tst" : ""}.log`;

    // console.log(nav);
    // console.log(log);
    console.log(fileLog);
    getLog(fileLog, $(log));
}

$(() => {
    $("#btn-toggle").on('click', e => {
        let command = CMDREPO;
        let status = $('#status').html();

        let params = status.trim() === UNLOCKED ? ["lock"] : ["unlock"];

        execCommand(command, params, (err, data)=>{
            console.log(err)
            getStatus();
        });
    });

    $("#btn-connect").on('click', e => {
        testConnection($('#inputHost').val(), $('#inputPort').val(), (err, data)=>{
            if (err) 
            {
                alert(err);
                return ;
            }

            alert(data.message);
        });
    });

    $("#btn-warn").on('click', e => {
        let texto = $('#text-warn').val();
        let dateIni = $('#dtDateIni').val();
        let dateEnd = $('#dtDateEnd').val();

        if (!texto) {
            alert("Por favor entre com a mensagem do aviso!");
        }

        const data = {
            texto,
            dateIni,
            dateEnd
        };

        createWarning(data, (err, data)=>{
            let message;

            if (err) {
                message = err.message;
                console.log(err);
            }
            if (data) {
                message = data.message;
                console.log(data);
            }
            alert(`${message}.`);
        });
    });

    $('#nav1').on('click', (e) => {
        getTabSelected($('#nav1')[0], $('#log1')[0])
    })

    $('#nav2').on('click', (e) => {
        getTabSelected($('#nav2')[0], $('#log2')[0])
    })

    $('#nav3').on('click', (e) => {
        getTabSelected($('#nav3')[0], $('#log3')[0])
    })

    $('#nav4').on('click', (e) => {
        getTabSelected($('#nav4')[0], $('#log4')[0])
    })

    $('#target').on('change', (e) => {
        getTabSelected();
    })

    getStatus();
    getLog('servidor.log', $('#log1'));
})
