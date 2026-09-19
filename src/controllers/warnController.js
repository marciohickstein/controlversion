const fs = require('fs');
const { Socket } = require('net');
const { basename } = require('path');
const { execSync } = require("child_process");
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);

const { unlinkSync, writeFileSync } = require('fs');
const { getNextModbase, setOKResponse, setErrorResponse } = require('../utils');
const config = require('../config');

const { Client } = require('ssh2');
const logger = require('../logger');

// Traduz os erros tecnicos de rede/SSH para uma mensagem que o usuario comum entenda.
// O detalhe original continua indo para o log do servidor.
function friendlyConnectionError(error, host, port) {
	const detail = `${(error && error.message) || error}`;

	if (/Timed out while waiting for handshake|ETIMEDOUT/i.test(detail))
		return `Não foi possível conectar ao servidor ${host}. Verifique se ele está ligado e acessível na rede.`;

	if (/ECONNREFUSED/i.test(detail))
		return `O servidor ${host} recusou a conexão na porta ${port}. Verifique se o serviço está ativo.`;

	if (/ECONNRESET/i.test(detail))
		return `A conexão com o servidor ${host} foi interrompida. Tente novamente em instantes.`;

	if (/EHOSTUNREACH|ENETUNREACH/i.test(detail))
		return `O servidor ${host} não foi alcançado. Verifique a rede ou o endereço informado.`;

	if (/ENOTFOUND|EAI_AGAIN/i.test(detail))
		return `O endereço ${host} não foi encontrado. Verifique se está escrito corretamente.`;

	if (/authentication methods failed|Authentication failure/i.test(detail))
		return `Não foi possível autenticar no servidor ${host}. Verifique o usuário e a senha configurados.`;

	return `Não foi possível concluir a operação no servidor ${host}. Detalhe técnico: ${detail}`;
}

function executeCommandOnClient(host, port, user, pass, command, response) {
	const conn = new Client();

	const commands = {
		update: 'LD_LIBRARY_PATH=/imobiliar/linux/lib /imobiliar/atualiza.sh -Pproxy',
		blockupt: 'cd /imobiliar ; chmod a-x *tualiza[A,.]*sh ; chmod a-x shells/atualizabase.sh ',
		unblockupt: 'cd /imobiliar ; chmod a+x *tualiza[A,.]*sh ; chmod a+x shells/atualizabase.sh ',
		setreadonly: 'touch /imobiliar/imobiliar.modoleitura',
		unsetreadonly: 'mv /imobiliar/imobiliar.modoleitura /imobiliar/imobiliar.modoleitura.bak',
		chkreadonly: 'if [ $(ls -l /imobiliar/imobiliar.modoleitura 2> /dev/null | wc -l) = 1 ] ; then echo "SIM" ; else echo "NAO" ; fi',
		chkblockupt: 'test -x /imobiliar/atualiza.sh && echo "Atualizacao habilitada" || echo "Atualizacao desabilitada"',
		checkrepo: '/home/geracao/srvDsv/Servidor/Desenv/mkcheck.sh',
		blockrepo: '/home/geracao/srvDsv/Servidor/Desenv/mklock.sh',
		unblockrepo: '/home/geracao/srvDsv/Servidor/Desenv/mkunlock.sh',
	}

	const command2Execute = commands[command];

	if (!command2Execute) {
		const msg = `Command not found`;
		logger.warn(`Comando desconhecido solicitado: "${command}"`);
		response.json(setOKResponse(msg));
		return;
	}

	logger.info(`Executando em ${host}:${port} como ${user}: ${command2Execute}`);
	try {
		conn.on('ready', () => {
//			console.log('Client :: ready');
			conn.exec(command2Execute, (err, stream) => {
				if (err) throw err;
				stream.on('close', (code, signal) => {
					const msg = `Command executed successfully`;
//					console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
					conn.end();
				}).on('data', (data) => {
					const msg = `Command executed successfully\nResponse:\n${data}`;
					logger.debug(`Saida de ${host}: ${data.toString().trim()}`);
					response.json(setOKResponse(msg));
					conn.end();
				}).stderr.on('data', (data) => {
					const msg = `Error to execute command: ${data}`;
					logger.error(`Erro retornado por ${host} ao executar o comando: ${data.toString().trim()}`);
					response.json(setErrorResponse(msg));
				});
			});
		}).on('error', (err) => {
			logger.error(`Falha de conexao com ${host}:${port}`, err);
			response.json(setErrorResponse(friendlyConnectionError(err, host, port)));
			conn.end();
		}).connect({
			host,
			port,
			username: user,
			password: pass
		})
	} catch (error) {
		logger.error(`Falha ao executar o comando em ${host}:${port}`, error);
		response.json(setErrorResponse(friendlyConnectionError(error, host, port)));
	}
}

function testHostPortAccessibility(host, port, response) {
	const socket = new Socket();

	socket.setTimeout(5000); // Set a timeout in milliseconds

	socket.on('connect', () => {
		const msg = `Sucesso ao conectar com o cliente ${host}:${port}`;
		logger.info(msg);
		socket.destroy();
		response.json(setOKResponse(msg));
	});

	socket.on('timeout', () => {
		logger.error(`Timeout ao conectar em ${host}:${port}`);
		socket.destroy();
		response.json(setErrorResponse(`O servidor ${host} não respondeu na porta ${port}. Verifique se ele está ligado e acessível na rede.`));
	});

	socket.on('error', (error) => {
		logger.error(`Erro ao conectar em ${host}:${port}: ${error.message}`);
		socket.destroy();
		response.json(setErrorResponse(friendlyConnectionError(error, host, port)));
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
		const { host, port, command } = req.body;

		let password;
		try {
			password = atob(config.app.imobPass);
		} catch (error) {
			return res.json(setErrorResponse('IMOBPASS invalida: o valor no .env precisa estar em base64.'));
		}

		executeCommandOnClient(host.trim(), port, config.app.imobUser, password, command, res);
	}
}
