// filepath: c:\\Users\\Emi\\Documents\\GitHub\\Proyecto-bases-gym\\src\\controllers\\clienteController.js
const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Función auxiliar para obtener el estado real de una membresía considerando la fecha actual
function getEstadoRealMembresia(estado, fechaFin) {
    const ahora = new Date();
    const fechaFinDate = new Date(fechaFin);
    
    // Si está marcada como activa pero ya venció, devolver 'Vencida'
    if (estado === 'Activa' && fechaFinDate < ahora) {
        return 'Vencida';
    }
    
    return estado;
}

// Obtener todos los clientes
async function getAllClientes(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.ClienteID, c.PrimerNombre, c.SegundoNombre, c.ApellidoPaterno, c.ApellidoMaterno, c.Telefono, c.Correo,
                    (SELECT m_type.Nombre
                     FROM Membresias m_type
                     WHERE m_type.MembresiaID = (
                         SELECT latest_cm.MembresiaID
                         FROM (
                             SELECT cm_inner.MembresiaID
                             FROM ClientesMembresias cm_inner
                             WHERE cm_inner.ClienteID = c.ClienteID
                               AND cm_inner.Estado IN ('Activa', 'Pendiente')
                               AND cm_inner.FechaFin >= SYSDATE
                             ORDER BY cm_inner.FechaInicio DESC
                         ) latest_cm
                         WHERE ROWNUM = 1
                     )) AS membresiaActual
             FROM Clientes c
             ORDER BY c.ApellidoPaterno, c.PrimerNombre`
        );
        res.json(result.rows.map(row => {
            return {
                clienteID: row[0],
                primerNombre: row[1],
                segundoNombre: row[2],
                apellidoPaterno: row[3],
                apellidoMaterno: row[4],
                telefono: row[5],
                correo: row[6], // Corresponds to c.Correo
                membresiaActual: row[7] || 'N/A'
            };
        }));
    } catch (err) {
        console.error('Error al obtener clientes:', err);
        res.status(500).json({ message: 'Error del servidor al obtener clientes: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

// Obtener un cliente por ID
async function getClienteById(req, res) {
    let connection;
    const { id } = req.params;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.ClienteID, c.PrimerNombre, c.SegundoNombre, c.ApellidoPaterno, c.ApellidoMaterno,
                    TO_CHAR(c.FechaNacimiento, 'YYYY-MM-DD') AS FechaNacimiento,
                    c.Telefono, c.Correo, c.Genero,
                    TO_CHAR(c.FechaRegistro, 'YYYY-MM-DD') AS FechaRegistro,
                    (SELECT cm.MembresiaID
                     FROM (
                         SELECT cm_inner.MembresiaID,
                                ROW_NUMBER() OVER (ORDER BY cm_inner.FechaInicio DESC) as rn
                         FROM ClientesMembresias cm_inner
                         WHERE cm_inner.ClienteID = c.ClienteID
                           AND cm_inner.Estado IN ('Activa', 'Pendiente')
                     ) cm
                     WHERE cm.rn = 1
                    ) AS currentMembresiaID
             FROM Clientes c
             WHERE c.ClienteID = :id`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        const dbRow = result.rows[0];
        res.json({
            clienteID: dbRow[0],
            primerNombre: dbRow[1],
            segundoNombre: dbRow[2],
            apellidoPaterno: dbRow[3],
            apellidoMaterno: dbRow[4],
            fechaNacimiento: dbRow[5],
            telefono: dbRow[6],
            correo: dbRow[7],
            genero: dbRow[8],
            fechaRegistro: dbRow[9],
            currentMembresiaID: dbRow[10] // Added currentMembresiaID
        });
    } catch (err) {
        console.error(`Error al obtener cliente ${id}:`, err); // Corrected template literal
        res.status(500).json({ message: 'Error del servidor al obtener el cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

// Crear un nuevo cliente
async function createCliente(req, res) {
    let connection;
    const { primerNombre, segundoNombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, telefono, correo, genero, membresia } = req.body;

    if (!primerNombre || !apellidoPaterno || !fechaNacimiento || !telefono || !correo || !genero) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    // FechaRegistro se maneja con DEFAULT SYSDATE en la tabla Clientes
    const sql = `INSERT INTO Clientes (PrimerNombre, SegundoNombre, ApellidoPaterno, ApellidoMaterno, FechaNacimiento, Telefono, Correo, Genero)
                 VALUES (:primerNombre, :segundoNombre, :apellidoPaterno, :apellidoMaterno, TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'), :telefono, :correo, :genero)
                 RETURNING ClienteID INTO :out_id_cliente`;
    const binds = {
        primerNombre,
        segundoNombre: segundoNombre || null,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno || null,
        fechaNacimiento,
        telefono,
        correo,
        genero,
        out_id_cliente: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: false });
        
        if (result.outBinds && result.outBinds.out_id_cliente) {
            const clienteId = result.outBinds.out_id_cliente[0];

            if (membresia && membresia !== '') {
                try {
                    // For initial assignment during client creation, TipoPagoID and Notas might be null
                    await asignarMembresiaACliente(connection, clienteId, membresia, null, null);
                    await connection.commit();
                    res.status(201).json({
                        message: 'Cliente creado con éxito y membresía inicial asignada',
                        clienteId: clienteId
                    });
                } catch (membresiaError) {
                    await connection.rollback(); // Rollback if membership assignment fails
                    console.error('Cliente creado pero error al asignar membresía inicial:', membresiaError);
                    // Send a specific error or a generic one, but indicate client was created then failed
                    res.status(500).json({ message: 'Cliente creado, pero falló la asignación de membresía: ' + membresiaError.message, clienteId: clienteId, partialSuccess: true });
                }
            } else {
                await connection.commit(); // Commit if no membership to assign
                res.status(201).json({
                    message: 'Cliente creado con éxito',
                    clienteId: clienteId
                });
            }
        } else {
            await connection.rollback(); // Rollback if client ID not returned
            throw new Error('No se pudo obtener el ID del cliente creado.');
        }
    } catch (err) {
        if (connection && !err.partialSuccess) { // Avoid double rollback if already handled
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error al hacer rollback en createCliente:', rollbackErr);
            }
        }
        console.error('Error al crear cliente:', err);
        res.status(500).json({ message: 'Error del servidor al crear el cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión en createCliente:', err);
            }
        }
    }
}

// Actualizar un cliente existente
async function updateCliente(req, res) {
    let connection;
    const { id } = req.params;
    // Include membresiaId, metodoPago, and notas from req.body
    // Correctly alias req.body.membresia to membresiaId
    const { primerNombre, segundoNombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, telefono, correo, genero, membresia: membresiaId, metodoPago, notas } = req.body;

    if (!primerNombre || !apellidoPaterno || !fechaNacimiento || !telefono || !correo || !genero) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para la actualización.' });
    }

    const sqlUpdateCliente = `UPDATE Clientes SET
                    PrimerNombre = :primerNombre,
                    SegundoNombre = :segundoNombre,
                    ApellidoPaterno = :apellidoPaterno,
                    ApellidoMaterno = :apellidoMaterno,
                    FechaNacimiento = TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'),
                    Telefono = :telefono,
                    Correo = :correo,
                    Genero = :genero
                 WHERE ClienteID = :id`;
    const bindsCliente = {
        primerNombre,
        segundoNombre: segundoNombre || null,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno || null,
        fechaNacimiento,
        telefono,
        correo,
        genero,
        id
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        // Start transaction
        await connection.execute(sqlUpdateCliente, bindsCliente, { autoCommit: false });

        let membershipMessage = '';
        // If membresiaId is provided, attempt to assign/update it
        if (membresiaId && membresiaId !== '' && membresiaId !== null && membresiaId !== undefined) {
            try {
                // It's important that asignarMembresiaACliente uses the same connection
                // and does not commit or rollback itself if called as part of a larger transaction.
                // The current implementation of asignarMembresiaACliente seems to be standalone
                // and does not accept an option to skip commit, which is fine if it's the last step
                // or if we manage the transaction entirely here.
                // For ahora, we assume asignarMembresiaACliente will correctly handle its part.
                await asignarMembresiaACliente(connection, id, membresiaId, metodoPago, notas);
                membershipMessage = ' y membresía actualizada';
            } catch (membresiaError) {
                await connection.rollback(); // Rollback if membership assignment fails
                console.error(`Error al asignar membresía durante la actualización del cliente ${id}:`, membresiaError);
                return res.status(500).json({ message: 'Error al actualizar la membresía del cliente: ' + membresiaError.message });
            }
        }

        await connection.commit(); // Commit all changes (client details and potentially membership)
        res.json({ message: `Cliente actualizado con éxito${membershipMessage}`, clienteId: id });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback(); // Rollback on any other error
            } catch (rollbackErr) {
                console.error('Error al hacer rollback en updateCliente:', rollbackErr);
            }
        }
        console.error(`Error al actualizar cliente ${id}:`, err);
        // Check if the error is because the client was not found by the initial update
        if (err.errorNum === 0 && err.offset === 0 && result && result.rowsAffected === 0) { // Heuristic for no rows affected
             return res.status(404).json({ message: 'Cliente no encontrado para actualizar.'});
        }
        res.status(500).json({ message: 'Error del servidor al actualizar el cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión en updateCliente:', err);
            }
        }
    }
}

// Eliminar un cliente
async function deleteCliente(req, res) {
    let connection;
    const { id } = req.params;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `DELETE FROM Clientes WHERE ClienteID = :id`,
            [id],
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado para eliminar.' });
        }
        res.json({ message: 'Cliente eliminado con éxito', clienteId: id });
    } catch (err) {
        console.error(`Error al eliminar cliente ${id}:`, err);
        // Considerar manejo de errores de FK aquí si es necesario
        res.status(500).json({ message: 'Error del servidor al eliminar el cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

// Función auxiliar para asignar una membresía a un cliente (MODIFIED)
async function asignarMembresiaACliente(connection, clienteId, membresiaId, tipoPagoId, notas) {
    // Step 1: Delete existing active/pending memberships for this client
    // Instead of updating to 'Reemplazada' (which violates check constraint), 
    // we delete the existing records as suggested
    const deleteSql = `
        DELETE FROM ClientesMembresias
        WHERE ClienteID = :clienteId
          AND Estado IN ('Activa', 'Pendiente')`;
    await connection.execute(deleteSql, { clienteId });

    // Step 2: Fetch details of the new membership to be assigned
    const membresiaResult = await connection.execute(
        'SELECT Precio, DuracionDias FROM Membresias WHERE MembresiaID = :id',
        [membresiaId]
    );

    if (membresiaResult.rows.length === 0) {
        throw new Error('Membresía no encontrada para asignar.');
    }

    const precio = membresiaResult.rows[0][0];
    const duracionDias = membresiaResult.rows[0][1];

    const fechaInicio = new Date();
    const fechaFin = new Date();
    fechaFin.setDate(fechaInicio.getDate() + duracionDias);

    // Step 3: Insert the new membership as 'Activa'
    // Ensure TipoPagoID and Notas are included.
    const sqlMembresia = `INSERT INTO ClientesMembresias
                         (ClienteID, MembresiaID, FechaInicio, FechaFin, Estado, MontoPagado, FechaPago, TipoPagoID, Notas)
                         VALUES (:clienteId, :membresiaId, :fechaInicio, :fechaFin, 'Activa', :precio, SYSDATE, :tipoPagoId, :notas)`;

    await connection.execute(sqlMembresia, {
        clienteId: clienteId,
        membresiaId: membresiaId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        precio: precio,
        tipoPagoId: tipoPagoId || null, // Handle if tipoPagoId is undefined/null
        notas: notas || null           // Handle if notas is undefined/null
    });
}

// Obtener todas las membresías disponibles para selección
async function getMembresiasDisponibles(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT MembresiaID, Nombre, Precio, DuracionDias
             FROM Membresias
             ORDER BY Nombre`
        );
        res.json(result.rows.map(row => ({
            membresiaID: row[0],
            nombre: row[1],
            precio: row[2],
            duracionDias: row[3]
        })));
    } catch (err) {
        console.error('Error al obtener membresías disponibles:', err);
        res.status(500).json({ message: 'Error del servidor al obtener membresías: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

// Asignar membresía a un cliente existente (MODIFIED to pass all params and check for existing active membership)
async function asignarMembresia(req, res) {
    let connection;
    const { clienteId } = req.params;
    const { membresiaId, metodoPago, notas } = req.body; // metodoPago should be TipoPagoID

    if (!membresiaId) {
        return res.status(400).json({ message: 'El ID de la membresía es obligatorio.' });
    }
    // Basic validation for metodoPago if it's expected to be a number (ID)
    // No specific validation for notas, it's optional.

    try {
        connection = await oracledb.getConnection(dbConfig);
        // Ensure transactionality for the check and subsequent assignment
        // The autoCommit is false by default on the connection object from the pool
        // oracledb.autoCommit = false; // This would be a global setting, better to manage per transaction

        // Check if the client already has an active or pending membership
        const checkExistingSql = `
            SELECT COUNT(*) AS count
            FROM ClientesMembresias
            WHERE ClienteID = :clienteId
              AND Estado IN ('Activa', 'Pendiente')`;
        // Execute the check. autoCommit should be false for the transaction to hold.
        const checkResult = await connection.execute(checkExistingSql, { clienteId }, { autoCommit: false }); 

        if (checkResult.rows[0] && checkResult.rows[0][0] > 0) {
            // Client already has an active/pending membership
            // No need to rollback here as we haven't made changes yet, and we are about to close/release the connection.
            // However, if other operations preceded this check within the same transaction, a rollback would be needed.
            return res.status(409).json({ message: 'El cliente ya tiene una membresía activa o pendiente. No se puede asignar una nueva directamente. Para cambiarla, actualice al cliente.' });
        }

        // If no active/pending membership, proceed to assign the new one
        // asignarMembresiaACliente will also use the same connection and participate in the transaction
        await asignarMembresiaACliente(connection, clienteId, membresiaId, metodoPago, notas);

        await connection.commit(); 
        res.json({ message: 'Membresía asignada con éxito al cliente', clienteId: clienteId });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback(); 
            } catch (rollbackErr) {
                console.error('Error al hacer rollback en asignarMembresia:', rollbackErr);
            }
        }
        console.error('Error al asignar membresía al cliente ' + clienteId + ':', err);
        res.status(500).json({ message: 'Error del servidor al asignar membresía: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión en asignarMembresia:', err);
            }
        }
    }
}

// Obtener las membresías de un cliente específico
async function getMembresiasCliente(req, res) {
    let connection;
    const { clienteId } = req.params;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT cm.ClienteMembresiaID, m.Nombre, cm.Estado, 
                    TO_CHAR(cm.FechaInicio, 'YYYY-MM-DD') AS FechaInicio,
                    TO_CHAR(cm.FechaFin, 'YYYY-MM-DD') AS FechaFin,
                    cm.MontoPagado, tp.Nombre AS TipoPago, cm.Notas
             FROM ClientesMembresias cm
             JOIN Membresias m ON cm.MembresiaID = m.MembresiaID
             LEFT JOIN TiposPago tp ON cm.TipoPagoID = tp.TipoPagoID
             WHERE cm.ClienteID = :clienteId
             ORDER BY cm.FechaInicio DESC`,
            [clienteId]
        );
        
        res.json(result.rows.map(row => ({
            clienteMembresiaID: row[0],
            nombreMembresia: row[1],
            estado: row[2],
            fechaInicio: row[3],
            fechaFin: row[4],
            montoPagado: row[5],
            tipoPago: row[6] || 'No especificado',
            notas: row[7]
        })));
    } catch (err) {
        console.error('Error al obtener membresías del cliente ' + clienteId + ':', err);
        res.status(500).json({ message: 'Error del servidor al obtener membresías del cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

// Actualizar membresías vencidas (nuevo endpoint)
async function actualizarMembresiasVencidas(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `UPDATE ClientesMembresias 
             SET Estado = 'Vencida'
             WHERE Estado = 'Activa' 
               AND FechaFin < SYSDATE`,
            {},
            { autoCommit: true }
        );

        console.log(`Membresías actualizadas a vencidas: ${result.rowsAffected}`);
        res.json({ 
            message: 'Actualización de membresías vencidas completada',
            membresiasActualizadas: result.rowsAffected 
        });
    } catch (err) {
        console.error('Error al actualizar membresías vencidas:', err);
        res.status(500).json({ message: 'Error del servidor al actualizar membresías vencidas: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión:', err);
            }
        }
    }
}

module.exports = {
    getAllClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
    getMembresiasDisponibles,
    asignarMembresia,
    getMembresiasCliente,
    actualizarMembresiasVencidas // Nuevo endpoint
};
