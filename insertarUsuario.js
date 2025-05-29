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
            // El usuario existe, actualizar PasswordHash y otros campos si es necesario
            console.log(`El usuario "${usernameAdmin}" ya existe. Actualizando datos.`);
            await connection.execute(
                `UPDATE UsuariosSistema 
                 SET PasswordHash = :passwordHash,
                     NombreCompleto = :nombreCompleto,
                     Rol = :rol,
                     Correo = :correo,
                     Activo = :activo
                 WHERE Username = :username`,
                {
                    passwordHash: passwordHash,
                    nombreCompleto: 'Administrador del Sistema', // Puedes ajustar si no quieres actualizar siempre
                    rol: 'Administrador', // Puedes ajustar
                    correo: 'admin@gym.com', // Puedes ajustar
                    activo: 1, // Puedes ajustar
                    username: usernameAdmin
                },
                { autoCommit: true }
            );
            console.log('Datos del usuario admin actualizados exitosamente.');
        } else {
            // El usuario no existe, insertar nuevo usuario
            console.log(`El usuario "${usernameAdmin}" no existe. Creando nuevo usuario.`);
            await connection.execute( // Asegúrate de usar await aquí también si no lo tenías
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
