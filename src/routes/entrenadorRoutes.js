const express = require('express');
const router = express.Router();
const entrenadorController = require('../controllers/entrenadorController');

// Rutas para entrenadores
router.get('/entrenadores', entrenadorController.getAllEntrenadores);
router.get('/entrenadores/:id', entrenadorController.getEntrenadorById);
router.post('/entrenadores', entrenadorController.createEntrenador);
router.put('/entrenadores/:id', entrenadorController.updateEntrenador);
router.delete('/entrenadores/:id', entrenadorController.deleteEntrenador);
router.get('/entrenadores/:id/clases', entrenadorController.getClasesEntrenador);

module.exports = router;
