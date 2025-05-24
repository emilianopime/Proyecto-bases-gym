// filepath: c:\\Users\\Emi\\Documents\\GitHub\\Proyecto-bases-gym\\src\\controllers\\clienteController.js
const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Obtener todos los clientes
async function getAllClientes(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.ClienteID, c.PrimerNombre, c.SegundoNombre, c.ApellidoPaterno, c.ApellidoMaterno, c.Telefono, c.Correo,
                    (SELECT m_type.Nombre
                     FROM Membresias m_type
                     JOIN ClientesMembresias cm ON m_type.MembresiaID = cm.MembresiaID
                     WHERE cm.ClienteID = c.ClienteID AND cm.Estado = 'Activa' AND ROWNUM = 1) AS membresiaActual
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
            `SELECT ClienteID, PrimerNombre, SegundoNombre, ApellidoPaterno, ApellidoMaterno, 
                    TO_CHAR(FechaNacimiento, 'YYYY-MM-DD') AS FechaNacimiento, 
                    Telefono, Correo, Genero, 
                    TO_CHAR(FechaRegistro, 'YYYY-MM-DD') AS FechaRegistro
             FROM Clientes 
             WHERE ClienteID = :id`,
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
            correo: dbRow[7], // Corresponds to Correo
            genero: dbRow[8],
            fechaRegistro: dbRow[9] // Corresponds to FechaRegistro
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
    const { primerNombre, segundoNombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, telefono, correo, genero } = req.body;

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
        correo, // Maps to Correo column
        genero,
        out_id_cliente: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: true });
        
        if (result.outBinds && result.outBinds.out_id_cliente) {
            res.status(201).json({ 
                message: 'Cliente creado con éxito', 
                clienteId: result.outBinds.out_id_cliente[0] 
            });
        } else {
            throw new Error('No se pudo obtener el ID del cliente creado.');
        }
    } catch (err) {
        console.error('Error al crear cliente:', err);
        res.status(500).json({ message: 'Error del servidor al crear el cliente: ' + err.message });
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

// Actualizar un cliente existente
async function updateCliente(req, res) {
    let connection;
    const { id } = req.params;
    const { primerNombre, segundoNombre, apellidoPaterno, apellidoMaterno, fechaNacimiento, telefono, correo, genero } = req.body;

    if (!primerNombre || !apellidoPaterno || !fechaNacimiento || !telefono || !correo || !genero) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para la actualización.' });
    }

    const sql = `UPDATE Clientes SET
                    PrimerNombre = :primerNombre,
                    SegundoNombre = :segundoNombre,
                    ApellidoPaterno = :apellidoPaterno,
                    ApellidoMaterno = :apellidoMaterno,
                    FechaNacimiento = TO_DATE(:fechaNacimiento, 'YYYY-MM-DD'),
                    Telefono = :telefono,
                    Correo = :correo,
                    Genero = :genero
                 WHERE ClienteID = :id`;
    const binds = {
        primerNombre,
        segundoNombre: segundoNombre || null,
        apellidoPaterno,
        apellidoMaterno: apellidoMaterno || null,
        fechaNacimiento,
        telefono,
        correo, // Maps to Correo column
        genero,
        id
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado para actualizar o datos sin cambios.' });
        }
        res.json({ message: 'Cliente actualizado con éxito', clienteId: id });
    } catch (err) {
        console.error(`Error al actualizar cliente ${id}:`, err); // Corrected template literal
        res.status(500).json({ message: 'Error del servidor al actualizar el cliente: ' + err.message });
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

// TODO: Implementar deleteCliente si es necesario
// async function deleteCliente(req, res) { ... }

module.exports = {
    getAllClientes,
    getClienteById,
    createCliente,
    updateCliente
    // deleteCliente
};
