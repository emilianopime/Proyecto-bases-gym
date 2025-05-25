// filepath: c:\Users\Emi\Documents\GitHub\Proyecto-bases-gym\src\routes\clienteRoutes.js
const express = require('express');
const router = express.Router();
const clienteController = require('../controllers/clienteController');

// Rutas para Clientes
router.get('/clientes', clienteController.getAllClientes);
router.post('/clientes', clienteController.createCliente);
router.get('/clientes/:id', clienteController.getClienteById);
router.put('/clientes/:id', clienteController.updateCliente);
router.delete('/clientes/:id', clienteController.deleteCliente); // Descomentar si se implementa la eliminación

module.exports = router;
