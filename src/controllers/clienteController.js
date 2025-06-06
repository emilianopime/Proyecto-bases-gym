// filepath: c:\\Users\\Emi\\Documents\\GitHub\\Proyecto-bases-gym\\src\\controllers\\clienteController.js
const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Función auxiliar para obtener el estado de una membresía considerando la fecha actual
function getEstadoRealMembresia(estado, fechaFin) {
    const ahora = new Date();
    const fechaFinDate = new Date(fechaFin);
    
    // Vencida
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
                correo: row[6],
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
            currentMembresiaID: dbRow[10]
        });
    } catch (err) {
        console.error(`Error al obtener cliente ${id}:`, err);
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
                    await asignarMembresiaACliente(connection, clienteId, membresia, null, null);
                    await connection.commit();
                    res.status(201).json({
                        message: 'Cliente creado con éxito y membresía inicial asignada',
                        clienteId: clienteId
                    });
                } catch (membresiaError) {
                    await connection.rollback();
                    console.error('Cliente creado pero error al asignar membresía inicial:', membresiaError);
                    res.status(500).json({ message: 'Cliente creado, pero falló la asignación de membresía: ' + membresiaError.message, clienteId: clienteId, partialSuccess: true });
                }
            } else {
                await connection.commit();
                res.status(201).json({
                    message: 'Cliente creado con éxito',
                    clienteId: clienteId
                });
            }
        } else {
            await connection.rollback();
            throw new Error('No se pudo obtener el ID del cliente creado.');
        }
    } catch (err) {
        if (connection && !err.partialSuccess) {
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
        await connection.execute(sqlUpdateCliente, bindsCliente, { autoCommit: false });

        let membershipMessage = '';
        if (membresiaId && membresiaId !== '' && membresiaId !== null && membresiaId !== undefined) {
            try {
                await asignarMembresiaACliente(connection, id, membresiaId, metodoPago, notas);
                membershipMessage = ' y membresía actualizada';
            } catch (membresiaError) {
                await connection.rollback();
                console.error(`Error al asignar membresía durante la actualización del cliente ${id}:`, membresiaError);
                return res.status(500).json({ message: 'Error al actualizar la membresía del cliente: ' + membresiaError.message });
            }
        }

        await connection.commit();
        res.json({ message: `Cliente actualizado con éxito${membershipMessage}`, clienteId: id });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error al hacer rollback en updateCliente:', rollbackErr);
            }
        }
        console.error(`Error al actualizar cliente ${id}:`, err);
        if (err.errorNum === 0 && err.offset === 0 && result && result.rowsAffected === 0) {
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
        await connection.execute(
            `DELETE FROM ClientesMembresias WHERE ClienteID = :id`,
            [id],
            { autoCommit: false }
        );

        const asistenciasResult = await connection.execute(
            `SELECT COUNT(*) AS count FROM AsistenciaClases WHERE ClienteID = :id`,
            [id]
        );
        if (asistenciasResult.rows[0][0] > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'No se puede eliminar el cliente porque tiene registros de asistencia a clases. Considere anonimizar o archivar estos registros si es necesario.' });
        }

        const notasResult = await connection.execute(
            `SELECT COUNT(*) AS count FROM NotasClientes WHERE ClienteID = :id`,
            [id]
        );
        if (notasResult.rows[0][0] > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'No se puede eliminar el cliente porque tiene notas asociadas. Por favor, elimine primero las notas o manéjelas según la política de la empresa.' });
        }

        const result = await connection.execute(
            `DELETE FROM Clientes WHERE ClienteID = :id`,
            [id],
            { autoCommit: false } 
        );

        if (result.rowsAffected === 0) {
            await connection.rollback(); 
            return res.status(404).json({ message: 'Cliente no encontrado para eliminar.' });
        }

        await connection.commit(); 
        res.json({ message: 'Cliente y sus membresías asociadas eliminados con éxito', clienteId: id });

    } catch (err) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackErr) {
                console.error('Error al hacer rollback en deleteCliente:', rollbackErr);
            }
        }
        console.error(`Error al eliminar cliente ${id}:`, err);
        // Manejo de errores de OracleDB
        if (err.errorNum && err.errorNum === 2292) {
             return res.status(409).json({ message: 'Error de integridad: No se puede eliminar el cliente porque tiene registros relacionados en otras tablas que no fueron detectados por las verificaciones previas. Revise las membresías, asistencias o notas.' });
        }
        res.status(500).json({ message: 'Error del servidor al eliminar el cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión en deleteCliente:', err);
            }
        }
    }
}

// Nueva función para eliminar una membresía específica de un cliente
async function deleteClienteMembresia(req, res) {
    let connection;
    const { clienteId, clienteMembresiaId } = req.params;

    if (!clienteId || !clienteMembresiaId) {
        return res.status(400).json({ message: 'Los IDs de cliente y membresía del cliente son obligatorios.' });
    }

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `DELETE FROM ClientesMembresias 
             WHERE ClienteID = :clienteId AND ClienteMembresiaID = :clienteMembresiaId`,
            {
                clienteId: parseInt(clienteId),
                clienteMembresiaId: parseInt(clienteMembresiaId)
            },
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Membresía del cliente no encontrada o ya eliminada.' });
        }

        res.json({ message: 'Membresía del cliente eliminada con éxito', clienteId, clienteMembresiaId });

    } catch (err) {
        console.error(`Error al eliminar membresía ${clienteMembresiaId} del cliente ${clienteId}:`, err);
        res.status(500).json({ message: 'Error del servidor al eliminar la membresía del cliente: ' + err.message });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error al cerrar conexión en deleteClienteMembresia:', err);
            }
        }
    }
}

// Función auxiliar para asignar una membresía a un cliente
async function asignarMembresiaACliente(connection, clienteId, membresiaId, tipoPagoId, notas) {
    const deleteSql = `
        DELETE FROM ClientesMembresias
        WHERE ClienteID = :clienteId
          AND Estado IN ('Activa', 'Pendiente')`;
    await connection.execute(deleteSql, { clienteId });

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

    const sqlMembresia = `INSERT INTO ClientesMembresias
                         (ClienteID, MembresiaID, FechaInicio, FechaFin, Estado, MontoPagado, FechaPago, TipoPagoID, Notas)
                         VALUES (:clienteId, :membresiaId, :fechaInicio, :fechaFin, 'Activa', :precio, SYSDATE, :tipoPagoId, :notas)`;

    await connection.execute(sqlMembresia, {
        clienteId: clienteId,
        membresiaId: membresiaId,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
        precio: precio,
        tipoPagoId: tipoPagoId || null, 
        notas: notas || null    
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

// Asignar membresía a un cliente existente
async function asignarMembresia(req, res) {
    let connection;
    const { clienteId } = req.params;
    const { membresiaId, metodoPago, notas } = req.body;

    if (!membresiaId) {
        return res.status(400).json({ message: 'El ID de la membresía es obligatorio.' });
    }

    try {
        connection = await oracledb.getConnection(dbConfig);
        const checkExistingSql = `
            SELECT COUNT(*) AS count
            FROM ClientesMembresias
            WHERE ClienteID = :clienteId
              AND Estado IN ('Activa', 'Pendiente')`;
        const checkResult = await connection.execute(checkExistingSql, { clienteId }, { autoCommit: false }); 

        if (checkResult.rows[0] && checkResult.rows[0][0] > 0) {
            return res.status(409).json({ message: 'El cliente ya tiene una membresía activa o pendiente. No se puede asignar una nueva directamente. Para cambiarla, actualice al cliente.' });
        }
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

// Actualizar membresías vencidas
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
    deleteClienteMembresia, 
    getMembresiasDisponibles,
    asignarMembresia,
    getMembresiasCliente,
    actualizarMembresiasVencidas 
};
