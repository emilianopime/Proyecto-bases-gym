const oracledb = require('oracledb');
const dbConfig = require('./src/config/dbconfig.js');

async function insertOrUpdateTestUser() {
    let connection;

    const testUserDetails = {
        username: 'testuser',
        passwordHash: '$2b$10$U0IzS6MT0FUOdegkYfNiAuBFwqMllPY/3.XipDgWX4UUTJcWgsUES', // Hash para 'temp123'
        nombreCompleto: 'Usuario de Prueba',
        rol: 'Recepcionista',
        correo: 'testuser@gym.com',
        activo: 1
    };

    console.log(`Intentando crear/actualizar usuario: ${testUserDetails.username} con correo: ${testUserDetails.correo}`);

    try {
        connection = await oracledb.getConnection(dbConfig);
        console.log('Conectado a la base de datos.');

        // Verificar si el usuario ya existe por Username
        const userExistsResult = await connection.execute(
            `SELECT UsuarioID, Correo FROM UsuariosSistema WHERE Username = :username`,
            [testUserDetails.username]
        );

        if (userExistsResult.rows.length > 0) {
            // El usuario existe, actualizarlo
            const existingUser = userExistsResult.rows[0];
            console.log(`El usuario "${testUserDetails.username}" ya existe (ID: ${existingUser[0]}). Actualizando sus datos.`);
            
            // Opcional: verificar si el correo que queremos asignar está tomado por OTRO usuario
            if (existingUser[1] !== testUserDetails.correo) {
                const emailTakenResult = await connection.execute(
                    `SELECT UsuarioID FROM UsuariosSistema WHERE Correo = :correo AND Username != :username`,
                    [testUserDetails.correo, testUserDetails.username]
                );
                if (emailTakenResult.rows.length > 0) {
                    console.error(`Error: El correo "${testUserDetails.correo}" ya está en uso por otro usuario (ID: ${emailTakenResult.rows[0][0]}). No se puede actualizar.`);
                    return; // Salir si el correo está tomado por otro
                }
            }

            await connection.execute(
                `UPDATE UsuariosSistema 
                 SET NombreCompleto = :nombreCompleto, 
                     PasswordHash = :passwordHash, 
                     Rol = :rol, 
                     Correo = :correo, 
                     Activo = :activo
                 WHERE Username = :username`,
                testUserDetails,
                { autoCommit: true }
            );
            console.log(`Usuario "${testUserDetails.username}" actualizado exitosamente.`);
        } else {
            // El usuario no existe, verificar si el correo ya está en uso antes de insertar
            console.log(`El usuario "${testUserDetails.username}" no existe. Verificando correo...`);
            const emailExistsResult = await connection.execute(
                `SELECT UsuarioID FROM UsuariosSistema WHERE Correo = :correo`,
                [testUserDetails.correo]
            );

            if (emailExistsResult.rows.length > 0) {
                console.error(`Error: El correo "${testUserDetails.correo}" ya está en uso por el usuario ID: ${emailExistsResult.rows[0][0]}. No se puede insertar "${testUserDetails.username}".`);
                return; // Salir si el correo ya está tomado
            }

            // El correo está disponible, insertar nuevo usuario
            console.log(`Correo "${testUserDetails.correo}" disponible. Creando nuevo usuario "${testUserDetails.username}".`);
            await connection.execute(
                `INSERT INTO UsuariosSistema (NombreCompleto, Username, PasswordHash, Rol, Correo, Activo, FechaCreacion) 
                 VALUES (:nombreCompleto, :username, :passwordHash, :rol, :correo, :activo, SYSDATE)`,
                testUserDetails,
                { autoCommit: true }
            );
            console.log(`Usuario "${testUserDetails.username}" insertado exitosamente.`);
        }

        console.log('----------------------------------------');
        console.log(`Usuario configurado: ${testUserDetails.username}`);
        console.log('Contraseña debería ser: temp123');
        console.log('----------------------------------------');

    } catch (err) {
        console.error('Error durante la operación con la base de datos:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Conexión cerrada.');
            } catch (err) {
                console.error('Error al cerrar la conexión:', err);
            }
        }
    }
}

insertOrUpdateTestUser();

