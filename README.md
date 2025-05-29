# Proyecto Bases Gym

Aplicación web para la gestión de gimnasios. Permite administrar clientes, membresías, clases, entrenadores, pagos y asistencia.

## Integrantes

*   Emiliano P
*   Mauricio B
*   Idaly R

## Requisitos Previos

*   **Node.js y npm:** Asegúrate de tener Node.js instalado. Puedes descargarlo desde [nodejs.org](https://nodejs.org/). npm viene incluido con Node.js.
*   **Oracle Database:** Necesitarás una instancia de Oracle Database (como Oracle XE o una base de datos en la nube) accesible.
*   **Oracle Instant Client (o similar):** Para que Node.js pueda conectarse a Oracle, necesitarás el cliente de Oracle configurado en tu sistema. Asegúrate de que la variable de entorno `PATH` (en Windows) o `LD_LIBRARY_PATH` (en Linux/macOS) incluya el directorio del cliente de Oracle.

## Configuración y Ejecución del Proyecto

1.  **Clonar el Repositorio (si aplica):**
    ```bash
    git clone https://github.com/emilianopime/Proyecto-bases-gym.git
    cd Proyecto-bases-gym
    ```

2.  **Configurar la Base de Datos Oracle:**
    *   Conéctate a tu instancia de Oracle Database usando una herramienta como SQL Developer, SQL*Plus, etc.
    *   Ejecuta el script SQL proporcionado en `Script SQL/GYM-TENTATIVO.sql` para crear todas las tablas necesarias y algunas inserciones básicas.
        *   **Importante:** Asegúrate de que la columna `PasswordHash` en la tabla `UsuariosSistema` tenga un tamaño adecuado para los hashes de bcrypt (ej. `VARCHAR2(255)`). Si el script la crea con `VARCHAR2(60)`, modifícala con:
            ```sql
            ALTER TABLE UsuariosSistema MODIFY (PasswordHash VARCHAR2(255));
            ```

3.  **Configurar la Conexión a la Base de Datos en la Aplicación:**
    *   Edita el archivo `src/config/dbconfig.js` con tus credenciales y detalles de conexión a Oracle:
        ```javascript
        // src/config/dbconfig.js
        module.exports = {
          user: "TU_USUARIO_ORACLE",
          password: "TU_PASSWORD_ORACLE",
          connectString: "TU_CONNECTION_STRING" // Ej: "localhost/XEPDB1" o "hostname:port/service_name"
        };
        ```

4.  **Instalar Dependencias del Proyecto:**
    Abre una terminal en la raíz del proyecto (`Proyecto-bases-gym-main`) y ejecuta:
    ```bash
    npm install
    ```

5.  **Crear un Usuario Administrador (si no lo hiciste con el script SQL):**
    *   **Opción A (Recomendado - Usando el script provisto):**
        El script `insertarUsuario.js` está diseñado para crear o actualizar un usuario 'admin' con contraseña '12345' (o 'admin2' con '123456' según la última configuración). Asegúrate de que el script esté configurado con el `Username` y `Correo` que desees y que no entren en conflicto con datos existentes.
        ```bash
        node insertarUsuario.js
        ```
        Si encuentras errores de restricción única (`ORA-00001`), revisa que el `Username` y `Correo` que el script intenta insertar/actualizar sean únicos o ajusta el script.

    *   **Opción B (Manualmente con SQL):**
        Puedes generar un hash para una contraseña usando `generarHash.js`:
        ```bash
        node generarHash.js 
        ```
        Copia el hash generado y úsalo en una sentencia `INSERT` en tu herramienta de base de datos:
        ```sql
        INSERT INTO UsuariosSistema (NombreCompleto, Username, PasswordHash, Rol, Correo, Activo, FechaCreacion) 
        VALUES (
            'Administrador Principal', 
            'admin', 
            'HASH_GENERADO_AQUI', 
            'Administrador', 
            'admin@example.com',  -- Asegúrate que este correo sea único
            1, 
            SYSDATE
        );
        COMMIT;
        ```

6.  **Ejecutar la Aplicación:**
    Una vez que la base de datos esté configurada y las dependencias instaladas, inicia el servidor Node.js:
    ```bash
    npm start
    ```
    La aplicación debería estar corriendo en `http://localhost:3000` (o el puerto configurado en `src/app.js`).

7.  **Acceder a la Aplicación:**
    Abre tu navegador web y ve a `http://localhost:3000/HTML/login.html`.
    Intenta iniciar sesión con el usuario administrador que creaste (ej. `admin` / `12345`).

## Estructura del Proyecto (Resumen)

*   `FRONT/`: Contiene los archivos HTML, CSS y JavaScript del lado del cliente.
*   `Script SQL/`: Contiene el script de creación de la base de datos.
*   `src/`: Contiene el código del backend (Node.js/Express).
    *   `config/`: Configuración de la base de datos.
    *   `controllers/`: Lógica de negocio para cada ruta.
    *   `routes/`: Definición de las rutas de la API.
    *   `app.js`: Archivo principal del servidor Express.
*   `package.json`: Define las dependencias y scripts del proyecto.
*   `generarHash.js`: Utilidad para generar hashes de contraseñas.
*   `insertarUsuario.js`: Utilidad para crear/actualizar usuarios administradores.

## Solución de Problemas Comunes

*   **Errores `ORA-12154: TNS:could not resolve the connect identifier specified`**: Asegúrate de que tu `connectString` en `dbconfig.js` sea correcta y que Oracle Client esté bien configurado y en el PATH.
*   **Errores `ORA-01017: invalid username/password; logon denied`**: Verifica tus credenciales en `dbconfig.js`.
*   **Errores `ORA-00001: unique constraint (...) violated`**: Estás intentando insertar un valor que ya existe en una columna con restricción `UNIQUE` (como `Username` o `Correo` en `UsuariosSistema`).
*   **Problemas con bcrypt (comparación de contraseñas falla)**: Asegúrate de que la columna `PasswordHash` en `UsuariosSistema` sea `VARCHAR2(255)` y que estés usando la misma versión de `bcrypt` para hashear y comparar. La versión `^5.1.0` es estable.

---
Desarrollado por Emiliano P, Mauricio B, Idaly R.
