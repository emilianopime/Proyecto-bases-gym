/* ==========================================================================
   Para importar los modulos expres, oracledb, y acceder a los datos de la dba
   ========================================================================== */
const express = require('express'); 
const oracledb = require('oracledb');
const dbConfig = require('./config/dbconfig.js');
const path = require('path');
const app = express();
const port = process.env.port || 3000;
/* ==========================================================================
   rutas para las paginas
   ========================================================================== */
//rutas para login
   const loginRoutes = require('./routes/login');
app.use('/', loginRoutes);
//rutas para -----


// MiddLeware para parsear datos de formularios y JSON
app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.use(express.static(path.join(__dirname, '../FRONT/HTML')))


// Iniciar servidor
 app.listen(port, () => {
 console.log(`Servidor ejecutándose en http://localhost:${port}`);
 });