// filepath: c:\Users\Emi\Documents\GitHub\Proyecto-bases-gym\src\routes\clienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Rutas para Clientes
router.get('/clientes', clienteController.getAllClientes);
router.post('/clientes', clienteController.createCliente);
router.get('/clientes/:id', clienteController.getClienteById);
router.put('/clientes/:id', clienteController.updateCliente);
router.delete('/clientes/:id', clienteController.deleteCliente);

// Rutas para Membresías de Clientes
router.get('/membresias-disponibles', clienteController.getMembresiasDisponibles);
router.post('/clientes/:clienteId/membresias', clienteController.asignarMembresia);
router.get('/clientes/:clienteId/membresias', clienteController.getMembresiasCliente);
router.post('/actualizar-membresias-vencidas', clienteController.actualizarMembresiasVencidas);

module.exports = router;
