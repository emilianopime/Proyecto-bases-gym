/* ==========================================================================
   Para importar los modulos expres, oracledb, y acceder a los datos de la dba  #NODULOS NODEJS
   ========================================================================== */
const express = require('express'); 
const oracledb = require('oracledb');
const dbConfig = require('./config/dbconfig.js');
const path = require('path');
const app = express();
const port = process.env.port || 3000;
/* ==========================================================================
    Middleware para formularios
   ========================================================================== */
app.use(express.urlencoded({extended: true}));
app.use(express.json());

/* ==========================================================================
rutas para las paginas
========================================================================== */
// Servir archivos estáticos (HTML, CSS, JS, imágenes)
app.use(express.static(path.join(__dirname, '../FRONT')));

// Redirigir la raíz al login
app.get('/', (req, res) => {
  res.redirect('/HTML/login.html');
});

// rutas para login
const loginRoutes = require('./routes/login');
app.use('/api', loginRoutes);



// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor ejecutándose en http://localhost:${port}`);
});