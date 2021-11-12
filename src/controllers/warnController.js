const { execSync } = require("child_process");

const { unlinkSync, writeFileSync } = require('fs');
const { getNextModbase, setOKResponse, setErrorResponse } = require('../utils')

module.exports = {
	create: (req, res) => {
		let { texto, dateIni, dateEnd } = req.body.data;
	  
		// Verifica se parametros da requisicao foram passados
		if (!texto) {
		  return res.json(setErrorResponse('Faltou informar o texto que deseja ser lembrado'));
		}
	  
		try {
		  new Date(dateIni)
		} catch (error) {
		  return res.json(setErrorResponse(`Campo de data inicial invalida. Erro: ${error}`));
		}
	  
		try {
		  new Date(dateEnd)
		} catch (error) {
		  return res.json(setErrorResponse(`Campo de data final invalida. Erro: ${error}`));
		}
	  
		// Tenta criar um modbase com o numero mais recente disponivel
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
	  
		  const fullPathNextModbaseDest = `${process.env.DIR_MODBASE}/mod_base_sql.${nextModbase.split('.')[1]}.prd.tst`;
		  execSync(`iconv ${fullPathNextModbase} -futf8 -tiso88591 > ${fullPathNextModbaseDest}`);
		  unlinkSync(fullPathNextModbase);
	  
		  return res.json(setOKResponse(
			`Modbase ${fullPathNextModbaseDest} de lembrete criado no srvinet2 com sucesso.\nFavor pedir para algum desenvolvedor efetuar o copia base!`));
		} catch (error) {
		  return res.json(setErrorResponse(error.message));
		}
	  }
}