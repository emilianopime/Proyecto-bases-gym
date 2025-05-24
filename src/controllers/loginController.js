const oracledb = require('oracledb');
const dbconfig = require('../config/dbconfig.js');

  exports.login = async (req, res) =>{
    let connection;
    try{
        connection = await oracledb.getConnection(dbconfig);
        const result = await connection.execute(
            `SELECT * FROM usuarios WHERE username = :u AND password = :p`,
            [req.body.username, req.body.password]

        );

        if (result.rows.lenght > 0){
            res.redirect('/home.html');
        }else{
            res.redirect('/login.html');
        }
    }catch (err){
        console.error(err);
        res.sed("Error del servidor");
    }finally {
        if (connection) await connection.close();
    }
};