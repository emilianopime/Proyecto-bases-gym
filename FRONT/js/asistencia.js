// ==========================================================================
// Variables globales
// ==========================================================================
let clasesDelDia = [];
let historialAsistencias = [];
let clienteSeleccionado = null;
let claseSeleccionada = null;
let asistenciaAEliminar = null;

// ==========================================================================
// Inicialización
// ==========================================================================
document.addEventListener('DOMContentLoaded', function() {
    inicializarEventListeners();
    configurarFechaActual();
    cargarEstadisticas();
    cargarClasesDelDia();
});

// ==========================================================================
// Event Listeners
// ==========================================================================
function inicializarEventListeners() {
    // Controles de fecha y actualización
    document.getElementById('fechaSelector').addEventListener('change', cargarClasesDelDia);
    document.getElementById('btnActualizarClases').addEventListener('click', cargarClasesDelDia);
    document.getElementById('btnVerHistorial').addEventListener('click', toggleHistorial);

    // Modal de asistencia
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModalAsistencia);
    document.getElementById('btnCancelarAsistencia').addEventListener('click', cerrarModalAsistencia);
    document.getElementById('btnGuardarAsistencia').addEventListener('click', guardarAsistencia);

    // Búsqueda de clientes
    document.getElementById('buscarCliente').addEventListener('input', buscarClientes);
    document.getElementById('btnCambiarCliente').addEventListener('click', cambiarCliente);

    // Modal de confirmación de eliminación
    document.getElementById('btnCancelDelete').addEventListener('click', cerrarModalEliminar);
    document.getElementById('btnConfirmDelete').addEventListener('click', confirmarEliminar);

    // Filtros de historial
    document.getElementById('searchHistorial').addEventListener('input', filtrarHistorial);
    document.getElementById('filtroAsistencia').addEventListener('change', filtrarHistorial);

    // Cerrar modales al hacer clic fuera
    document.getElementById('modalAsistencia').addEventListener('click', function(e) {
        if (e.target === this) cerrarModalAsistencia();
    });

    document.getElementById('deleteModal').addEventListener('click', function(e) {
        if (e.target === this) cerrarModalEliminar();
    });
}

function configurarFechaActual() {
    const fechaSelector = document.getElementById('fechaSelector');
    const hoy = new Date().toISOString().split('T')[0];
    fechaSelector.value = hoy;
}

// ==========================================================================
// Funciones de carga de datos
// ==========================================================================
async function cargarEstadisticas() {
    try {
        const response = await fetch('/api/asistencias/estadisticas');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        const estadisticas = await response.json();
        
        document.getElementById('totalAsistencias').textContent = estadisticas.totalAsistencias || 0;
        document.getElementById('porcentajeAsistencia').textContent = `${estadisticas.porcentajeAsistencia || 0}%`;
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        mostrarNotificacion('Error al cargar estadísticas', 'error');
    }
}

async function cargarClasesDelDia() {
    const fechaSelector = document.getElementById('fechaSelector');
    const fecha = fechaSelector.value;
    
    mostrarCargando(true);
    
    try {
        const response = await fetch(`/api/asistencias/clases-del-dia?fecha=${fecha}`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        clasesDelDia = await response.json();
        
        // Actualizar estadística de clases activas
        document.getElementById('clasesActivas').textContent = clasesDelDia.length;
        
        renderizarClases();
        
    } catch (error) {
        console.error('Error al cargar clases:', error);
        mostrarNotificacion('Error al cargar las clases del día', 'error');
        mostrarEstadoVacio(true);
    } finally {
        mostrarCargando(false);
    }
}

async function cargarHistorial() {
    try {
        const response = await fetch('/api/asistencias');
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        historialAsistencias = await response.json();
        renderizarHistorial();
        
    } catch (error) {
        console.error('Error al cargar historial:', error);
        mostrarNotificacion('Error al cargar el historial de asistencias', 'error');
    }
}

// ==========================================================================
// Funciones de renderizado
// ==========================================================================
function renderizarClases() {
    const clasesGrid = document.getElementById('clasesGrid');
    
    if (clasesDelDia.length === 0) {
        mostrarEstadoVacio(true);
        return;
    }
    
    mostrarEstadoVacio(false);
    
    clasesGrid.innerHTML = clasesDelDia.map(clase => `
        <div class="class-card" data-clase-id="${clase.claseId}">
            <div class="class-header">
                <div class="class-info">
                    <h3>${clase.nombre}</h3>
                    <div class="class-time">
                        <i class="fas fa-clock"></i>
                        ${clase.horaInicio} - ${calcularHoraFin(clase.horaInicio, clase.duracionMinutos)}
                    </div>
                </div>
                <div class="capacity-badge">
                    ${clase.asistentesRegistrados}/${clase.capacidadMaxima}
                </div>
            </div>
            
            <div class="class-details">
                <div class="detail-row">
                    <i class="fas fa-user-tie"></i>
                    <span>${clase.nombreEntrenador || 'Sin asignar'}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-signal"></i>
                    <span>${clase.nivelDificultad}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-calendar-day"></i>
                    <span>${clase.diaSemana}</span>
                </div>
                <div class="detail-row">
                    <i class="fas fa-clock"></i>
                    <span>${clase.duracionMinutos} minutos</span>
                </div>
                ${clase.descripcion ? `
                    <div class="detail-row">
                        <i class="fas fa-info-circle"></i>
                        <span>${clase.descripcion}</span>
                    </div>
                ` : ''}
            </div>
            
            <div class="class-actions">
                <button class="btn-check-in" onclick="abrirModalAsistencia(${clase.claseId})">
                    <i class="fas fa-user-plus"></i>
                    Check-in Cliente
                </button>
                <button class="btn-details" onclick="verDetallesClase(${clase.claseId})">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function renderizarHistorial() {
    const tbody = document.querySelector('#tablaHistorial tbody');
    
    tbody.innerHTML = historialAsistencias.map(asistencia => `
        <tr>
            <td>${formatearFecha(asistencia.fechaAsistencia)}</td>
            <td>${asistencia.nombreCliente}</td>
            <td>${asistencia.nombreClase}</td>
            <td>${asistencia.horaCheckIn || 'No registrada'}</td>
            <td>
                <span class="status-badge ${asistencia.asistio ? 'status-presente' : 'status-ausente'}">
                    <i class="fas ${asistencia.asistio ? 'fa-check' : 'fa-times'}"></i>
                    ${asistencia.asistio ? 'Presente' : 'Ausente'}
                </span>
            </td>
            <td>
                <button class="btn-link" onclick="editarAsistencia(${asistencia.asistenciaId})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-link" onclick="eliminarAsistencia(${asistencia.asistenciaId})" style="color: #ff4757;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ==========================================================================
// Funciones de modal de asistencia
// ==========================================================================
function abrirModalAsistencia(claseId) {
    claseSeleccionada = clasesDelDia.find(c => c.claseId === claseId);
    
    if (!claseSeleccionada) {
        mostrarNotificacion('Clase no encontrada', 'error');
        return;
    }
    
    // Llenar información de la clase
    document.getElementById('claseNombre').textContent = claseSeleccionada.nombre;
    document.getElementById('claseDetalles').textContent = 
        `${claseSeleccionada.diaSemana} - ${claseSeleccionada.horaInicio} | ${claseSeleccionada.nombreEntrenador || 'Sin entrenador'}`;
    
    document.getElementById('claseIdModal').value = claseId;
    document.getElementById('fechaAsistenciaModal').value = document.getElementById('fechaSelector').value;
    
    // Configurar hora actual como hora de check-in por defecto
    const ahora = new Date();
    const horaActual = `${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
    document.getElementById('horaCheckIn').value = horaActual;
    
    // Limpiar cliente seleccionado
    clienteSeleccionado = null;
    document.getElementById('buscarCliente').value = '';
    document.getElementById('clienteSeleccionado').classList.add('hidden');
    document.getElementById('buscarCliente').closest('.form-group').classList.remove('hidden');
    
    document.getElementById('modalAsistencia').classList.remove('hidden');
}

function cerrarModalAsistencia() {
    document.getElementById('modalAsistencia').classList.add('hidden');
    limpiarBusquedaClientes();
}

// ==========================================================================
// Funciones de búsqueda de clientes
// ==========================================================================
async function buscarClientes() {
    const termino = document.getElementById('buscarCliente').value.trim();
    const sugerenciasDiv = document.getElementById('clientesSugerencias');
    
    if (termino.length < 2) {
        sugerenciasDiv.innerHTML = '';
        return;
    }
    
    try {
        const response = await fetch(`/api/asistencias/buscar-clientes?termino=${encodeURIComponent(termino)}`);
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        
        const clientes = await response.json();
        
        sugerenciasDiv.innerHTML = clientes.map(cliente => `
            <div class="sugerencia-item" onclick="seleccionarCliente(${JSON.stringify(cliente).replace(/"/g, '&quot;')})">
                <div class="sugerencia-nombre">${cliente.nombreCompleto}</div>
                <div class="sugerencia-detalles">
                    ID: ${cliente.clienteId} | Membresía: ${cliente.estadoMembresia}
                    ${cliente.telefono ? ` | Tel: ${cliente.telefono}` : ''}
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error al buscar clientes:', error);
        mostrarNotificacion('Error al buscar clientes', 'error');
    }
}

function seleccionarCliente(cliente) {
    clienteSeleccionado = cliente;
    
    document.getElementById('clienteNombre').textContent = cliente.nombreCompleto;
    document.getElementById('clienteDetalles').textContent = 
        `ID: ${cliente.clienteId} ${cliente.telefono ? `| Tel: ${cliente.telefono}` : ''}`;
    
    const membresiaSpan = document.getElementById('clienteMembresia');
    membresiaSpan.textContent = cliente.estadoMembresia;
    membresiaSpan.className = `membership-badge ${cliente.estadoMembresia === 'Activa' ? 'membership-active' : 'membership-inactive'}`;
    
    // Mostrar cliente seleccionado y ocultar búsqueda
    document.getElementById('clienteSeleccionado').classList.remove('hidden');
    document.getElementById('buscarCliente').closest('.form-group').classList.add('hidden');
    limpiarBusquedaClientes();
}

function cambiarCliente() {
    clienteSeleccionado = null;
    document.getElementById('buscarCliente').value = '';
    document.getElementById('clienteSeleccionado').classList.add('hidden');
    document.getElementById('buscarCliente').closest('.form-group').classList.remove('hidden');
    document.getElementById('buscarCliente').focus();
}

function limpiarBusquedaClientes() {
    document.getElementById('clientesSugerencias').innerHTML = '';
}

// ==========================================================================
// Funciones de registro de asistencia
// ==========================================================================
async function guardarAsistencia() {
    if (!clienteSeleccionado) {
        mostrarNotificacion('Debe seleccionar un cliente', 'error');
        return;
    }
    
    const datos = {
        clienteId: clienteSeleccionado.clienteId,
        claseId: document.getElementById('claseIdModal').value,
        fechaAsistencia: document.getElementById('fechaAsistenciaModal').value,
        horaCheckIn: document.getElementById('horaCheckIn').value || null,
        asistio: document.getElementById('asistioDef').checked
    };
    
    // Verificar membresía activa si marca asistencia
    if (datos.asistio && clienteSeleccionado.estadoMembresia !== 'Activa') {
        const confirmar = confirm(
            'El cliente no tiene una membresía activa. ¿Desea continuar registrando la asistencia?'
        );
        if (!confirmar) return;
    }
    
    try {
        const response = await fetch('/api/asistencias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        
        const resultado = await response.json();
        
        if (!response.ok) {
            throw new Error(resultado.error || 'Error al registrar asistencia');
        }
        
        mostrarNotificacion('Asistencia registrada exitosamente', 'success');
        cerrarModalAsistencia();
        cargarClasesDelDia();
        cargarEstadisticas();
        
    } catch (error) {
        console.error('Error al guardar asistencia:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ==========================================================================
// Funciones de historial
// ==========================================================================
function toggleHistorial() {
    const historialSection = document.getElementById('historialSection');
    const isHidden = historialSection.classList.contains('hidden');
    
    if (isHidden) {
        historialSection.classList.remove('hidden');
        cargarHistorial();
        document.getElementById('btnVerHistorial').innerHTML = 
            '<i class="fas fa-times"></i> Ocultar Historial';
    } else {
        historialSection.classList.add('hidden');
        document.getElementById('btnVerHistorial').innerHTML = 
            '<i class="fas fa-history"></i> Ver Historial';
    }
}

function filtrarHistorial() {
    const busqueda = document.getElementById('searchHistorial').value.toLowerCase();
    const filtroAsistencia = document.getElementById('filtroAsistencia').value;
    
    const filas = document.querySelectorAll('#tablaHistorial tbody tr');
    
    filas.forEach(fila => {
        const textoFila = fila.textContent.toLowerCase();
        const cumpleBusqueda = busqueda === '' || textoFila.includes(busqueda);
        
        let cumpleFiltro = true;
        if (filtroAsistencia !== '') {
            const esPresente = fila.querySelector('.status-presente') !== null;
            cumpleFiltro = (filtroAsistencia === '1' && esPresente) || 
                          (filtroAsistencia === '0' && !esPresente);
        }
        
        fila.style.display = (cumpleBusqueda && cumpleFiltro) ? '' : 'none';
    });
}

// ==========================================================================
// Funciones de eliminación
// ==========================================================================
function eliminarAsistencia(asistenciaId) {
    asistenciaAEliminar = asistenciaId;
    document.getElementById('deleteModal').classList.remove('hidden');
}

function cerrarModalEliminar() {
    document.getElementById('deleteModal').classList.add('hidden');
    asistenciaAEliminar = null;
}

async function confirmarEliminar() {
    if (!asistenciaAEliminar) return;
    
    try {
        const response = await fetch(`/api/asistencias/${asistenciaAEliminar}`, {
            method: 'DELETE'
        });
        
        const resultado = await response.json();
        
        if (!response.ok) {
            throw new Error(resultado.error || 'Error al eliminar asistencia');
        }
        
        mostrarNotificacion('Registro eliminado exitosamente', 'success');
        cerrarModalEliminar();
        cargarHistorial();
        cargarClasesDelDia();
        cargarEstadisticas();
        
    } catch (error) {
        console.error('Error al eliminar asistencia:', error);
        mostrarNotificacion(error.message, 'error');
    }
}

// ==========================================================================
// Funciones auxiliares
// ==========================================================================
function mostrarCargando(mostrar) {
    const spinner = document.getElementById('loadingSpinner');
    const clasesGrid = document.getElementById('clasesGrid');
    
    if (mostrar) {
        spinner.classList.remove('hidden');
        clasesGrid.classList.add('hidden');
    } else {
        spinner.classList.add('hidden');
        clasesGrid.classList.remove('hidden');
    }
}

function mostrarEstadoVacio(mostrar) {
    const emptyState = document.getElementById('emptyState');
    const clasesGrid = document.getElementById('clasesGrid');
    
    if (mostrar) {
        emptyState.classList.remove('hidden');
        clasesGrid.classList.add('hidden');
    } else {
        emptyState.classList.add('hidden');
        clasesGrid.classList.remove('hidden');
    }
}

function calcularHoraFin(horaInicio, duracionMinutos) {
    const [horas, minutos] = horaInicio.split(':').map(Number);
    const fechaInicio = new Date();
    fechaInicio.setHours(horas, minutos, 0, 0);
    
    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60000);
    
    return `${fechaFin.getHours().toString().padStart(2, '0')}:${fechaFin.getMinutes().toString().padStart(2, '0')}`;
}

function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function verDetallesClase(claseId) {
    abrirModalAsistencia(claseId);
}

function editarAsistencia(asistenciaId) {
    mostrarNotificacion('Funcionalidad de edición en desarrollo', 'info');
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `notification notification-${tipo}`;
    notificacion.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getIconoNotificacion(tipo)}"></i>
            <span>${mensaje}</span>
        </div>
    `;
    
    // Agregar estilos
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 2rem;
                right: 2rem;
                background: rgba(24, 24, 27, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                padding: 1.5rem;
                color: #ffffff;
                z-index: 10000;
                backdrop-filter: blur(20px);
                animation: slideIn 0.3s ease;
                max-width: 400px;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            .notification-success { border-left: 4px solid #2ed573; }
            .notification-error { border-left: 4px solid #ff4757; }
            .notification-info { border-left: 4px solid #3742fa; }
            
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Agregar al DOM
    document.body.appendChild(notificacion);
    
    // Eliminar
    setTimeout(() => {
        notificacion.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => {
            if (notificacion.parentNode) {
                notificacion.parentNode.removeChild(notificacion);
            }
        }, 300);
    }, 4000);
}

function getIconoNotificacion(tipo) {
    switch (tipo) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}
