const express = require('express');
const router = express.Router();
const asistenciaController = require('../controllers/asistenciaController');

// Rutas para asistencias
router.get('/', asistenciaController.getAllAsistencias);
router.get('/clases-del-dia', asistenciaController.getClasesDelDia);
router.get('/buscar-clientes', asistenciaController.buscarClientes);
router.get('/estadisticas', asistenciaController.getEstadisticasAsistencia);
router.post('/', asistenciaController.registrarAsistencia);
router.put('/:asistenciaId', asistenciaController.actualizarAsistencia);
router.delete('/:asistenciaId', asistenciaController.eliminarAsistencia);

module.exports = router;
