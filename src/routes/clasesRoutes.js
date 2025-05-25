const express = require('express');
const router = express.Router();
const clasesController = require('../controllers/clasesController');

// Rutas para clases
router.get('/clases', clasesController.getAllClases);
router.get('/clases/entrenadores', clasesController.getEntrenadores);
router.get('/clases/:claseId', clasesController.getClaseById);
router.post('/clases', clasesController.createClase);
router.put('/clases/:claseId', clasesController.updateClase);
router.delete('/clases/:claseId', clasesController.deleteClase);

module.exports = router;
