document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const messageDiv = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Obtiene los valores del formulario
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    messageDiv.textContent = 'Procesando...';

    try {
      // Petición al backend
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok && data.userId) {
        // Login exitoso
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);
        messageDiv.textContent = '¡Bienvenido! Redirigiendo...';
        setTimeout(() => {
          window.location.href = 'hub.html'; 
        }, 1000);
      } else {
        // Error de login
        messageDiv.textContent = data.message || 'Usuario o contraseña incorrectos';
      }
    } catch (error) {
      messageDiv.textContent = 'Error de conexión con el servidor';
    }
  });
});