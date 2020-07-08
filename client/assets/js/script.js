const LOCKED   = "LOCKED";
const UNLOCKED = "UNLOCKED";

var url = window.location.origin;

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
    $.ajax({
        url: `${url}/${path}`,
        type: method,
        data: JSON.stringify(data),
        processData: false,
        contentType: "application/json; charset=UTF-8",
        beforeSend : function(){
            console.log(`Enviando transação para o servidor: [${method}] ${this.url}`);
        },
        success: function(data){
            console.log(`Dados retornado da transação com o servidor: ${JSON.stringify(data)}`);
            if (callbackSuccess)
                callbackSuccess(data);
        },
        error: function(xhr, ajaxOptions, thrownError) {
            console.log(`Ocorreu um erro na transação com o servidor: ${this.url}`);
        }
    });
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
    let command = "repositorio.sh";
    let params = ["status"];
    execCommand(command, params, (response) => {
        let status = (response.code === -2) ? response.stderr : response.stdout;
        console.log(response.code);
        console.log(response.stderr);
        console.log(status);
        $('#status').html(status);
        let switchButton = $('#switch1')[0];
        switchButton.checked = (response.stdout.trim() === LOCKED);
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
        let command = "repositorio.sh";
        let status = $('#status').html();

        let params = status.trim() === UNLOCKED ? ["lock"] : ["unlock"];

        execCommand(command, params, (data)=>{
            getStatus();
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
