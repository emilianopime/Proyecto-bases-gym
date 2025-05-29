const oracledb = require('oracledb');
const bcrypt = require('bcrypt');
const dbConfig = require('./src/config/dbconfig.js');

async function crearOActualizarUsuarioAdmin() {
    let connection;
    const usernameAdmin = 'admin';
    const passwordAdmin = '12345';

    try {
        const passwordHash = await bcrypt.hash(passwordAdmin, 10);
        console.log(`Hash generado para "${passwordAdmin}": ${passwordHash}`);

        connection = await oracledb.getConnection(dbConfig);
        console.log('Conectado a la base de datos');

        // Verificar si el usuario ya existe
        const resultSelect = await connection.execute(
            `SELECT UsuarioID FROM UsuariosSistema WHERE Username = :username`,
            [usernameAdmin]
        );

        if (resultSelect.rows.length > 0) {
            // El usuario existe, actualizar PasswordHash
            console.log(`El usuario "${usernameAdmin}" ya existe. Actualizando PasswordHash.`);
            const resultUpdate = await connection.execute(
                `UPDATE UsuariosSistema 
                 SET PasswordHash = :passwordHash, NombreCompleto = 'Administrador del Sistema', Rol = 'Administrador', Correo = 'admin@gym.com', Activo = 1
                 WHERE Username = :username`,
                {
                    passwordHash: passwordHash,
                    username: usernameAdmin
                },
                { autoCommit: true }
            );
            console.log('PasswordHash del usuario admin actualizado exitosamente.');
        } else {
            // El usuario no existe, insertar nuevo usuario
            console.log(`El usuario "${usernameAdmin}" no existe. Creando nuevo usuario.`);
            const resultInsert = await connection.execute(
                `INSERT INTO UsuariosSistema (NombreCompleto, Username, PasswordHash, Rol, Correo, Activo) 
                 VALUES (:nombreCompleto, :username, :passwordHash, :rol, :correo, :activo)`,
                {
                    nombreCompleto: 'Administrador del Sistema',
                    username: usernameAdmin,
                    passwordHash: passwordHash,
                    rol: 'Administrador',
                    correo: 'admin@gym.com',
                    activo: 1
                },
                { autoCommit: true }
            );
            console.log('Usuario admin insertado exitosamente.');
        }
        
        console.log('Usuario: admin');
        console.log('Contraseña (debería ser): 12345');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Conexión cerrada');
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

crearOActualizarUsuarioAdmin();
