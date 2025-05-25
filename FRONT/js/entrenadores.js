// Script para la funcionalidad del Módulo de Entrenadores
document.addEventListener('DOMContentLoaded', function() {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const btnMostrarFormularioRegistro = document.getElementById('btnMostrarFormularioRegistro');
    const btnCancelarRegistro = document.getElementById('btnCancelarRegistro');
    const btnCerrarPerfil = document.getElementById('btnCerrarPerfil');
    const btnEditarEntrenador = document.getElementById('btnEditarEntrenador');

    const seccionRegistrarEntrenador = document.getElementById('seccionRegistrarEntrenador');
    const seccionListaEntrenadores = document.getElementById('seccionListaEntrenadores');
    const seccionPerfilEntrenador = document.getElementById('seccionPerfilEntrenador');
    
    const formularioEntrenador = document.getElementById('formulario-entrenador');
    const cuerpoTablaEntrenadores = document.getElementById('cuerpoTablaEntrenadores');
    const contenedorCardsEntrenadores = document.getElementById('contenedorCardsEntrenadores');

    // Elementos del perfil del entrenador
    const perfilEntrenadorNombreCompleto = document.getElementById('perfilEntrenadorNombreCompleto');
    const perfilEntrenadorID = document.getElementById('perfilEntrenadorID');
    const perfilNombre = document.getElementById('perfilNombre');
    const perfilApellido = document.getElementById('perfilApellido');
    const perfilEspecialidad = document.getElementById('perfilEspecialidad');
    const perfilTelefono = document.getElementById('perfilTelefono');
    const perfilCorreo = document.getElementById('perfilCorreo');
    const perfilFechaContratacion = document.getElementById('perfilFechaContratacion');
    const perfilEstado = document.getElementById('perfilEstado');

    // Elementos para listas en pestañas del perfil
    const listaClasesEntrenador = document.getElementById('listaClasesEntrenador');
    const listaClientesEntrenador = document.getElementById('listaClientesEntrenador');

    // Búsqueda
    const buscarEntrenador = document.getElementById('buscarEntrenador');

    // --- VARIABLES GLOBALES ---
    let entrenadoresData = [];
    let entrenadorActual = null;

    // --- MANEJO DE VISIBILIDAD DE SECCIONES ---
    function mostrarSeccion(seccionAMostrar) {
        seccionRegistrarEntrenador.style.display = 'none';
        seccionListaEntrenadores.style.display = 'none';
        seccionPerfilEntrenador.style.display = 'none';

        if (seccionAMostrar) {
            seccionAMostrar.style.display = 'block';
        }
    }

    // --- MANEJO DE PESTAÑAS DEL PERFIL ---
    function configurarPestañasPerfil() {
        const pestañas = document.querySelectorAll('.pestaña');
        const contenidosPestaña = document.querySelectorAll('.contenido-pestaña');

        pestañas.forEach(pestaña => {
            pestaña.addEventListener('click', function() {
                const pestañaTarget = this.dataset.pestaña;

                // Remover clase activa de todas las pestañas y contenidos
                pestañas.forEach(p => p.classList.remove('activa'));
                contenidosPestaña.forEach(c => c.classList.remove('activa'));

                // Agregar clase activa a la pestaña seleccionada
                this.classList.add('activa');
                document.getElementById(`pestaña-${pestañaTarget}`).classList.add('activa');

                // Cargar contenido específico si es necesario
                if (pestañaTarget === 'clases' && entrenadorActual) {
                    cargarClasesEntrenador(entrenadorActual.entrenadorID);
                } else if (pestañaTarget === 'clientes' && entrenadorActual) {
                    cargarClientesEntrenador(entrenadorActual.entrenadorID);
                }
            });
        });
    }

    // --- EVENT LISTENERS ---
    if (btnMostrarFormularioRegistro) {
        btnMostrarFormularioRegistro.addEventListener('click', function() {
            formularioEntrenador.reset();
            delete formularioEntrenador.dataset.editingId;
            document.querySelector('#seccionRegistrarEntrenador legend').textContent = "Datos del Nuevo Entrenador";
            document.getElementById('textoBotonSubmit').textContent = "Registrar Entrenador";
            mostrarSeccion(seccionRegistrarEntrenador);
        });
    }

    if (btnCancelarRegistro) {
        btnCancelarRegistro.addEventListener('click', function() {
            mostrarSeccion(seccionListaEntrenadores);
        });
    }

    if (btnCerrarPerfil) {
        btnCerrarPerfil.addEventListener('click', function() {
            mostrarSeccion(seccionListaEntrenadores);
        });
    }

    if (btnEditarEntrenador) {
        btnEditarEntrenador.addEventListener('click', function() {
            prepararEdicionEntrenador();
        });
    }

    // Event listener para el formulario
    if (formularioEntrenador) {
        formularioEntrenador.addEventListener('submit', function(e) {
            e.preventDefault();
            manejarSubmitFormulario();
        });
    }

    // Event listener para búsqueda
    if (buscarEntrenador) {
        buscarEntrenador.addEventListener('input', function() {
            const termino = this.value.toLowerCase();
            filtrarEntrenadores(termino);
        });
    }

    // --- FUNCIONES DE API ---
    async function cargarEntrenadores() {
        try {
            const response = await fetch('/api/entrenadores');
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            entrenadoresData = await response.json();
            console.log('Entrenadores cargados:', entrenadoresData);
            mostrarEntrenadoresEnTabla();
            mostrarEntrenadoresEnCards();
        } catch (error) {
            console.error('Error al cargar entrenadores:', error);
            mostrarMensaje('Error al cargar los entrenadores: ' + error.message, 'error');
        }
    }

    async function registrarEntrenador(datosEntrenador) {
        try {
            const response = await fetch('/api/entrenadores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(datosEntrenador)
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.message || 'Error al registrar entrenador');
            }

            console.log('Entrenador registrado exitosamente:', resultado);
            mostrarMensaje('Entrenador registrado exitosamente', 'exito');
            formularioEntrenador.reset();
            mostrarSeccion(seccionListaEntrenadores);
            cargarEntrenadores();
        } catch (error) {
            console.error('Error al registrar entrenador:', error);
            mostrarMensaje('Error al registrar entrenador: ' + error.message, 'error');
        }
    }

    async function actualizarEntrenador(id, datosEntrenador) {
        try {
            const response = await fetch(`/api/entrenadores/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(datosEntrenador)
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.message || 'Error al actualizar entrenador');
            }

            console.log('Entrenador actualizado exitosamente:', resultado);
            mostrarMensaje('Entrenador actualizado exitosamente', 'exito');
            formularioEntrenador.reset();
            delete formularioEntrenador.dataset.editingId;
            mostrarSeccion(seccionListaEntrenadores);
            cargarEntrenadores();
        } catch (error) {
            console.error('Error al actualizar entrenador:', error);
            mostrarMensaje('Error al actualizar entrenador: ' + error.message, 'error');
        }
    }

    async function eliminarEntrenador(id) {
        if (!confirm('¿Está seguro de que desea eliminar este entrenador?')) {
            return;
        }

        try {
            const response = await fetch(`/api/entrenadores/${id}`, {
                method: 'DELETE'
            });

            const resultado = await response.json();

            if (!response.ok) {
                throw new Error(resultado.message || 'Error al eliminar entrenador');
            }

            console.log('Entrenador eliminado exitosamente');
            mostrarMensaje('Entrenador eliminado exitosamente', 'exito');
            cargarEntrenadores();
        } catch (error) {
            console.error('Error al eliminar entrenador:', error);
            mostrarMensaje('Error al eliminar entrenador: ' + error.message, 'error');
        }
    }

    async function obtenerEntrenadorPorId(id) {
        try {
            const response = await fetch(`/api/entrenadores/${id}`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error al obtener entrenador:', error);
            mostrarMensaje('Error al obtener información del entrenador: ' + error.message, 'error');
            return null;
        }
    }

    async function cargarClasesEntrenador(entrenadorId) {
        try {
            const response = await fetch(`/api/entrenadores/${entrenadorId}/clases`);
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            const clases = await response.json();
            mostrarClasesEnPerfil(clases);
        } catch (error) {
            console.error('Error al cargar clases del entrenador:', error);
            listaClasesEntrenador.innerHTML = '<p class="mensaje-error">Error al cargar las clases</p>';
        }
    }

    async function cargarClientesEntrenador(entrenadorId) {
        try {
            // Esta funcionalidad se puede implementar más tarde cuando se cree la relación entrenador-cliente
            listaClientesEntrenador.innerHTML = '<p class="mensaje-info">Funcionalidad de clientes asignados en desarrollo</p>';
        } catch (error) {
            console.error('Error al cargar clientes del entrenador:', error);
            listaClientesEntrenador.innerHTML = '<p class="mensaje-error">Error al cargar los clientes</p>';
        }
    }

    // --- FUNCIONES DE INTERFAZ ---
    function mostrarEntrenadoresEnTabla() {
        if (!cuerpoTablaEntrenadores) return;

        cuerpoTablaEntrenadores.innerHTML = '';

        if (entrenadoresData.length === 0) {
            cuerpoTablaEntrenadores.innerHTML = `
                <tr>
                    <td colspan="8" class="mensaje-vacio">No hay entrenadores registrados</td>
                </tr>
            `;
            return;
        }

        entrenadoresData.forEach(entrenador => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${entrenador.entrenadorID}</td>
                <td>${entrenador.nombre} ${entrenador.apellido}</td>
                <td>${entrenador.especialidad}</td>
                <td>${entrenador.telefono}</td>
                <td>${entrenador.correo}</td>
                <td>${formatearFecha(entrenador.fechaContratacion)}</td>
                <td>${entrenador.numeroClases || 0}</td>
                <td>
                    <div class="acciones-tabla">
                        <button class="btn-accion btn-ver" onclick="verPerfilEntrenador(${entrenador.entrenadorID})" title="Ver perfil">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-accion btn-editar" onclick="editarEntrenador(${entrenador.entrenadorID})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-accion btn-eliminar" onclick="eliminarEntrenador(${entrenador.entrenadorID})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            cuerpoTablaEntrenadores.appendChild(fila);
        });
    }

    function mostrarEntrenadoresEnCards() {
        if (!contenedorCardsEntrenadores) return;

        contenedorCardsEntrenadores.innerHTML = '';

        if (entrenadoresData.length === 0) {
            contenedorCardsEntrenadores.innerHTML = '<p class="mensaje-vacio">No hay entrenadores registrados</p>';
            return;
        }

        entrenadoresData.forEach(entrenador => {
            const card = document.createElement('div');
            card.className = 'card-entrenador';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-avatar">
                        <i class="fas fa-user-tie"></i>
                    </div>
                    <div class="card-info">
                        <h3>${entrenador.nombre} ${entrenador.apellido}</h3>
                        <p class="especialidad"><i class="fas fa-dumbbell"></i> ${entrenador.especialidad}</p>
                    </div>
                </div>
                <div class="card-body">
                    <div class="card-detail">
                        <i class="fas fa-phone"></i>
                        <span>${entrenador.telefono}</span>
                    </div>
                    <div class="card-detail">
                        <i class="fas fa-envelope"></i>
                        <span>${entrenador.correo}</span>
                    </div>
                    <div class="card-detail">
                        <i class="fas fa-calendar"></i>
                        <span>Desde: ${formatearFecha(entrenador.fechaContratacion)}</span>
                    </div>
                    <div class="card-detail">
                        <i class="fas fa-chalkboard-teacher"></i>
                        <span>${entrenador.numeroClases || 0} clases asignadas</span>
                    </div>
                </div>
                <div class="card-actions">
                    <button class="btn-card btn-ver" onclick="verPerfilEntrenador(${entrenador.entrenadorID})">
                        <i class="fas fa-eye"></i> Ver Perfil
                    </button>
                    <button class="btn-card btn-editar" onclick="editarEntrenador(${entrenador.entrenadorID})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-card btn-eliminar" onclick="eliminarEntrenador(${entrenador.entrenadorID})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            contenedorCardsEntrenadores.appendChild(card);
        });
    }

    function mostrarClasesEnPerfil(clases) {
        if (!listaClasesEntrenador) return;

        if (clases.length === 0) {
            listaClasesEntrenador.innerHTML = '<p class="mensaje-vacio">No tiene clases asignadas</p>';
            return;
        }

        const listaHTML = clases.map(clase => `
            <div class="item-lista">
                <div class="item-header">
                    <h4>${clase.nombre}</h4>
                    <span class="badge ${clase.activa ? 'badge-activa' : 'badge-inactiva'}">
                        ${clase.activa ? 'Activa' : 'Inactiva'}
                    </span>
                </div>
                <div class="item-details">
                    <p><i class="fas fa-clock"></i> ${clase.duracion} minutos</p>
                    <p><i class="fas fa-users"></i> Capacidad: ${clase.capacidad}</p>
                    <p><i class="fas fa-info-circle"></i> ${clase.descripcion || 'Sin descripción'}</p>
                </div>
            </div>
        `).join('');

        listaClasesEntrenador.innerHTML = listaHTML;
    }

    function filtrarEntrenadores(termino) {
        const filas = cuerpoTablaEntrenadores.querySelectorAll('tr');
        const cards = contenedorCardsEntrenadores.querySelectorAll('.card-entrenador');

        filas.forEach(fila => {
            const texto = fila.textContent.toLowerCase();
            fila.style.display = texto.includes(termino) ? '' : 'none';
        });

        cards.forEach(card => {
            const texto = card.textContent.toLowerCase();
            card.style.display = texto.includes(termino) ? '' : 'none';
        });
    }

    // --- FUNCIONES AUXILIARES ---
    function manejarSubmitFormulario() {
        const formData = new FormData(formularioEntrenador);
        const datosEntrenador = {
            nombre: formData.get('nombre'),
            apellido: formData.get('apellido'),
            especialidad: formData.get('especialidad'),
            telefono: formData.get('telefono'),
            correo: formData.get('correo')
        };

        console.log('Datos del entrenador a enviar:', datosEntrenador);

        const editingId = formularioEntrenador.dataset.editingId;
        if (editingId) {
            actualizarEntrenador(editingId, datosEntrenador);
        } else {
            registrarEntrenador(datosEntrenador);
        }
    }

    function formatearFecha(fechaString) {
        if (!fechaString) return '';
        const fecha = new Date(fechaString);
        return fecha.toLocaleDateString('es-ES');
    }

    function mostrarMensaje(mensaje, tipo) {
        // Crear elemento de mensaje
        const mensajeDiv = document.createElement('div');
        mensajeDiv.className = `mensaje mensaje-${tipo}`;
        mensajeDiv.innerHTML = `
            <i class="fas ${tipo === 'exito' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${mensaje}</span>
        `;

        // Agregar al DOM
        document.body.appendChild(mensajeDiv);

        // Remover después de 5 segundos
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.parentNode.removeChild(mensajeDiv);
            }
        }, 5000);
    }

    // --- FUNCIONES GLOBALES (para onclick en HTML generado dinámicamente) ---
    window.verPerfilEntrenador = async function(id) {
        const entrenador = await obtenerEntrenadorPorId(id);
        if (entrenador) {
            entrenadorActual = entrenador;
            poblarPerfilEntrenador(entrenador);
            mostrarSeccion(seccionPerfilEntrenador);
        }
    };

    window.editarEntrenador = async function(id) {
        const entrenador = await obtenerEntrenadorPorId(id);
        if (entrenador) {
            prepararEdicionEntrenadorConDatos(entrenador);
        }
    };

    window.eliminarEntrenador = function(id) {
        eliminarEntrenador(id);
    };

    function poblarPerfilEntrenador(entrenador) {
        perfilEntrenadorNombreCompleto.textContent = `${entrenador.nombre} ${entrenador.apellido}`;
        perfilEntrenadorID.textContent = entrenador.entrenadorID;
        perfilEspecialidad.textContent = entrenador.especialidad;
        perfilNombre.textContent = entrenador.nombre;
        perfilApellido.textContent = entrenador.apellido;
        perfilTelefono.textContent = entrenador.telefono;
        perfilCorreo.textContent = entrenador.correo;
        perfilFechaContratacion.textContent = formatearFecha(entrenador.fechaContratacion);
        perfilEstado.textContent = entrenador.activo ? 'Activo' : 'Inactivo';
    }

    function prepararEdicionEntrenador() {
        if (entrenadorActual) {
            prepararEdicionEntrenadorConDatos(entrenadorActual);
        }
    }

    function prepararEdicionEntrenadorConDatos(entrenador) {
        // Llenar el formulario con los datos del entrenador
        document.getElementById('nombre').value = entrenador.nombre;
        document.getElementById('apellido').value = entrenador.apellido;
        document.getElementById('especialidad').value = entrenador.especialidad;
        document.getElementById('telefono').value = entrenador.telefono;
        document.getElementById('correo').value = entrenador.correo;

        // Cambiar el estado del formulario
        formularioEntrenador.dataset.editingId = entrenador.entrenadorID;
        document.querySelector('#seccionRegistrarEntrenador legend').textContent = "Editar Datos del Entrenador";
        document.getElementById('textoBotonSubmit').textContent = "Actualizar Entrenador";

        mostrarSeccion(seccionRegistrarEntrenador);
    }

    // --- INICIALIZACIÓN ---
    configurarPestañasPerfil();
    cargarEntrenadores();
    mostrarSeccion(seccionListaEntrenadores);
});
