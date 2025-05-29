INSERT INTO UsuariosSistema (NombreCompleto, Username, PasswordHash, Rol, Correo, Activo, FechaCreacion) 
VALUES (
    'Usuario de Prueba', 
    'testuser', 
    '$2b$10$U0IzS6MT0FUOdegkYfNiAuBFwqMllPY/3.XipDgWX4UUTJcWgsUES',  -- Hash para 'temp123'
    'Recepcionista', 
    'testuser@gym.com', 
    1, 
    SYSDATE
);


--usuario: testuser
--contraseña: temp123
