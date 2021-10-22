require('dotenv').config();

const express = require('express');
const { exec } = require("child_process");
const { readdirSync, renameSync, writeFileSync } = require('fs');
const { logRequest, setOKResponse, setErrorResponse } = require('../utils')

const router = express.Router();

// Funcoes utilitarias para esta rota

// Le um diretorio e retorna um array com os arquivos contidos
const readDir = (dir) => {
  const files = readdirSync(dir);
 
  return Array.isArray(files) ? files : null;
}

// Le a pasta onde esta os arquivos de modificacao de base e retorna o proximo numero disponivel
const getNextModbase = () => {

  // Obtem a lista de arquivos de modbase
  const files = readDir(process.env.DIR_MODBASE);

  if (files === null)
    return '';

  // Retorna apenas os arquivos com formato de modbase. Formato: "mod_base_sql.XXXX.proximo"
  const modbases = files.filter((file) => {
    return (/^mod_base_sql\.\d{4}\.proximo$/g.test(file));
  });

  if (!Array.isArray(modbases))
    return '';

  // Percorre a lista pelo proximo modbase mais recente. 
  const modbase = modbases.reduce((modbaseAvailable, modbase) => {

    if (modbaseAvailable === '')
      return modbase;

    const modbaseNum = Number(modbase.split('.')[1]);

    const modbaseNumAvailable = Number(modbaseAvailable.split('.')[1]);

    return (modbaseNum < modbaseNumAvailable) ? modbase : modbaseAvailable;
  }, '');

  return modbase;
}

// Rota para criar modbase com SQL para criar texto de lembrete
router.post("/", logRequest, (req, res) => {
  let response;
  let { data } = req.body;

  // Verifica se parametros da requisicao foram passados
  if (!data) {
    return res.json(setErrorResponse('Faltou informar o texto que deseja ser lembrado'));
  }

  // Tenta criar um modbase com o numero mais recente disponivel
  try {
    const nextModbase = getNextModbase();

    if (!nextModbase){
      return res.json(setErrorResponse(`Não foi possível localizar o próximo modbase em ${process.env.DIR_MODBASE}`));
    }

    // Escrevo no arquivo de modbase o comando para criar lembrete geral
    let text = Buffer.from(data);

    const fullPathNextModbase = `${process.env.DIR_MODBASE}/${nextModbase}`;

    const textoSql = `fnc_cria_lembrete_aviso('${text}', null, null);`;
  
    writeFileSync(fullPathNextModbase, textoSql);
    
    const fullPathNextModbaseDest = `${process.env.DIR_MODBASE}/mod_base_sql.${nextModbase.split('.')[1]}.prd.tst`;
    renameSync(fullPathNextModbase, fullPathNextModbaseDest);

    return res.json(setOKResponse(`Modbase ${fullPathNextModbaseDest} de lembrete criado no srvinet2 com sucesso.\nFavor pedir para algum desenvolvedor efetuar o copia base!`));
  } catch (error) {
    return res.json(setErrorResponse(error.message));
  }
})

module.exports.routerWarn = router;
