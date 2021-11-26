const { execSync } = require("child_process");

const { unlinkSync, writeFileSync } = require('fs');
const { getNextModbase, setOKResponse, setErrorResponse } = require('../utils')

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
	create: (req, res) => {
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

			fullPathNextModbaseDest = `${process.env.DIR_MODBASE}/mod_base_sql.${nextModbase.split('.')[1]}.prd.tst`;
			execSync(`iconv ${fullPathNextModbase} -futf8 -tiso88591 > ${fullPathNextModbaseDest}`);
			unlinkSync(fullPathNextModbase);
		} catch (error) {
			return res.json(setErrorResponse(error.message));
		}

		try {
			execSync(`${process.env.DIR_MODBASE}/copiabase.sh ${fullPathNextModbaseDest}`);
		} catch (error) {
			const messageError = 
				`Modbase ${fullPathNextModbaseDest} de lembrete criado no srvinet2 com sucesso, `+
				`mas não foi possível publicar o mesmo com o programa copiabase.\n`+
				`Favor pedir para algum desenvolvedor efetuar o copia base!`;
			return res.json(setErrorResponse(messageError));
		} 

		return res.json(setOKResponse('Modbase criado e publicado com sucesso!'));

	}
}