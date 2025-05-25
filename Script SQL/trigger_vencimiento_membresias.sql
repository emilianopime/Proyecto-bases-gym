-- Script para automatizar el vencimiento de membresías
-- Este script debe ejecutarse periódicamente (diario recomendado)

-- Opción 1: Procedimiento almacenado para actualizar membresías vencidas
CREATE OR REPLACE PROCEDURE ActualizarMembresiasVencidas AS
BEGIN
    UPDATE ClientesMembresias 
    SET Estado = 'Vencida'
    WHERE Estado = 'Activa' 
      AND FechaFin < SYSDATE;
    
    -- Log del proceso
    DBMS_OUTPUT.PUT_LINE('Membresías actualizadas: ' || SQL%ROWCOUNT);
    COMMIT;
END;
/

-- Opción 2: Job programado para ejecutar automáticamente cada día a las 00:05
BEGIN
    DBMS_SCHEDULER.CREATE_JOB (
        job_name        => 'JOB_VENCIMIENTO_MEMBRESIAS',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN ActualizarMembresiasVencidas; END;',
        start_date      => SYSTIMESTAMP,
        repeat_interval => 'FREQ=DAILY; BYHOUR=0; BYMINUTE=5',
        enabled         => TRUE,
        comments        => 'Job para marcar membresías vencidas automáticamente'
    );
END;
/

-- Para ejecutar manualmente el procedimiento:
-- EXEC ActualizarMembresiasVencidas;

-- Para ver el estado del job:
-- SELECT job_name, enabled, state FROM user_scheduler_jobs WHERE job_name = 'JOB_VENCIMIENTO_MEMBRESIAS';

-- Para deshabilitar el job si es necesario:
-- EXEC DBMS_SCHEDULER.DISABLE('JOB_VENCIMIENTO_MEMBRESIAS');

-- Para eliminar el job si es necesario:
-- EXEC DBMS_SCHEDULER.DROP_JOB('JOB_VENCIMIENTO_MEMBRESIAS');
