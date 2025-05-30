// ==========================================================================
// Para importar los modulos expres, oracledb, y acceder a los datos de la dba  #NODULOS NODEJS
// ==========================================================================
const express = require('express');
const oracledb = require('oracledb');
const dbConfig = require('./config/dbconfig.js');
const path = require('path');
const app = express();
const port = process.env.port || 3000;
// ==========================================================================
// Middleware para formularios
// ==========================================================================
app.use(express.urlencoded({extended: true}));
app.use(express.json());

// ==========================================================================
// rutas para las paginas
// ==========================================================================
// Servir archivos estáticos (HTML, CSS, JS, imágenes)
const frontPath = path.resolve(__dirname, '../FRONT');
console.log('Sirviendo archivos estáticos desde:', frontPath);
app.use(express.static(frontPath));

// Redirigir la raíz al login
app.get('/', (req, res) => {
  res.redirect('/HTML/login.html');
});

// rutas para login
const loginRoutes = require('./routes/login');
app.use('/api', loginRoutes);

// rutas para clientes
const clienteRoutes = require('./routes/clienteRoutes'); // Asegúrate que el nombre del archivo sea correcto
app.use('/api', clienteRoutes); // Todas las rutas de clientes estarán bajo /api

// rutas para membresías
const membresiaRoutes = require('./routes/membresiaRoutes');
app.use('/api', membresiaRoutes); // Todas las rutas de membresías estarán bajo /api

// rutas para entrenadores
const entrenadorRoutes = require('./routes/entrenadorRoutes');
app.use('/api', entrenadorRoutes); // Todas las rutas de entrenadores estarán bajo /api

// rutas para clases
const clasesRoutes = require('./routes/clasesRoutes');
app.use('/api', clasesRoutes); // Todas las rutas de clases estarán bajo /api

// rutas para asistencias
const asistenciaRoutes = require('./routes/asistenciaRoutes');
app.use('/api/asistencias', asistenciaRoutes); // Todas las rutas de asistencias estarán bajo /api/asistencias

// rutas para pagos
const pagosRoutes = require('./routes/pagosRoutes');
app.use('/api/pagos', pagosRoutes); // Todas las rutas de pagos estarán bajo /api/pagos

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});