require('dotenv').config();

module.exports = {
	app: {
		port: process.env.PORT || 8001,
		secretKey: process.env.SECRET_KEY,
		dirModbase: process.env.DIR_MODBASE,
		dirLog: process.env.DIR_LOG
	}
}