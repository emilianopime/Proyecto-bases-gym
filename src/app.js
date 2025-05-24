/* ==========================================================================
   Para importar los modulos expres, oracledb, y acceder a los datos de la dba
   ========================================================================== */

const express = require('express'); 
const oracledb = require('oracledb');
const dbConfig = require('./config/dbconfig');

const app = express();
const port = process.env.port || 3000;


// MiddLeware para parsear datos de formularios y JSON
app.use(express.urlencoded({extended: true}));
app.use(express.json());


app.use(express.static('FRONT'))


// Iniciar servidor
 app.listen(PORT, () => {
 console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
 });