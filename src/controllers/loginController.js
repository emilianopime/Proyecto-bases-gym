const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

exports.login = async (req, res) => {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT * FROM usuarios_nuevos WHERE username = :u AND password = :p`,
      [req.body.username, req.body.password]
    );

    if (result.rows.length > 0) {
      res.redirect('/home.html');
    } else {
      res.redirect('/login.html');
    }
  } catch (err) {
    console.error(err);
    res.send("Error del servidor");
  } finally {
    if (connection) await connection.close();
  }
};