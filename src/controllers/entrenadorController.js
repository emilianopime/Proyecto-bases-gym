const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Obtener todos los entrenadores
async function getAllEntrenadores(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT e.EntrenadorID, e.Nombre, e.Apellido, e.Especialidad, 
                    e.Telefono, e.Correo, 
                    TO_CHAR(e.FechaContratacion, 'YYYY-MM-DD') AS FechaContratacion,
                    e.Activo,
                    COUNT(c.ClaseID) AS NumeroClases
             FROM Entrenadores e
             LEFT JOIN Clases c ON e.EntrenadorID = c.EntrenadorID AND c.Activa = 1
             WHERE e.Activo = 1
             GROUP BY e.EntrenadorID, e.Nombre, e.Apellido, e.Especialidad, 
                      e.Telefono, e.Correo, e.FechaContratacion, e.Activo
             ORDER BY e.Apellido, e.Nombre`
        );
        
        res.json(result.rows.map(row => ({
            entrenadorID: row[0],
            nombre: row[1],
            apellido: row[2],
            especialidad: row[3],
            telefono: row[4],
            correo: row[5],
            fechaContratacion: row[6],
            activo: row[7],
            numeroClases: row[8]
        })));
    } catch (err) {
        console.error('Error al obtener entrenadores:', err);
        res.status(500).json({ message: 'Error del servidor al obtener entrenadores: ' + err.message });
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

// Obtener un entrenador por ID
async function getEntrenadorById(req, res) {
    let connection;
    const { id } = req.params;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT e.EntrenadorID, e.Nombre, e.Apellido, e.Especialidad,
                    e.Telefono, e.Correo,
                    TO_CHAR(e.FechaContratacion, 'YYYY-MM-DD') AS FechaContratacion,
                    e.Activo
             FROM Entrenadores e
             WHERE e.EntrenadorID = :id`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Entrenador no encontrado' });
        }
        
        const dbRow = result.rows[0];
        res.json({
            entrenadorID: dbRow[0],
            nombre: dbRow[1],
            apellido: dbRow[2],
            especialidad: dbRow[3],
            telefono: dbRow[4],
            correo: dbRow[5],
            fechaContratacion: dbRow[6],
            activo: dbRow[7]
        });
    } catch (err) {
        console.error(`Error al obtener entrenador ${id}:`, err);
        res.status(500).json({ message: 'Error del servidor al obtener el entrenador: ' + err.message });
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

// Crear un nuevo entrenador
async function createEntrenador(req, res) {
    let connection;
    const { nombre, apellido, especialidad, telefono, correo } = req.body;

    if (!nombre || !apellido || !especialidad || !telefono || !correo) {
        return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    const sql = `INSERT INTO Entrenadores (Nombre, Apellido, Especialidad, Telefono, Correo)
                 VALUES (:nombre, :apellido, :especialidad, :telefono, :correo)
                 RETURNING EntrenadorID INTO :out_id_entrenador`;
    
    const binds = {
        nombre,
        apellido,
        especialidad,
        telefono,
        correo,
        out_id_entrenador: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: true });
        
        if (result.outBinds && result.outBinds.out_id_entrenador) {
            const entrenadorId = result.outBinds.out_id_entrenador[0];
            res.status(201).json({
                message: 'Entrenador creado con éxito',
                entrenadorId: entrenadorId
            });
        } else {
            throw new Error('No se pudo obtener el ID del entrenador creado.');
        }
    } catch (err) {
        console.error('Error al crear entrenador:', err);
        res.status(500).json({ message: 'Error del servidor al crear el entrenador: ' + err.message });
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

// Actualizar un entrenador existente
async function updateEntrenador(req, res) {
    let connection;
    const { id } = req.params;
    const { nombre, apellido, especialidad, telefono, correo, activo } = req.body;

    if (!nombre || !apellido || !especialidad || !telefono || !correo) {
        return res.status(400).json({ message: 'Faltan campos obligatorios para la actualización.' });
    }

    const sql = `UPDATE Entrenadores SET
                    Nombre = :nombre,
                    Apellido = :apellido,
                    Especialidad = :especialidad,
                    Telefono = :telefono,
                    Correo = :correo,
                    Activo = :activo
                 WHERE EntrenadorID = :id`;
    
    const binds = {
        nombre,
        apellido,
        especialidad,
        telefono,
        correo,
        activo: activo !== undefined ? activo : 1,
        id
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Entrenador no encontrado para actualizar.' });
        }
        
        res.json({ message: 'Entrenador actualizado con éxito', entrenadorId: id });
    } catch (err) {
        console.error(`Error al actualizar entrenador ${id}:`, err);
        res.status(500).json({ message: 'Error del servidor al actualizar el entrenador: ' + err.message });
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

// Eliminar un entrenador (marcar como inactivo)
async function deleteEntrenador(req, res) {
    let connection;
    const { id } = req.params;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `UPDATE Entrenadores SET Activo = 0 WHERE EntrenadorID = :id`,
            [id],
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Entrenador no encontrado para eliminar.' });
        }
        res.json({ message: 'Entrenador desactivado con éxito', entrenadorId: id });
    } catch (err) {
        console.error(`Error al eliminar entrenador ${id}:`, err);
        res.status(500).json({ message: 'Error del servidor al eliminar el entrenador: ' + err.message });
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

// Obtener clases asignadas a un entrenador
async function getClasesEntrenador(req, res) {
    let connection;
    const { entrenadorId } = req.params;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.ClaseID, c.Nombre, c.Descripcion, c.DiaSemana, 
                    c.HoraInicio, c.DuracionMinutos, c.CapacidadMaxima, 
                    c.NivelDificultad, c.Activa
             FROM Clases c
             WHERE c.EntrenadorID = :entrenadorId
             ORDER BY 
                CASE c.DiaSemana 
                    WHEN 'Lunes' THEN 1 
                    WHEN 'Martes' THEN 2
                    WHEN 'Miércoles' THEN 3
                    WHEN 'Jueves' THEN 4
                    WHEN 'Viernes' THEN 5
                    WHEN 'Sábado' THEN 6
                    WHEN 'Domingo' THEN 7
                    ELSE 8
                END, c.HoraInicio`,
            [entrenadorId]
        );
        
        res.json(result.rows.map(row => ({
            claseID: row[0],
            nombre: row[1],
            descripcion: row[2],
            diaSemana: row[3],
            horaInicio: row[4],
            duracionMinutos: row[5],
            capacidadMaxima: row[6],
            nivelDificultad: row[7],
            activa: row[8]
        })));
    } catch (err) {
        console.error('Error al obtener clases del entrenador ' + entrenadorId + ':', err);
        res.status(500).json({ message: 'Error del servidor al obtener clases del entrenador: ' + err.message });
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

// Obtener clientes que han asistido a clases de un entrenador específico
async function getClientesDeEntrenador(req, res) {
    let connection;
    const { entrenadorId } = req.params;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT DISTINCT
                c.ClienteID,
                c.PrimerNombre,
                c.ApellidoPaterno,
                c.Correo,
                c.Telefono,
                (SELECT COUNT(*) 
                 FROM AsistenciaClases ac_inner 
                 JOIN Clases cl_inner ON ac_inner.ClaseID = cl_inner.ClaseID
                 WHERE ac_inner.ClienteID = c.ClienteID AND cl_inner.EntrenadorID = :entrenadorId AND ac_inner.Asistio = 1
                ) AS NumeroAsistenciasConEntrenador
             FROM Clientes c
             JOIN AsistenciaClases ac ON c.ClienteID = ac.ClienteID
             JOIN Clases cl ON ac.ClaseID = cl.ClaseID
             WHERE cl.EntrenadorID = :entrenadorId AND ac.Asistio = 1
             ORDER BY c.ApellidoPaterno, c.PrimerNombre`,
            { entrenadorId: entrenadorId }
        );

        res.json(result.rows.map(row => ({
            clienteID: row[0],
            nombre: row[1],
            apellido: row[2],
            correo: row[3],
            telefono: row[4],
            numeroAsistenciasConEntrenador: row[5]
        })));
    } catch (err) {
        console.error('Error al obtener clientes del entrenador ' + entrenadorId + ':', err);
        res.status(500).json({ message: 'Error del servidor al obtener clientes del entrenador: ' + err.message });
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
    getAllEntrenadores,
    getEntrenadorById,
    createEntrenador,
    updateEntrenador,
    deleteEntrenador,
    getClasesEntrenador,
    getClientesDeEntrenador // Nueva función exportada
};
