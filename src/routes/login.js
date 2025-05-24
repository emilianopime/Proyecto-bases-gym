const expres = require('express');
const router = expres.Router();
const oracledb = require ('../config/dbconfig');

router.post('./login', async (req, res) =>{
    let connection;
    try{
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute
    }
})