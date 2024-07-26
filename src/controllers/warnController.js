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
	}

	const command2Execute = commands[command];

	if (!command2Execute) {
		const msg = `Command not found`;
		console.log(msg);
		response.json(setOKResponse(msg));
		return;
	}

	console.log(`Executing command on ${host}:${port} ${command2Execute} as ${user}`)
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
					console.log(data.toString());
					response.json(setOKResponse(msg));
					conn.end();
				}).stderr.on('data', (data) => {
					console.log('STDERR: ' + data);
					const msg = `Error to execute command: ${data}`;
					console.log(msg);
					response.json(setOKResponse(msg));
				});
			});
		}).connect({
			host,
			port,
			username: user,
			password: pass
		});
	} catch (error) {
		console.log('STDERR: ' + error);
		const msg = `Error to execute command: ${error}`;
		console.log(error);
		response.json(setOKResponse(error));
	}
}

function testHostPortAccessibility(host, port, response) {
	const socket = new Socket();

	socket.setTimeout(5000); // Set a timeout in milliseconds

	socket.on('connect', () => {
		const msg = `Sucesso ao conectar com o cliente ${host}:${port}`;
		console.log(msg);
		socket.destroy();
		response.json(setOKResponse(msg));
	});

	socket.on('timeout', () => {
		const msg = `Tempo de conexao com o cliente ${host}:${port} expirou. \nTente novamente mais tarde.`;
		console.error(msg);
		socket.destroy();
		response.json(setErrorResponse(msg));
	});

	socket.on('error', (error) => {
		const msg = `Erro ao conectar com o cliente ${host}:${port}: ${error.message}`;
		console.error(msg);
		socket.destroy();
		response.json(setErrorResponse(msg));
	});

	socket.on('close', (hadError) => {
		if (hadError) {
			console.error(`Socket closed due to errors`);
		} else {
			console.log(`Socket closed gracefully`);
		}
	});

	socket.connect(port, host);
}

async function execScript(command, arguments) {
	let success = false;

	try {
		output = await execFile(command, arguments);
		if (!output.stderr) {
			success = true;
			console.log('success', output.stdout);
		}
	} catch (error) {
		console.error(`Error: ${error.message}`);
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
		console.log('XXX', host, port)
		testHostPortAccessibility(host, port, res);
	},
	executeOnClient: async (req, res) => {
		const { host, port, command } = req.body;
		const password = atob(config.app.imobPass);
		executeCommandOnClient(host.trim(), port, config.app.imobUser, password, command, res);
	}
}
