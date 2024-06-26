const router = require('express').Router();
const { logRequest } = require('../utils')
const WarnController = require('../controllers/warnController');

router.post("/warn", logRequest, WarnController.create);
router.post("/connect", logRequest, WarnController.connect);
router.post("/execute", logRequest, WarnController.executeOnClient);

module.exports = router;
