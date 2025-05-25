const express = require('express');
const router = express.Router();
const pagosController = require('../controllers/pagosController');

// Rutas para pagos
router.get('/', pagosController.getAllPagos);
router.get('/cliente/:clienteId', pagosController.getPagosByCliente);
router.get('/tipos-pago', pagosController.getTiposPago);
router.get('/estadisticas', pagosController.getEstadisticasPagos);
router.get('/buscar-clientes', pagosController.buscarClientes);
router.get('/membresias-disponibles', pagosController.getMembresiasDisponibles);
router.post('/', pagosController.registrarPago);
router.put('/:clienteMembresiaId', pagosController.actualizarPago);

module.exports = router;
