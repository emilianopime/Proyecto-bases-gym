// filepath: c:\\Users\\Emi\\Documents\\GitHub\\Proyecto-bases-gym\\FRONT\\js\\membresias.js
document.addEventListener('DOMContentLoaded', function() {
    const apiUrl = '/api/membresias';
    const tablaMembresias = document.getElementById('cuerpoTablaMembresias');
    const formularioMembresia = document.getElementById('formulario-membresia');
    const btnMostrarFormulario = document.getElementById('btnMostrarFormularioRegistroMembresia');
    const btnCancelar = document.getElementById('btnCancelarRegistroMembresia');
    const seccionFormulario = document.getElementById('seccionRegistrarMembresia');
    const seccionLista = document.getElementById('seccionListaMembresias');
    const leyendaFormulario = document.querySelector('#seccionRegistrarMembresia legend');
    const submitButton = formularioMembresia ? formularioMembresia.querySelector('.btn-submit') : null;

    let editandoId = null;

    function mostrarSeccion(seccion) {
        seccionFormulario.style.display = 'none';
        seccionLista.style.display = 'none';
        if (seccion === 'formulario') {
            seccionFormulario.style.display = 'block';
        } else {
            seccionLista.style.display = 'block';
        }
    }    async function cargarMembresias() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const membresias = await response.json();
            renderizarTabla(membresias);
        } catch (error) {
            console.error('Error al cargar membresías:', error);
            if(tablaMembresias) tablaMembresias.innerHTML = '<tr><td colspan="7">Error al cargar membresías.</td></tr>';
        }
    }

    // Función para cargar membresías en ambas vistas (tabla y tarjetas)
    async function cargarMembresiasCompleto() {
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const membresias = await response.json();
            renderizarTabla(membresias);
            renderizarTarjetas(membresias);
        } catch (error) {
            console.error('Error al cargar membresías:', error);
            if(tablaMembresias) tablaMembresias.innerHTML = '<tr><td colspan="7">Error al cargar membresías.</td></tr>';
        }
    }

    function renderizarTabla(membresias) {
        if (!tablaMembresias) return;
        tablaMembresias.innerHTML = '';
        if (!membresias || membresias.length === 0) {
            tablaMembresias.innerHTML = '<tr><td colspan="7">No hay tipos de membresía registrados.</td></tr>';
            return;
        }

        membresias.forEach(m => {
            const fila = tablaMembresias.insertRow();
            fila.innerHTML = `
                <td>${m.membresiaID}</td>
                <td>${m.nombre}</td>
                <td>${m.descripcion || 'N/A'}</td>
                <td>${typeof m.precio === 'number' ? m.precio.toFixed(2) : 'N/A'}</td>
                <td>${m.duracionDias} días</td>
                <td>${m.accesoPiscina ? 'Sí' : 'No'}</td>
                <td>${m.accesoClases ? 'Sí' : 'No'}</td>
                <td>
                    <button class="btn-accion-tabla btn-editar-membresia" data-id="${m.membresiaID}"><i class="fas fa-edit"></i></button>
                    <button class="btn-accion-tabla btn-eliminar-membresia" data-id="${m.membresiaID}"><i class="fas fa-trash"></i></button>
                </td>
            `;
        });
        agregarListenersBotonesAccion();
    }

    function agregarListenersBotonesAccion() {
        document.querySelectorAll('.btn-editar-membresia').forEach(btn => {
            btn.addEventListener('click', () => prepararEdicion(btn.dataset.id));
        });
        document.querySelectorAll('.btn-eliminar-membresia').forEach(btn => {
            btn.addEventListener('click', () => eliminarMembresia(btn.dataset.id));
        });
    }

    if (btnMostrarFormulario) {
        btnMostrarFormulario.addEventListener('click', () => {
            editandoId = null;
            formularioMembresia.reset();
            if(leyendaFormulario) leyendaFormulario.textContent = 'Nueva Membresía';
            if(submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Membresía';
            mostrarSeccion('formulario');
        });
    }

    if (btnCancelar) {
        btnCancelar.addEventListener('click', () => {
            formularioMembresia.reset();
            editandoId = null;
            mostrarSeccion('lista');
        });
    }

    if (formularioMembresia) {
        formularioMembresia.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(formularioMembresia);
            const datosMembresia = {
                nombre: formData.get('nombreMembresia'),
                descripcion: formData.get('descripcionMembresia'),
                precio: parseFloat(formData.get('precioMembresia')),
                duracionDias: parseInt(formData.get('duracionMembresia')),
                accesoPiscina: formData.get('accesoPiscinaMembresia') === 'on',
                accesoClases: formData.get('accesoClasesMembresia') === 'on'
            };

            const url = editandoId ? `${apiUrl}/${editandoId}` : apiUrl;
            const method = editandoId ? 'PUT' : 'POST';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosMembresia)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Error ${response.status}`);
                }                alert(`Membresía ${editandoId ? 'actualizada' : 'creada'} con éxito.`);
                formularioMembresia.reset();
                editandoId = null;
                cargarMembresiasCompleto();
                mostrarSeccion('lista');
            } catch (error) {
                console.error('Error al guardar membresía:', error);
                alert(`Error al guardar membresía: ${error.message}`);
            }
        });
    }

    async function prepararEdicion(id) {
        try {
            const response = await fetch(`${apiUrl}/${id}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const membresia = await response.json();
            
            if(formularioMembresia){
                formularioMembresia.elements['nombreMembresia'].value = membresia.nombre;
                formularioMembresia.elements['descripcionMembresia'].value = membresia.descripcion || '';
                formularioMembresia.elements['precioMembresia'].value = membresia.precio;
                formularioMembresia.elements['duracionMembresia'].value = membresia.duracionDias;
                formularioMembresia.elements['accesoPiscinaMembresia'].checked = !!membresia.accesoPiscina;
                formularioMembresia.elements['accesoClasesMembresia'].checked = !!membresia.accesoClases;
            }

            editandoId = id;
            if(leyendaFormulario) leyendaFormulario.textContent = 'Editar Membresía';
            if(submitButton) submitButton.innerHTML = '<i class="fas fa-save"></i> Actualizar Membresía';
            mostrarSeccion('formulario');
        } catch (error) {
            console.error(`Error al cargar membresía ${id} para edición:`, error);
            alert('Error al cargar datos para editar.');
        }
    }

    async function eliminarMembresia(id) {
        if (!confirm('¿Estás seguro de que deseas eliminar este tipo de membresía?')) return;

        try {
            const response = await fetch(`${apiUrl}/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error ${response.status}`);            }
            alert('Membresía eliminada con éxito.');
            cargarMembresiasCompleto();
        } catch (error) {
            console.error(`Error al eliminar membresía ${id}:`, error);
            alert(`Error al eliminar membresía: ${error.message}`);
        }
    }

    // Función para cargar estadísticas
    async function cargarEstadisticas() {
        try {
            const response = await fetch('/api/membresias/estadisticas/resumen');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const stats = await response.json();
            renderizarEstadisticas(stats);
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    }

    function renderizarEstadisticas(stats) {
        const contenedorStats = document.getElementById('estadisticas-membresias');
        if (!contenedorStats) return;

        contenedorStats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-list-alt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.resumen.totalTipos}</h3>
                        <p>Tipos de Membresía</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${stats.resumen.precioPromedio || 0}</h3>
                        <p>Precio Promedio</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-swimming-pool"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.accesos.conPiscina}</h3>
                        <p>Con Acceso a Piscina</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-dumbbell"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.accesos.conClases}</h3>
                        <p>Con Acceso a Clases</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Función para alternar entre vista de tabla y tarjetas
    function toggleVista() {
        const btnTarjetas = document.getElementById('btnVistaTarjetas');
        const btnTabla = document.getElementById('btnVistaTabla');
        const contenedorTabla = document.querySelector('.tabla-responsive');
        const contenedorTarjetas = document.getElementById('contenedor-tarjetas');

        if (btnTarjetas && btnTabla && contenedorTabla && contenedorTarjetas) {
            btnTarjetas.addEventListener('click', () => {
                contenedorTabla.style.display = 'none';
                contenedorTarjetas.style.display = 'grid';
                btnTarjetas.classList.add('activo');
                btnTabla.classList.remove('activo');
            });

            btnTabla.addEventListener('click', () => {
                contenedorTabla.style.display = 'block';
                contenedorTarjetas.style.display = 'none';
                btnTabla.classList.add('activo');
                btnTarjetas.classList.remove('activo');
            });
        }
    }

    // Función para renderizar vista de tarjetas
    function renderizarTarjetas(membresias) {
        const contenedorTarjetas = document.getElementById('contenedor-tarjetas');
        if (!contenedorTarjetas) return;

        contenedorTarjetas.innerHTML = '';
        if (!membresias || membresias.length === 0) {
            contenedorTarjetas.innerHTML = '<p class="no-data">No hay tipos de membresía registrados.</p>';
            return;
        }

        membresias.forEach(m => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-membresia';
            tarjeta.innerHTML = `
                <div class="tarjeta-header">
                    <h3>${m.nombre}</h3>
                    <div class="tarjeta-precio">$${typeof m.precio === 'number' ? m.precio.toFixed(2) : 'N/A'}</div>
                </div>
                <div class="tarjeta-body">
                    <p class="descripcion">${m.descripcion || 'Sin descripción'}</p>
                    <div class="caracteristicas">
                        <div class="caracteristica">
                            <i class="fas fa-calendar-day"></i>
                            <span>${m.duracionDias} días</span>
                        </div>
                        <div class="caracteristica ${m.accesoPiscina ? 'activa' : 'inactiva'}">
                            <i class="fas fa-swimming-pool"></i>
                            <span>Piscina</span>
                        </div>
                        <div class="caracteristica ${m.accesoClases ? 'activa' : 'inactiva'}">
                            <i class="fas fa-dumbbell"></i>
                            <span>Clases</span>
                        </div>
                    </div>
                </div>
                <div class="tarjeta-footer">
                    <button class="btn-tarjeta btn-editar" data-id="${m.membresiaID}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn-tarjeta btn-eliminar" data-id="${m.membresiaID}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            `;
            contenedorTarjetas.appendChild(tarjeta);
        });

        // Agregar listeners a los botones de las tarjetas
        contenedorTarjetas.querySelectorAll('.btn-editar').forEach(btn => {
            btn.addEventListener('click', () => prepararEdicion(btn.dataset.id));
        });
        contenedorTarjetas.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.addEventListener('click', () => eliminarMembresia(btn.dataset.id));
        });
    }

    // Función de búsqueda en tiempo real
    function configurarBusqueda() {
        const inputBusqueda = document.getElementById('busqueda-membresias');
        if (!inputBusqueda) return;

        let membresiasCargadas = [];

        // Guardar la referencia a todas las membresías
        const cargarMembresiasBusqueda = async () => {
            try {
                const response = await fetch(apiUrl);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                membresiasCargadas = await response.json();
            } catch (error) {
                console.error('Error al cargar membresías para búsqueda:', error);
            }
        };

        inputBusqueda.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase();
            const membresiasFiltradas = membresiasCargadas.filter(m => 
                m.nombre.toLowerCase().includes(termino) ||
                (m.descripcion && m.descripcion.toLowerCase().includes(termino))
            );

            renderizarTabla(membresiasFiltradas);
            renderizarTarjetas(membresiasFiltradas);
        });        cargarMembresiasBusqueda();
    }

    // Inicializar todo
    cargarMembresiasCompleto();
    cargarEstadisticas();
    toggleVista();
    configurarBusqueda();
});
