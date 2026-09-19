require('dotenv').config();

if (!process.env.SECRET_KEY) {
	throw new Error('SECRET_KEY nao definida: defina-a no .env antes de iniciar a aplicacao.');
}

module.exports = {
	app: {
		version: "1.0",
		port: process.env.PORT || 8001,
		secretKey: process.env.SECRET_KEY,
		dirModbase: process.env.DIR_MODBASE,
		dirLog: process.env.DIR_LOG,
		imobUser: process.env.IMOBUSER,
		imobPass: process.env.IMOBPASS,
	}
}