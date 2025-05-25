const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Obtener todas las clases
async function getAllClases(req, res) {
    let connection;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.ClaseID, c.Nombre, c.Descripcion, c.EntrenadorID, 
                    c.DiaSemana, c.HoraInicio, c.DuracionMinutos, 
                    c.CapacidadMaxima, c.NivelDificultad, c.Activa,
                    e.Nombre || ' ' || e.Apellido AS NombreEntrenador
             FROM Clases c
             LEFT JOIN Entrenadores e ON c.EntrenadorID = e.EntrenadorID
             ORDER BY c.DiaSemana, c.HoraInicio`,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener clases:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las clases',
            error: error.message
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

// Obtener clase por ID
async function getClaseById(req, res) {
    let connection;
    const { claseId } = req.params;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT c.ClaseID, c.Nombre, c.Descripcion, c.EntrenadorID, 
                    c.DiaSemana, c.HoraInicio, c.DuracionMinutos, 
                    c.CapacidadMaxima, c.NivelDificultad, c.Activa,
                    e.Nombre || ' ' || e.Apellido AS NombreEntrenador
             FROM Clases c
             LEFT JOIN Entrenadores e ON c.EntrenadorID = e.EntrenadorID
             WHERE c.ClaseID = :claseId`,
            { claseId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Clase no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener clase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la clase',
            error: error.message
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

// Crear nueva clase
async function createClase(req, res) {
    let connection;
    const { 
        nombre, 
        descripcion, 
        entrenadorId, 
        diaSemana, 
        horaInicio, 
        duracionMinutos, 
        capacidadMaxima, 
        nivelDificultad,
        activa = 1 
    } = req.body;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // Validar que el entrenador existe
        if (entrenadorId) {
            const entrenadorCheck = await connection.execute(
                'SELECT EntrenadorID FROM Entrenadores WHERE EntrenadorID = :entrenadorId',
                { entrenadorId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            if (entrenadorCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador especificado no existe'
                });
            }
        }
        
        const result = await connection.execute(
            `INSERT INTO Clases (Nombre, Descripcion, EntrenadorID, DiaSemana, 
                                HoraInicio, DuracionMinutos, CapacidadMaxima, 
                                NivelDificultad, Activa)
             VALUES (:nombre, :descripcion, :entrenadorId, :diaSemana, 
                     :horaInicio, :duracionMinutos, :capacidadMaxima, 
                     :nivelDificultad, :activa)`,
            {
                nombre,
                descripcion,
                entrenadorId: entrenadorId || null,
                diaSemana,
                horaInicio,
                duracionMinutos,
                capacidadMaxima,
                nivelDificultad,
                activa
            },
            { autoCommit: true }
        );
        
        res.status(201).json({
            success: true,
            message: 'Clase creada exitosamente',
            claseId: result.lastRowid
        });
    } catch (error) {
        console.error('Error al crear clase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear la clase',
            error: error.message
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

// Actualizar clase
async function updateClase(req, res) {
    let connection;
    const { claseId } = req.params;
    const { 
        nombre, 
        descripcion, 
        entrenadorId, 
        diaSemana, 
        horaInicio, 
        duracionMinutos, 
        capacidadMaxima, 
        nivelDificultad,
        activa 
    } = req.body;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // Verificar que la clase existe
        const claseCheck = await connection.execute(
            'SELECT ClaseID FROM Clases WHERE ClaseID = :claseId',
            { claseId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (claseCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Clase no encontrada'
            });
        }
        
        // Validar que el entrenador existe si se proporciona
        if (entrenadorId) {
            const entrenadorCheck = await connection.execute(
                'SELECT EntrenadorID FROM Entrenadores WHERE EntrenadorID = :entrenadorId',
                { entrenadorId },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            
            if (entrenadorCheck.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'El entrenador especificado no existe'
                });
            }
        }
        
        await connection.execute(
            `UPDATE Clases 
             SET Nombre = :nombre, 
                 Descripcion = :descripcion, 
                 EntrenadorID = :entrenadorId, 
                 DiaSemana = :diaSemana, 
                 HoraInicio = :horaInicio, 
                 DuracionMinutos = :duracionMinutos, 
                 CapacidadMaxima = :capacidadMaxima, 
                 NivelDificultad = :nivelDificultad,
                 Activa = :activa
             WHERE ClaseID = :claseId`,
            {
                nombre,
                descripcion,
                entrenadorId: entrenadorId || null,
                diaSemana,
                horaInicio,
                duracionMinutos,
                capacidadMaxima,
                nivelDificultad,
                activa,
                claseId
            },
            { autoCommit: true }
        );
        
        res.json({
            success: true,
            message: 'Clase actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error al actualizar clase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar la clase',
            error: error.message
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

// Eliminar clase
async function deleteClase(req, res) {
    let connection;
    const { claseId } = req.params;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // Verificar que la clase existe
        const claseCheck = await connection.execute(
            'SELECT ClaseID FROM Clases WHERE ClaseID = :claseId',
            { claseId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (claseCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Clase no encontrada'
            });
        }
        
        // Verificar si hay asistencias registradas para esta clase
        const asistenciaCheck = await connection.execute(
            'SELECT COUNT(*) as COUNT FROM AsistenciaClases WHERE ClaseID = :claseId',
            { claseId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        if (asistenciaCheck.rows[0].COUNT > 0) {
            // Si hay asistencias, solo marcar como inactiva
            await connection.execute(
                'UPDATE Clases SET Activa = 0 WHERE ClaseID = :claseId',
                { claseId },
                { autoCommit: true }
            );
            
            res.json({
                success: true,
                message: 'Clase marcada como inactiva (tiene registros de asistencia)'
            });
        } else {
            // Si no hay asistencias, eliminar completamente
            await connection.execute(
                'DELETE FROM Clases WHERE ClaseID = :claseId',
                { claseId },
                { autoCommit: true }
            );
            
            res.json({
                success: true,
                message: 'Clase eliminada exitosamente'
            });
        }
    } catch (error) {
        console.error('Error al eliminar clase:', error);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la clase',
            error: error.message
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

// Obtener entrenadores para dropdown
async function getEntrenadores(req, res) {
    let connection;
    
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT EntrenadorID, Nombre || ' ' || Apellido AS NombreCompleto
             FROM Entrenadores 
             WHERE Activo = 1
             ORDER BY Nombre, Apellido`,
            {},
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error al obtener entrenadores:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener los entrenadores',
            error: error.message
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
    getAllClases,
    getClaseById,
    createClase,
    updateClase,
    deleteClase,
    getEntrenadores
};
