const oracledb = require('oracledb');
const dbConfig = require('../config/dbconfig.js');

// Obtener todos los pagos con información detallada
async function getAllPagos(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT 
                cm.ClienteMembresiaID,
                cm.ClienteID,
                c.PrimerNombre || ' ' || c.ApellidoPaterno AS NombreCliente,
                c.Correo AS CorreoCliente,
                c.Telefono AS TelefonoCliente,
                m.Nombre AS NombreMembresia,
                m.Precio AS PrecioMembresia,
                cm.MontoPagado,
                cm.FechaPago,
                cm.FechaInicio,
                cm.FechaFin,
                cm.Estado,
                tp.Nombre AS TipoPago,
                cm.Notas,
                CASE 
                    WHEN cm.MontoPagado < m.Precio THEN 'Pago Parcial'
                    WHEN cm.MontoPagado = m.Precio THEN 'Pago Completo'
                    WHEN cm.MontoPagado > m.Precio THEN 'Sobrepago'
                    ELSE 'Sin Pago'
                END AS EstadoPago
            FROM ClientesMembresias cm
            INNER JOIN Clientes c ON cm.ClienteID = c.ClienteID
            INNER JOIN Membresias m ON cm.MembresiaID = m.MembresiaID
            LEFT JOIN TiposPago tp ON cm.TipoPagoID = tp.TipoPagoID
            ORDER BY cm.FechaPago DESC, cm.ClienteMembresiaID DESC
        `);
        
        const pagos = result.rows.map(row => ({
            clienteMembresiaId: row[0],
            clienteId: row[1],
            nombreCliente: row[2],
            correoCliente: row[3],
            telefonoCliente: row[4],
            nombreMembresia: row[5],
            precioMembresia: row[6],
            montoPagado: row[7],
            fechaPago: row[8],
            fechaInicio: row[9],
            fechaFin: row[10],
            estado: row[11],
            tipoPago: row[12],
            notas: row[13],
            estadoPago: row[14]
        }));
        
        res.json(pagos);
    } catch (error) {
        console.error('Error al obtener pagos:', error);
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

// Obtener pagos por cliente específico
async function getPagosByCliente(req, res) {
    let connection;
    try {
        const { clienteId } = req.params;
        
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT 
                cm.ClienteMembresiaID,
                c.PrimerNombre || ' ' || c.ApellidoPaterno AS NombreCliente,
                m.Nombre AS NombreMembresia,
                m.Precio AS PrecioMembresia,
                cm.MontoPagado,
                cm.FechaPago,
                cm.FechaInicio,
                cm.FechaFin,
                cm.Estado,
                tp.Nombre AS TipoPago,
                cm.Notas,
                CASE 
                    WHEN cm.MontoPagado < m.Precio THEN 'Pago Parcial'
                    WHEN cm.MontoPagado = m.Precio THEN 'Pago Completo'
                    WHEN cm.MontoPagado > m.Precio THEN 'Sobrepago'
                    ELSE 'Sin Pago'
                END AS EstadoPago
            FROM ClientesMembresias cm
            INNER JOIN Clientes c ON cm.ClienteID = c.ClienteID
            INNER JOIN Membresias m ON cm.MembresiaID = m.MembresiaID
            LEFT JOIN TiposPago tp ON cm.TipoPagoID = tp.TipoPagoID
            WHERE cm.ClienteID = :clienteId
            ORDER BY cm.FechaPago DESC, cm.ClienteMembresiaID DESC
        `, { clienteId });
        
        const pagos = result.rows.map(row => ({
            clienteMembresiaId: row[0],
            nombreCliente: row[1],
            nombreMembresia: row[2],
            precioMembresia: row[3],
            montoPagado: row[4],
            fechaPago: row[5],
            fechaInicio: row[6],
            fechaFin: row[7],
            estado: row[8],
            tipoPago: row[9],
            notas: row[10],
            estadoPago: row[11]
        }));
        
        res.json(pagos);
    } catch (error) {
        console.error('Error al obtener pagos del cliente:', error);
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

// Registrar un nuevo pago
async function registrarPago(req, res) {
    let connection;
    try {
        const { clienteId, membresiaId, tipoPagoId, montoPagado, notas } = req.body;
        
        // Validaciones básicas
        if (!clienteId || !membresiaId || !montoPagado) {
            return res.status(400).json({ 
                error: 'Faltan datos requeridos: clienteId, membresiaId, montoPagado' 
            });
        }
        
        if (montoPagado <= 0) {
            return res.status(400).json({ 
                error: 'El monto pagado debe ser mayor a cero' 
            });
        }
        
        connection = await oracledb.getConnection(dbConfig);
        
        // Obtener información de la membresía
        const membresiaResult = await connection.execute(`
            SELECT Precio, DuracionDias FROM Membresias WHERE MembresiaID = :membresiaId
        `, { membresiaId });
        
        if (membresiaResult.rows.length === 0) {
            return res.status(404).json({ error: 'Membresía no encontrada' });
        }
        
        const [precioMembresia, duracionDias] = membresiaResult.rows[0];
        
        // Calcular fechas
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setDate(fechaInicio.getDate() + duracionDias);
        
        // Determinar estado basado en el monto pagado
        let estado = 'Pendiente';
        if (montoPagado >= precioMembresia) {
            estado = 'Activa';
        } else {
            estado = 'Pendiente'; // Pago parcial
        }
        
        // Insertar el registro de pago/membresía
        const result = await connection.execute(`
            INSERT INTO ClientesMembresias 
            (ClienteID, MembresiaID, TipoPagoID, FechaInicio, FechaFin, Estado, 
             MontoPagado, FechaPago, Notas)
            VALUES (:clienteId, :membresiaId, :tipoPagoId, :fechaInicio, :fechaFin, 
                    :estado, :montoPagado, SYSDATE, :notas)
            RETURNING ClienteMembresiaID INTO :clienteMembresiaId
        `, {
            clienteId,
            membresiaId,
            tipoPagoId: tipoPagoId || null,
            fechaInicio,
            fechaFin,
            estado,
            montoPagado,
            notas: notas || null,
            clienteMembresiaId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });
        
        await connection.commit();
        
        res.status(201).json({
            success: true,
            message: 'Pago registrado exitosamente',
            clienteMembresiaId: result.outBinds.clienteMembresiaId[0],
            estadoPago: montoPagado >= precioMembresia ? 'Pago Completo' : 'Pago Parcial'
        });
        
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error al hacer rollback:', rollbackError);
            }
        }
        console.error('Error al registrar pago:', error);
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

// Actualizar un pago existente
async function actualizarPago(req, res) {
    let connection;
    try {
        const { clienteMembresiaId } = req.params;
        const { tipoPagoId, montoPagado, estado, notas } = req.body;
        
        connection = await oracledb.getConnection(dbConfig);
        
        // Verificar que el registro existe
        const existeResult = await connection.execute(`
            SELECT cm.ClienteMembresiaID, m.Precio 
            FROM ClientesMembresias cm
            INNER JOIN Membresias m ON cm.MembresiaID = m.MembresiaID
            WHERE cm.ClienteMembresiaID = :clienteMembresiaId
        `, { clienteMembresiaId });
        
        if (existeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Registro de pago no encontrado' });
        }
        
        const precioMembresia = existeResult.rows[0][1];
        
        // Actualizar estado automáticamente basado en el monto si se proporciona
        let estadoFinal = estado;
        if (montoPagado !== undefined) {
            if (montoPagado >= precioMembresia) {
                estadoFinal = 'Activa';
            } else if (montoPagado > 0) {
                estadoFinal = 'Pendiente';
            }
        }
        
        const result = await connection.execute(`
            UPDATE ClientesMembresias 
            SET TipoPagoID = COALESCE(:tipoPagoId, TipoPagoID),
                MontoPagado = COALESCE(:montoPagado, MontoPagado),
                Estado = COALESCE(:estadoFinal, Estado),
                Notas = COALESCE(:notas, Notas),
                FechaPago = CASE WHEN :montoPagado IS NOT NULL THEN SYSDATE ELSE FechaPago END
            WHERE ClienteMembresiaID = :clienteMembresiaId
        `, {
            tipoPagoId: tipoPagoId || null,
            montoPagado: montoPagado || null,
            estadoFinal: estadoFinal || null,
            notas: notas || null,
            clienteMembresiaId
        });
        
        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: 'No se pudo actualizar el registro' });
        }
        
        await connection.commit();
        
        res.json({
            success: true,
            message: 'Pago actualizado exitosamente'
        });
        
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error('Error al hacer rollback:', rollbackError);
            }
        }
        console.error('Error al actualizar pago:', error);
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

// Obtener tipos de pago disponibles
async function getTiposPago(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT TipoPagoID, Nombre 
            FROM TiposPago 
            ORDER BY Nombre
        `);
        
        const tiposPago = result.rows.map(row => ({
            tipoPagoId: row[0],
            nombre: row[1]
        }));
        
        res.json(tiposPago);
    } catch (error) {
        console.error('Error al obtener tipos de pago:', error);
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

// Obtener estadísticas de pagos
async function getEstadisticasPagos(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        // Estadísticas generales
        const statsResult = await connection.execute(`
            SELECT 
                COUNT(*) AS TotalPagos,
                COALESCE(SUM(MontoPagado), 0) AS IngresoTotal,
                COALESCE(AVG(MontoPagado), 0) AS PromedioIngresos,
                COUNT(CASE WHEN Estado = 'Activa' THEN 1 END) AS MembresiasActivas,
                COUNT(CASE WHEN Estado = 'Pendiente' THEN 1 END) AS PagosPendientes
            FROM ClientesMembresias
            WHERE FechaPago IS NOT NULL
        `);
        
        // Ingresos por mes (últimos 6 meses)
        const ingresosMesResult = await connection.execute(`
            SELECT 
                TO_CHAR(FechaPago, 'YYYY-MM') AS Mes,
                SUM(MontoPagado) AS Ingresos,
                COUNT(*) AS CantidadPagos
            FROM ClientesMembresias
            WHERE FechaPago >= ADD_MONTHS(SYSDATE, -6)
            AND FechaPago IS NOT NULL
            GROUP BY TO_CHAR(FechaPago, 'YYYY-MM')
            ORDER BY Mes DESC
        `);
        
        // Tipos de pago más utilizados
        const tiposPagoResult = await connection.execute(`
            SELECT 
                tp.Nombre,
                COUNT(*) AS Cantidad,
                SUM(cm.MontoPagado) AS MontoTotal
            FROM ClientesMembresias cm
            INNER JOIN TiposPago tp ON cm.TipoPagoID = tp.TipoPagoID
            WHERE cm.FechaPago IS NOT NULL
            GROUP BY tp.Nombre
            ORDER BY Cantidad DESC
        `);
        
        const stats = statsResult.rows[0];
        const ingresosPorMes = ingresosMesResult.rows.map(row => ({
            mes: row[0],
            ingresos: row[1],
            cantidadPagos: row[2]
        }));
        const tiposPago = tiposPagoResult.rows.map(row => ({
            nombre: row[0],
            cantidad: row[1],
            montoTotal: row[2]
        }));
        
        res.json({
            resumen: {
                totalPagos: stats[0],
                ingresoTotal: stats[1],
                promedioIngresos: parseFloat(stats[2].toFixed(2)),
                membresiasActivas: stats[3],
                pagosPendientes: stats[4]
            },
            ingresosPorMes,
            tiposPagoMasUsados: tiposPago
        });
        
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

// Buscar clientes para registro de pagos
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
                    ELSE 'Sin membresía activa'
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

// Obtener membresías disponibles para pago
async function getMembresiasDisponibles(req, res) {
    let connection;
    try {
        connection = await oracledb.getConnection(dbConfig);
        
        const result = await connection.execute(`
            SELECT 
                MembresiaID,
                Nombre,
                Descripcion,
                Precio,
                DuracionDias,
                AccesoPiscina,
                AccesoClases
            FROM Membresias
            ORDER BY Precio ASC
        `);
        
        const membresias = result.rows.map(row => ({
            membresiaId: row[0],
            nombre: row[1],
            descripcion: row[2],
            precio: row[3],
            duracionDias: row[4],
            accesoPiscina: row[5] === 1,
            accesoClases: row[6] === 1
        }));
        
        res.json(membresias);
    } catch (error) {
        console.error('Error al obtener membresías:', error);
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
    getAllPagos,
    getPagosByCliente,
    registrarPago,
    actualizarPago,
    getTiposPago,
    getEstadisticasPagos,
    buscarClientes,
    getMembresiasDisponibles
};
