const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

async function getAllAsistencias(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT 
                a.AsistenciaID,
                a.ClienteID,
                a.ClaseID,
                a.FechaAsistencia,
                a.HoraCheckIn,
                a.Asistio,
                c.PrimerNombre || ' ' || c.ApellidoPaterno AS NombreCliente,
                cl.Nombre AS NombreClase,
                cl.DiaSemana,
                cl.HoraInicio,
                cl.DuracionMinutos,
                e.Nombre || ' ' || e.Apellido AS NombreEntrenador
            FROM AsistenciaClases a
            INNER JOIN Clientes c ON a.ClienteID = c.ClienteID
            INNER JOIN Clases cl ON a.ClaseID = cl.ClaseID
            LEFT JOIN Entrenadores e ON cl.EntrenadorID = e.EntrenadorID
            ORDER BY a.FechaAsistencia DESC, cl.HoraInicio DESC
        `);
        
        const asistencias = result.rows.map(row => ({
            asistenciaId: row[0],
            clienteId: row[1],
            claseId: row[2],
            fechaAsistencia: row[3],
            horaCheckIn: row[4],
            asistio: row[5] === 1,
            nombreCliente: row[6],
            nombreClase: row[7],
            diaSemana: row[8],
            horaInicio: row[9],
            duracionMinutos: row[10],
            nombreEntrenador: row[11]
        }));
        
        res.json(asistencias);
    } catch (error) {
        console.error('Error al obtener asistencias:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

async function getClasesDelDia(req, res) {
    let connection;
    try {
        const { fecha } = req.query;
        const fechaConsulta = fecha || new Date().toISOString().split('T')[0];
        
        connection = await oracledb.getConnection(dbConfig);
        
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const fechaObj = new Date(fechaConsulta + 'T00:00:00');
        const diaSemana = diasSemana[fechaObj.getDay()];
        
        const result = await connection.execute(`
            SELECT 
                c.ClaseID,
                c.Nombre,
                c.Descripcion,
                c.DiaSemana,
                c.HoraInicio,
                c.DuracionMinutos,
                c.CapacidadMaxima,
                c.NivelDificultad,
                e.Nombre || ' ' || e.Apellido AS NombreEntrenador,
                e.EntrenadorID,
                (SELECT COUNT(*) FROM AsistenciaClases a 
                 WHERE a.ClaseID = c.ClaseID 
                 AND TRUNC(a.FechaAsistencia) = TO_DATE(:fechaConsulta, 'YYYY-MM-DD')
                 AND a.Asistio = 1) AS AsistentesRegistrados
            FROM Clases c
            LEFT JOIN Entrenadores e ON c.EntrenadorID = e.EntrenadorID
            WHERE c.Activa = 1 
            AND (c.DiaSemana = :diaSemana OR c.DiaSemana = 'Variable')
            ORDER BY c.HoraInicio
        `, {
            fechaConsulta: fechaConsulta,
            diaSemana: diaSemana
        });
        
        const clases = result.rows.map(row => ({
            claseId: row[0],
            nombre: row[1],
            descripcion: row[2],
            diaSemana: row[3],
            horaInicio: row[4],
            duracionMinutos: row[5],
            capacidadMaxima: row[6],
            nivelDificultad: row[7],
            nombreEntrenador: row[8],
            entrenadorId: row[9],
            asistentesRegistrados: row[10]
        }));
        
        res.json(clases);
    } catch (error) {
        console.error('Error al obtener clases del día:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

async function buscarClientes(req, res) {
    let connection;
    try {
        const { termino } = req.query;
        
        if (!termino || termino.trim().length < 2) {
            return res.json([]);
        }
        
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT 
                c.ClienteID,
                c.PrimerNombre || ' ' || c.ApellidoPaterno AS NombreCompleto,
                c.Telefono,
                c.Correo,
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM ClientesMembresias cm 
                        WHERE cm.ClienteID = c.ClienteID 
                        AND cm.Estado = 'Activa' 
                        AND cm.FechaFin >= SYSDATE
                    ) THEN 'Activa'
                    ELSE 'Inactiva'
                END AS EstadoMembresia
            FROM Clientes c
            WHERE UPPER(c.PrimerNombre || ' ' || c.ApellidoPaterno) LIKE UPPER(:termino)
            OR UPPER(c.PrimerNombre) LIKE UPPER(:termino)
            OR UPPER(c.ApellidoPaterno) LIKE UPPER(:termino)
            OR c.ClienteID = :clienteId
            ORDER BY c.PrimerNombre, c.ApellidoPaterno
        `, {
            termino: `%${termino}%`,
            clienteId: isNaN(termino) ? null : parseInt(termino)
        });
        
        const clientes = result.rows.map(row => ({
            clienteId: row[0],
            nombreCompleto: row[1],
            telefono: row[2],
            correo: row[3],
            estadoMembresia: row[4]
        }));
        
        res.json(clientes);
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

async function registrarAsistencia(req, res) {
    let connection;
    try {
        const { clienteId, claseId, fechaAsistencia, horaCheckIn, asistio } = req.body;
        
        if (!clienteId || !claseId || !fechaAsistencia) {
            return res.status(400).json({ 
                error: 'Faltan datos requeridos: clienteId, claseId, fechaAsistencia' 
            });
        }
        
        connection = await oracledb.getConnection(dbConfig);
        
        const existeRegistro = await connection.execute(`
            SELECT AsistenciaID FROM AsistenciaClases 
            WHERE ClienteID = :clienteId 
            AND ClaseID = :claseId 
            AND TRUNC(FechaAsistencia) = TO_DATE(:fechaAsistencia, 'YYYY-MM-DD')
        `, { clienteId, claseId, fechaAsistencia });
        
        if (existeRegistro.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Ya existe un registro de asistencia para este cliente en esta clase y fecha' 
            });
        }
        
        const capacidadResult = await connection.execute(`
            SELECT 
                c.CapacidadMaxima,
                (SELECT COUNT(*) FROM AsistenciaClases a 
                 WHERE a.ClaseID = c.ClaseID 
                 AND TRUNC(a.FechaAsistencia) = TO_DATE(:fechaAsistencia, 'YYYY-MM-DD')
                 AND a.Asistio = 1) AS AsistentesActuales
            FROM Clases c
            WHERE c.ClaseID = :claseId
        `, { claseId, fechaAsistencia });
        
        if (capacidadResult.rows.length === 0) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }
        
        const [capacidadMaxima, asistentesActuales] = capacidadResult.rows[0];
        
        if (asistio !== false && asistentesActuales >= capacidadMaxima) {
            return res.status(400).json({ 
                error: 'La clase ha alcanzado su capacidad máxima' 
            });
        }
        
        const result = await connection.execute(`
            INSERT INTO AsistenciaClases 
            (ClienteID, ClaseID, FechaAsistencia, HoraCheckIn, Asistio)
            VALUES (:clienteId, :claseId, TO_DATE(:fechaAsistencia, 'YYYY-MM-DD'), :horaCheckIn, :asistio)
            RETURNING AsistenciaID INTO :asistenciaId
        `, {
            clienteId,
            claseId,
            fechaAsistencia,
            horaCheckIn: horaCheckIn || null,
            asistio: asistio !== false ? 1 : 0,
            asistenciaId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Asistencia registrada exitosamente',
            asistenciaId: result.outBinds.asistenciaId[0]
        });
        
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error al hacer rollback:', rollbackError);
            }
        }
        console.error('Error al registrar asistencia:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

async function actualizarAsistencia(req, res) {
    let connection;
    try {
        const { asistenciaId } = req.params;
        const { asistio, horaCheckIn } = req.body;
        
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            UPDATE AsistenciaClases 
            SET Asistio = :asistio,
                HoraCheckIn = :horaCheckIn
            WHERE AsistenciaID = :asistenciaId
        `, {
            asistio: asistio ? 1 : 0,
            horaCheckIn: horaCheckIn || null,
            asistenciaId
        });
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Asistencia actualizada exitosamente'
        });
        
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error al hacer rollback:', rollbackError);
            }
        }
        console.error('Error al actualizar asistencia:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

async function eliminarAsistencia(req, res) {
    let connection;
    try {
        const { asistenciaId } = req.params;
        
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            DELETE FROM AsistenciaClases 
            WHERE AsistenciaID = :asistenciaId
        `, { asistenciaId });
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'Registro de asistencia no encontrado' });
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Registro de asistencia eliminado exitosamente'
        });
        
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error al hacer rollback:', rollbackError);
            }
        }
        console.error('Error al eliminar asistencia:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

async function getEstadisticasAsistencia(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT 
                COUNT(*) AS TotalRegistros,
                COUNT(CASE WHEN Asistio = 1 THEN 1 END) AS TotalAsistencias,
                COUNT(CASE WHEN Asistio = 0 THEN 1 END) AS TotalAusencias,
                ROUND(
                    (COUNT(CASE WHEN Asistio = 1 THEN 1 END) * 100.0) / 
                    NULLIF(COUNT(*), 0), 2
                ) AS PorcentajeAsistencia
            FROM AsistenciaClases
            WHERE FechaAsistencia >= TRUNC(SYSDATE) - 30
        `);
        
        const estadisticas = {
            totalRegistros: result.rows[0][0],
            totalAsistencias: result.rows[0][1],
            totalAusencias: result.rows[0][2],
            porcentajeAsistencia: result.rows[0][3] || 0
        };
        
        res.json(estadisticas);
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (error) {
                console.error('Error al cerrar conexión:', error);
            }
        }
    }
}

module.exports = {
    getAllAsistencias,
    getClasesDelDia,
    buscarClientes,
    registrarAsistencia,
    actualizarAsistencia,
    eliminarAsistencia,
    getEstadisticasAsistencia
};
