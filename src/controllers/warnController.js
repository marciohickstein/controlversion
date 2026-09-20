const fs = require('fs');
const { Socket } = require('net');
const { basename } = require('path');
const { execSync, spawn } = require("child_process");
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);

const { unlinkSync, writeFileSync } = require('fs');
const { getNextModbase, setOKResponse, setErrorResponse } = require('../utils');
const config = require('../config');

const logger = require('../logger');

// Traduz os erros tecnicos de rede/SSH para uma mensagem que o usuario comum entenda.
// O detalhe original continua indo para o log do servidor.
function friendlyConnectionError(error, host, port) {
	const detail = `${(error && error.message) || error}`;

	if (/Timed out while waiting for handshake|ETIMEDOUT|Connection timed out|Operation timed out/i.test(detail))
		return `Não foi possível conectar ao servidor ${host}. Verifique se ele está ligado e acessível na rede.`;

	if (/ECONNREFUSED|Connection refused/i.test(detail))
		return `O servidor ${host} recusou a conexão na porta ${port}. Verifique se o serviço está ativo.`;

	if (/ECONNRESET|Connection reset|Connection closed by remote host|kex_exchange_identification/i.test(detail))
		return `A conexão com o servidor ${host} foi interrompida. Tente novamente em instantes.`;

	if (/EHOSTUNREACH|ENETUNREACH|No route to host|Network is unreachable/i.test(detail))
		return `O servidor ${host} não foi alcançado. Verifique a rede ou o endereço informado.`;

	if (/ENOTFOUND|EAI_AGAIN|Could not resolve hostname|Name or service not known/i.test(detail))
		return `O endereço ${host} não foi encontrado. Verifique se está escrito corretamente.`;

	// O ssh guarda a chave do servidor em ~/.ssh/known_hosts do usuario que roda a
	// aplicacao. Na primeira conexao ela ainda nao esta la e o acesso e recusado.
	if (/Host key verification failed|REMOTE HOST IDENTIFICATION HAS CHANGED|No RSA host key is known/i.test(detail))
		return `A identidade do servidor ${host} não pôde ser confirmada. Registre a chave dele em known_hosts no servidor da aplicação.`;

	if (/authentication methods failed|Authentication failure|Permission denied|sshpass: Wrong password|Too many authentication failures/i.test(detail))
		return `Não foi possível autenticar no servidor ${host}. Verifique o usuário e a senha configurados.`;

	return `Não foi possível concluir a operação no servidor ${host}. Detalhe técnico: ${detail}`;
}

// atob() aceita qualquer base64 valido, inclusive um que nao veio de uma senha em
// texto. Quando a IMOBPASS guarda a senha crua, a decodificacao "funciona" e produz
// bytes binarios, e o SSH so responde "authentication methods failed".
function pareceTexto(valor) {
	return [...valor].every((caractere) => {
		const codigo = caractere.charCodeAt(0);
		return codigo >= 32 && codigo <= 126;
	});
}

// Quantas vezes tentar quando a conexao morre antes do handshake, e a espera
// entre elas (multiplicada pelo numero da tentativa).
const MAX_TENTATIVAS = 3;
const ESPERA_ENTRE_TENTATIVAS = 400;

// Codigo que o cliente ssh reserva para os erros dele mesmo (conexao, autenticacao).
// Qualquer outro valor veio do comando executado no servidor remoto.
const SAIDA_ERRO_DO_SSH = 255;

// SSH_COMMAND pode trazer argumentos fixos junto do executavel, por exemplo
// "sshpass -e ssh" ou "/usr/bin/ssh -o StrictHostKeyChecking=accept-new".
// O primeiro pedaco e o programa; o resto entra antes dos argumentos montados aqui.
function partesDoComandoSsh() {
	const partes = config.app.sshCommand.trim().split(/\s+/);
	const programa = partes[0];
	const argumentosFixos = partes.slice(1);
	// Com o sshpass a senha do .env ainda e usada (ele a le da variavel SSHPASS);
	// com o ssh puro a autenticacao fica por conta da chave do usuario da aplicacao.
	const usaSshpass = /(^|\/)sshpass$/.test(programa);

	// Sem o sshpass o ssh pediria a senha no terminal e ficaria parado esperando
	// alguem que nao existe: o BatchMode faz ele falhar na hora, com mensagem.
	if (!usaSshpass && !argumentosFixos.some((argumento) => /BatchMode/i.test(argumento)))
		argumentosFixos.push('-o', 'BatchMode=yes');

	// Sem limite de tempo uma maquina desligada seguraria a requisicao por minutos.
	if (!argumentosFixos.some((argumento) => /ConnectTimeout/i.test(argumento)))
		argumentosFixos.push('-o', 'ConnectTimeout=10');

	return { programa, argumentosFixos, usaSshpass };
}

// Conexao derrubada antes do handshake significa que o servidor nem chegou a
// enviar o banner SSH: o comando nao foi executado, entao repetir e seguro.
// E o sintoma do throttling do sshd (MaxStartups), que recusa conexoes nao
// autenticadas de forma probabilistica quando ha muitas em andamento.
function caiuAntesDoHandshake(detalhe) {
	return /kex_exchange_identification|Connection closed by remote host|Connection reset by peer|banner exchange/i.test(detalhe);
}

function executeCommandOnClient(host, port, user, pass, command, response, tentativa = 1) {
	let encerrado = false;
	let saida = '';
	let saidaErro = '';

	// O processo pode falhar por mais de um caminho (um 'error' seguido do 'close',
	// por exemplo). Sem esta trava a segunda resposta estoura ERR_HTTP_HEADERS_SENT
	// e derruba o processo. O mesmo sinalizador impede duas novas tentativas.
	function responder(payload) {
		if (encerrado) return;

		encerrado = true;
		response.json(payload);
	}

	const commands = {
		update: 'LD_LIBRARY_PATH=/imobiliar/linux/lib /imobiliar/atualiza.sh -Pproxy',
		blockupt: 'cd /imobiliar ; chmod a-x *tualiza[A,.]*sh ; chmod a-x shells/atualizabase.sh ',
		unblockupt: 'cd /imobiliar ; chmod a+x *tualiza[A,.]*sh ; chmod a+x shells/atualizabase.sh ',
		setreadonly: 'touch /imobiliar/imobiliar.modoleitura',
		unsetreadonly: 'mv /imobiliar/imobiliar.modoleitura /imobiliar/imobiliar.modoleitura.bak',
		chkreadonly: 'if [ $(ls -l /imobiliar/imobiliar.modoleitura 2> /dev/null | wc -l) = 1 ] ; then echo "SIM" ; else echo "NAO" ; fi',
		chkblockupt: 'test -x /imobiliar/atualiza.sh && echo "Atualizacao habilitada" || echo "Atualizacao desabilitada"',
		checkrepo: `${config.app.repoScriptDir}/mkcheck.sh`,
		blockrepo: `${config.app.repoScriptDir}/mklock.sh`,
		unblockrepo: `${config.app.repoScriptDir}/mkunlock.sh`,
	}

	const command2Execute = commands[command];

	if (!command2Execute) {
		const msg = `Command not found`;
		logger.warn(`Comando desconhecido solicitado: "${command}"`);
		responder(setOKResponse(msg));
		return;
	}

	const { programa, argumentosFixos, usaSshpass } = partesDoComandoSsh();
	// O comando remoto vai como um argumento unico: nada aqui passa por um shell
	// local, entao aspas e ponto-e-virgula chegam inteiros no servidor.
	const argumentos = [...argumentosFixos, '-p', `${port}`, `${user}@${host}`, command2Execute];

	// Linha completa e equivalente ao que e executado, para reproduzir no terminal.
	// A senha nunca entra aqui: o sshpass a le da variavel de ambiente SSHPASS.
	logger.info(`Executando via SSH: ${programa} ${argumentosFixos.join(' ')} ` +
		`-p ${port} ${user}@${host} '${command2Execute}'`);

	let processo;

	try {
		processo = spawn(programa, argumentos, {
			// stdin fechado: nao ha ninguem para responder a um prompt interativo.
			stdio: ['ignore', 'pipe', 'pipe'],
			env: usaSshpass ? { ...process.env, SSHPASS: pass } : process.env
		});
	} catch (error) {
		logger.error(`Falha ao executar "${programa}"`, error);
		responder(setErrorResponse(friendlyConnectionError(error, host, port)));
		return;
	}

	// A saida e acumulada e respondida no encerramento do processo: responder no
	// primeiro 'data' truncava comandos que escrevem em varios pedacos.
	processo.stdout.on('data', (data) => {
		saida += data;
	});

	processo.stderr.on('data', (data) => {
		saidaErro += data;
	});

	processo.on('error', (error) => {
		if (error.code === 'ENOENT') {
			logger.error(`Comando SSH "${programa}" nao encontrado no servidor da aplicacao`, error);
			responder(setErrorResponse(
				`O comando SSH "${programa}" não foi encontrado no servidor da aplicação. ` +
				`Ajuste SSH_COMMAND no .env.`));
			return;
		}

		logger.error(`Falha ao executar "${programa}" para ${host}:${port}`, error);
		responder(setErrorResponse(friendlyConnectionError(error, host, port)));
	});

	processo.on('close', (code) => {
		if (encerrado) return;

		// Erro do proprio ssh: o comando remoto nem chegou a rodar. O sshpass usa
		// codigos menores para os casos dele (senha errada, chave desconhecida),
		// mas so quando nada saiu no stdout e a mensagem e reconhecidamente dele.
		const detalhe = saidaErro.trim();
		const falhaDoSsh = code === SAIDA_ERRO_DO_SSH ||
			(!saida && /^sshpass:|Permission denied|Host key verification failed/im.test(detalhe));

		if (falhaDoSsh) {
			const motivo = detalhe || `o comando SSH terminou com o codigo ${code}`;

			if (caiuAntesDoHandshake(motivo) && tentativa < MAX_TENTATIVAS) {
				const espera = ESPERA_ENTRE_TENTATIVAS * tentativa;

				encerrado = true;
				logger.warn(`Conexao com ${host}:${port} caiu antes do handshake (${motivo}). ` +
					`Tentando de novo em ${espera}ms (tentativa ${tentativa + 1} de ${MAX_TENTATIVAS})`);
				setTimeout(() => executeCommandOnClient(host, port, user, pass, command, response, tentativa + 1), espera);
				return;
			}

			logger.error(`Falha de conexao com ${host}:${port}: ${motivo}`);
			responder(setErrorResponse(friendlyConnectionError(motivo, host, port)));
			return;
		}

		if (saidaErro && !saida) {
			logger.error(`Erro retornado por ${host} ao executar o comando: ${detalhe}`);
			responder(setErrorResponse(`Error to execute command: ${saidaErro}`));
			return;
		}

		if (saidaErro)
			logger.warn(`${host} escreveu em stderr mas o comando produziu saida: ${detalhe}`);

		logger.debug(`Saida de ${host} (codigo ${code}): ${saida.trim()}`);
		responder(setOKResponse(`Command executed successfully\nResponse:\n${saida}`));
	});
}

function testHostPortAccessibility(host, port, response) {
	const socket = new Socket();

	let respondido = false;

	// Mesma protecao do executeCommandOnClient: um timeout seguido de erro no
	// mesmo socket responderia duas vezes e derrubaria a aplicacao.
	function responder(payload) {
		if (respondido) return;

		respondido = true;
		response.json(payload);
	}

	socket.setTimeout(5000); // Set a timeout in milliseconds

	socket.on('connect', () => {
		const msg = `Sucesso ao conectar com o cliente ${host}:${port}`;
		logger.info(msg);
		socket.destroy();
		responder(setOKResponse(msg));
	});

	socket.on('timeout', () => {
		logger.error(`Timeout ao conectar em ${host}:${port}`);
		socket.destroy();
		responder(setErrorResponse(`O servidor ${host} não respondeu na porta ${port}. Verifique se ele está ligado e acessível na rede.`));
	});

	socket.on('error', (error) => {
		logger.error(`Erro ao conectar em ${host}:${port}: ${error.message}`);
		socket.destroy();
		responder(setErrorResponse(friendlyConnectionError(error, host, port)));
	});

	socket.on('close', (hadError) => {
		logger.debug(`Conexao com ${host}:${port} encerrada${hadError ? ' apos erro' : ''}`);
	});

	socket.connect(port, host);
}

async function execScript(command, arguments) {
	let success = false;

	try {
		output = await execFile(command, arguments);
		if (!output.stderr) {
			success = true;
			logger.debug(`Script ${command} executado com sucesso`, output.stdout);
		} else {
			logger.error(`Script ${command} retornou erro: ${output.stderr}`);
		}
	} catch (error) {
		logger.error(`Falha ao executar o script ${command}`, error);
	}

	return success;
}

const validate = (texto, dateIni, dateEnd) => {
	if (!texto) {
		return setErrorResponse('Faltou informar o texto que deseja ser lembrado');
	}

	try {
		new Date(dateIni)
	} catch (error) {
		return setErrorResponse(`Campo de data inicial invalida. Erro: ${error}`);
	}

	try {
		new Date(dateEnd)
	} catch (error) {
		return setErrorResponse(`Campo de data final invalida. Erro: ${error}`);
	}

	return setOKResponse();
}

module.exports = {
	create: async (req, res) => {
		// Valida parametros da requisicao
		let { texto, dateIni, dateEnd } = req.body.data;

		const responseValidate = validate(texto, dateIni, dateEnd);

		if (responseValidate.error) {
			return res.json(responseValidate);
		}

		// Tenta criar um modbase com o numero mais recente disponivel
		let fullPathNextModbaseDest;

		try {
			const nextModbase = getNextModbase();

			if (!nextModbase) {
				return res.json(setErrorResponse(`Não foi possível localizar o próximo modbase em ${process.env.DIR_MODBASE}`));
			}

			// Escrevo no arquivo de modbase o comando para criar lembrete geral
			let text = Buffer.from(texto);
			const fullPathNextModbase = `${process.env.DIR_MODBASE}/${nextModbase}`;

			const strDateIni = dateIni ? `'${dateIni}'` : `null`;
			const strDateEnd = dateEnd ? `'${dateEnd}'` : `null`;
			const textoSql = `SELECT fnc_cria_lembrete_aviso('${text.toString()}', ${strDateIni}, ${strDateEnd});`;

			writeFileSync(fullPathNextModbase, textoSql);

			fullPathNextModbaseDest = `${process.env.DIR_MODBASE}mod_base_sql.${nextModbase.split('.')[1]}.prd.tst`;
			execSync(`iconv ${fullPathNextModbase} -futf8 -tiso88591 > ${fullPathNextModbaseDest}`);
			unlinkSync(fullPathNextModbase);
		} catch (error) {
			return res.json(setErrorResponse(error.message));
		}

		try {
			const currentDir = process.cwd();
			process.chdir(process.env.DIR_MODBASE);

			await execScript(`/home/svn/repositorio.sh`, [`unlock`]);
			await execScript(`./copiabase.sh`, [basename(`${fullPathNextModbaseDest}`)]);
			await execScript(`/home/svn/repositorio.sh`, [`lock`]);

			process.chdir(currentDir);
		} catch (error) {
			const messageError =
				`Modbase ${fullPathNextModbaseDest} de lembrete criado no srvinet2 com sucesso, ` +
				`mas não foi possível publicar o mesmo com o programa copiabase.\n` +
				`Favor pedir para algum desenvolvedor efetuar o copia base!\n` +
				`Error message: ${error}`;
			return res.json(setErrorResponse(messageError));
		}

		return res.json(setOKResponse('Modbase criado e publicado com sucesso!'));
	},
	connect: async (req, res) => {
		const { host, port } = req.body;
		logger.info(`Teste de conexao solicitado para ${host}:${port}`);
		testHostPortAccessibility(host, port, res);
	},
	executeOnClient: async (req, res) => {
		const { command } = req.body;
		// O endereco do servidor de repositorio e do servidor, nao do cliente.
		const host = config.app.repoHost;
		const port = config.app.repoPort;

		if (!host) {
			logger.error('REPO_HOST nao configurada no .env');
			return res.json(setErrorResponse('Servidor de repositorio nao configurado. Defina REPO_HOST no .env.'));
		}

		if (!config.app.repoScriptDir) {
			logger.error('REPO_SCRIPT_DIR nao configurada no .env');
			return res.json(setErrorResponse('Diretorio dos scripts nao configurado. Defina REPO_SCRIPT_DIR no .env.'));
		}

		// A senha so faz sentido quando o SSH_COMMAND e um sshpass: o ssh puro
		// autentica pela chave do usuario que roda a aplicacao.
		const { usaSshpass } = partesDoComandoSsh();
		let password = '';

		if (usaSshpass) {
			try {
				password = atob(config.app.imobPass);
			} catch (error) {
				return res.json(setErrorResponse('IMOBPASS invalida: o valor no .env precisa estar em base64.'));
			}

			if (!pareceTexto(password))
				logger.warn('IMOBPASS decodificada contem caracteres nao imprimiveis. ' +
					'Provavelmente a senha foi gravada em texto puro no .env; ' +
					'o valor esperado e o base64 dela (printf %s "<senha>" | base64).');
		}

		executeCommandOnClient(host.trim(), port, config.app.imobUser, password, command, res);
	}
}
