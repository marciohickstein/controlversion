const router = require('express').Router();
const AuthController = require('../controllers/authController');

const { logRequest } = require('../utils');

router.post('/login', logRequest, AuthController.login);
router.get('/logout', logRequest, AuthController.logout);


module.exports = router;