// filepath: c:\\Users\\Emi\\Documents\\GitHub\\Proyecto-bases-gym\\src\\routes\\membresiaRoutes.js
const express = require('express');
const router = express.Router();
const membresiaController = require('../controllers/membresiaController');

// Rutas para Tipos de Membresías
router.get('/membresias', membresiaController.getAllMembresias);
router.post('/membresias', membresiaController.createMembresia);
router.get('/membresias/:id', membresiaController.getMembresiaById);
router.put('/membresias/:id', membresiaController.updateMembresia);
router.delete('/membresias/:id', membresiaController.deleteMembresia);

module.exports = router;
