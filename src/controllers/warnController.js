const fs = require('fs');
const { Socket } = require('net');
const { basename } = require('path');
const { execSync } = require("child_process");
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile);

const { unlinkSync, writeFileSync } = require('fs');
const { getNextModbase, setOKResponse, setErrorResponse } = require('../utils')

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

			await execScript(`/home/svn/repositorio.sh`, [ `unlock` ]);
			await execScript(`./copiabase.sh`, [ basename(`${fullPathNextModbaseDest}`) ]);
			await execScript(`/home/svn/repositorio.sh`, [ `lock` ]);
			
			process.chdir(currentDir);
		} catch (error) {
			const messageError = 
				`Modbase ${fullPathNextModbaseDest} de lembrete criado no srvinet2 com sucesso, `+
				`mas não foi possível publicar o mesmo com o programa copiabase.\n`+
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
	}
}
