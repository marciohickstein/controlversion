const router = require('express').Router();
const { logRequest } = require('../utils');
const LogController = require('../controllers/logController');

router.post("/log", logRequest, LogController.insData);
router.get("/log", logRequest, LogController.getData);

module.exports = router;
