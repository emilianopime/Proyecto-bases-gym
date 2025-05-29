const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');
const bcrypt = require('bcrypt'); // Importar bcrypt para hash

exports.login = async (req, res) => {
  let connection;
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Usuario y contraseña son requeridos." });
  }

  try {
    connection = await oracledb.getConnection(dbConfig);
    const result = await connection.execute(
      `SELECT UsuarioID, Username, PasswordHash, Rol 
       FROM UsuariosSistema 
       WHERE Username = :u AND Activo = 1`, // Verificar también que el usuario esté activo
      [username]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const userId = user[0];
      const storedUsername = user[1];
      const passwordHash = user[2];
      const userRole = user[3];

      // Comparar la contraseña proporcionada con el hash almacenado
      const match = await bcrypt.compare(password, passwordHash);

      if (match) {
        res.json({ 
          userId: userId, 
          username: storedUsername, 
          role: userRole, 
          message: "Login exitoso" 
        });
      } else {
        res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      }
    } else {
      res.status(401).json({ message: "Usuario o contraseña incorrectos o usuario inactivo" });
    }
  } catch (err) {
    console.error("Error en el proceso de login:", err);
    res.status(500).json({ message: "Error del servidor: " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error("Error al cerrar la conexión:", closeErr);
      }
    }
  }
};

exports.registerUsuario = async (req, res) => {
  let connection;
  const { nombreCompleto, username, password, rol, correo } = req.body;

  if (!nombreCompleto || !username || !password || !rol) {
    return res.status(400).json({ message: "Nombre completo, username, password y rol son requeridos." });
  }

  try {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    connection = await oracledb.getConnection(dbConfig);
    
    const result = await connection.execute(
      `INSERT INTO UsuariosSistema (NombreCompleto, Username, PasswordHash, Rol, Correo, Activo, FechaCreacion)
       VALUES (:nombreCompleto, :username, :passwordHash, :rol, :correo, 1, SYSDATE)
       RETURNING UsuarioID INTO :out_id`,
      {
        nombreCompleto,
        username,
        passwordHash,
        rol,
        correo: correo || null,
        out_id: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
      },
      { autoCommit: true }
    );

    if (result.outBinds && result.outBinds.out_id) {
      res.status(201).json({ 
        userId: result.outBinds.out_id[0],
        message: "Usuario registrado con éxito" 
      });
    } else {
      throw new Error("No se pudo obtener el ID del usuario registrado.");
    }

  } catch (err) {
    console.error("Error al registrar usuario:", err);
    if (err.errorNum === 1) {
        return res.status(409).json({ message: "Error al registrar usuario: El nombre de usuario o correo ya existe." });
    }
    res.status(500).json({ message: "Error del servidor al registrar el usuario: " + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error("Error al cerrar la conexión:", closeErr);
      }
    }
  }
};