// filepath: c:\\Users\\Emi\\Documents\\GitHub\\Proyecto-bases-gym\\src\\controllers\\membresiaController.js
const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Obtener todos los tipos de membresías
async function getAllMembresias(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT MembresiaID, Nombre, Descripcion, Precio, DuracionDias, AccesoPiscina, AccesoClases
             FROM Membresias
             ORDER BY Nombre`
        );
        res.json(result.rows.map(row => ({
            membresiaID: row[0],
            nombre: row[1],
            descripcion: row[2],
            precio: row[3],
            duracionDias: row[4],
            accesoPiscina: row[5],
            accesoClases: row[6]
        })));
    } catch (err) {
        console.error('Error al obtener tipos de membresías:', err);
        res.status(500).json({ message: 'Error del servidor al obtener tipos de membresías: ' + err.message });
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

// Obtener un tipo de membresía por ID
async function getMembresiaById(req, res) {
    let connection;
    const { id } = req.params;
    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(
            `SELECT MembresiaID, Nombre, Descripcion, Precio, DuracionDias, AccesoPiscina, AccesoClases
             FROM Membresias
             WHERE MembresiaID = :id`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de membresía no encontrado' });
        }
        const row = result.rows[0];
        res.json({
            membresiaID: row[0],
            nombre: row[1],
            descripcion: row[2],
            precio: row[3],
            duracionDias: row[4],
            accesoPiscina: row[5],
            accesoClases: row[6]
        });
    } catch (err) {
        console.error(`Error al obtener tipo de membresía ${id}:`, err);
        res.status(500).json({ message: 'Error del servidor al obtener el tipo de membresía: ' + err.message });
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

// Crear un nuevo tipo de membresía
async function createMembresia(req, res) {
    let connection;
    const { nombre, descripcion, precio, duracionDias, accesoPiscina, accesoClases } = req.body;

    if (!nombre || precio === undefined || duracionDias === undefined) {
        return res.status(400).json({ message: 'Nombre, precio y duración son campos obligatorios.' });
    }
    if (isNaN(parseFloat(precio)) || parseFloat(precio) < 0) {
        return res.status(400).json({ message: 'El precio debe ser un número no negativo.' });
    }
    if (isNaN(parseInt(duracionDias)) || parseInt(duracionDias) <= 0) {
        return res.status(400).json({ message: 'La duración en días debe ser un número positivo.' });
    }
    const piscina = (accesoPiscina === true || accesoPiscina === 1 || accesoPiscina === '1') ? 1 : 0;
    const clases = (accesoClases === true || accesoClases === 1 || accesoClases === '1') ? 1 : 0;


    const sql = `INSERT INTO Membresias (Nombre, Descripcion, Precio, DuracionDias, AccesoPiscina, AccesoClases)
                 VALUES (:nombre, :descripcion, :precio, :duracionDias, :accesoPiscina, :accesoClases)
                 RETURNING MembresiaID INTO :out_id_membresia`;
    const binds = {
        nombre,
        descripcion: descripcion || null,
        precio: parseFloat(precio),
        duracionDias: parseInt(duracionDias),
        accesoPiscina: piscina,
        accesoClases: clases,
        out_id_membresia: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: true });
        
        if (result.outBinds && result.outBinds.out_id_membresia) {
            res.status(201).json({ 
                message: 'Tipo de membresía creado con éxito', 
                membresiaId: result.outBinds.out_id_membresia[0] 
            });
        } else {
            throw new Error('No se pudo obtener el ID del tipo de membresía creado.');
        }
    } catch (err) {
        console.error('Error al crear tipo de membresía:', err);
        res.status(500).json({ message: 'Error del servidor al crear el tipo de membresía: ' + err.message });
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

// Actualizar un tipo de membresía existente
async function updateMembresia(req, res) {
    let connection;
    const { id } = req.params;
    const { nombre, descripcion, precio, duracionDias, accesoPiscina, accesoClases } = req.body;

    if (!nombre || precio === undefined || duracionDias === undefined) {
        return res.status(400).json({ message: 'Nombre, precio y duración son campos obligatorios para la actualización.' });
    }
    if (isNaN(parseFloat(precio)) || parseFloat(precio) < 0) {
        return res.status(400).json({ message: 'El precio debe ser un número no negativo.' });
    }
    if (isNaN(parseInt(duracionDias)) || parseInt(duracionDias) <= 0) {
        return res.status(400).json({ message: 'La duración en días debe ser un número positivo.' });
    }
    const piscina = (accesoPiscina === true || accesoPiscina === 1 || accesoPiscina === '1') ? 1 : 0;
    const clases = (accesoClases === true || accesoClases === 1 || accesoClases === '1') ? 1 : 0;

    const sql = `UPDATE Membresias SET
                    Nombre = :nombre,
                    Descripcion = :descripcion,
                    Precio = :precio,
                    DuracionDias = :duracionDias,
                    AccesoPiscina = :accesoPiscina,
                    AccesoClases = :accesoClases
                 WHERE MembresiaID = :id`;
    const binds = {
        nombre,
        descripcion: descripcion || null,
        precio: parseFloat(precio),
        duracionDias: parseInt(duracionDias),
        accesoPiscina: piscina,
        accesoClases: clases,
        id
    };

    try {
        connection = await oracledb.getConnection(dbConfig);
        const result = await connection.execute(sql, binds, { autoCommit: true });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Tipo de membresía no encontrado para actualizar o datos sin cambios.' });
        }
        res.json({ message: 'Tipo de membresía actualizado con éxito', membresiaId: id });
    } catch (err) {
        console.error('Error al actualizar tipo de membresía ' + id + ':', err);
        res.status(500).json({ message: 'Error del servidor al actualizar el tipo de membresía: ' + err.message });
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

// Eliminar un tipo de membresía
async function deleteMembresia(req, res) {
    let connection;
    const { id } = req.params;

    try {
        connection = await oracledb.getConnection(dbConfig);
        const checkUsage = await connection.execute(
            'SELECT COUNT(*) AS count FROM ClientesMembresias WHERE MembresiaID = :id',
            [id]
        );
        if (checkUsage.rows[0][0] > 0) {
            return res.status(400).json({ message: 'No se puede eliminar el tipo de membresía porque está en uso por clientes.' });
        }

        const result = await connection.execute(
            'DELETE FROM Membresias WHERE MembresiaID = :id',
            [id],
            { autoCommit: true }
        );

        if (result.rowsAffected === 0) {
            return res.status(404).json({ message: 'Tipo de membresía no encontrado para eliminar.' });
        }
        res.json({ message: 'Tipo de membresía eliminado con éxito', membresiaId: id });
    } catch (err) {
        console.error('Error al eliminar tipo de membresía ' + id + ':', err);
        res.status(500).json({ message: 'Error del servidor al eliminar el tipo de membresía: ' + err.message });
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

// Obtener estadísticas de membresías
async function getEstadisticasMembresias(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // Estadísticas básicas
        const statsResult = await connection.execute(`
            SELECT 
                COUNT(*) as total_tipos,
                ROUND(AVG(Precio), 2) as precio_promedio,
                MIN(Precio) as precio_minimo,
                MAX(Precio) as precio_maximo,
                ROUND(AVG(DuracionDias), 0) as duracion_promedio
            FROM Membresias
        `);
        
        // Conteo de membresías con acceso a piscina
        const piscinaResult = await connection.execute(`
            SELECT 
                SUM(CASE WHEN AccesoPiscina = 1 THEN 1 ELSE 0 END) as con_piscina,
                SUM(CASE WHEN AccesoPiscina = 0 THEN 1 ELSE 0 END) as sin_piscina
            FROM Membresias
        `);
        
        // Conteo de membresías con acceso a clases
        const clasesResult = await connection.execute(`
            SELECT 
                SUM(CASE WHEN AccesoClases = 1 THEN 1 ELSE 0 END) as con_clases,
                SUM(CASE WHEN AccesoClases = 0 THEN 1 ELSE 0 END) as sin_clases
            FROM Membresias
        `);

        // Distribución por rangos de precio
        const preciosResult = await connection.execute(`
            SELECT 
                SUM(CASE WHEN Precio <= 50 THEN 1 ELSE 0 END) as economicas,
                SUM(CASE WHEN Precio > 50 AND Precio <= 100 THEN 1 ELSE 0 END) as intermedias,
                SUM(CASE WHEN Precio > 100 THEN 1 ELSE 0 END) as premium
            FROM Membresias
        `);

        const stats = statsResult.rows[0];
        const piscina = piscinaResult.rows[0];
        const clases = clasesResult.rows[0];
        const precios = preciosResult.rows[0];

        res.json({
            resumen: {
                totalTipos: stats[0],
                precioPromedio: stats[1],
                precioMinimo: stats[2],
                precioMaximo: stats[3],
                duracionPromedio: stats[4]
            },
            accesos: {
                conPiscina: piscina[0],
                sinPiscina: piscina[1],
                conClases: clases[0],
                sinClases: clases[1]
            },
            distribucionPrecios: {
                economicas: precios[0],
                intermedias: precios[1],
                premium: precios[2]
            }
        });
    } catch (err) {
        console.error('Error al obtener estadísticas de membresías:', err);
        res.status(500).json({ message: 'Error del servidor al obtener estadísticas: ' + err.message });
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
    getAllMembresias,
    getMembresiaById,
    createMembresia,
    updateMembresia,
    deleteMembresia,
    getEstadisticasMembresias
};
