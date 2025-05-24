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
      res.json({ userId: result.rows[0][0], message: "Login exitoso" });
    } else {
      res.status(401).json({ message: "Usuario o contraseña incorrectos" });
    }  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error del servidor: " + err.message });
  } finally {
    if (connection) await connection.close();
  }
};