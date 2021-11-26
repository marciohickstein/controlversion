const router = require('express').Router();
const ExecController = require('../controllers/execController');
const {logRequest} = require('../utils')

router.post("/", logRequest, ExecController.exec);

module.exports = router;