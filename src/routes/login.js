const express = require('express');
const router = express.Router();
const loginController = require('../controllers/loginController');

router.post('/login', loginController.login);
// Nueva ruta para registrar usuarios (opcional, si decides implementarla)
router.post('/register', loginController.registerUsuario);

module.exports = router;