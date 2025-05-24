const express = require('express');
const router = express.Router();
const loginController = requiere('../controllers/loginController');

router.post('/login', loginController);

module.exports = router;