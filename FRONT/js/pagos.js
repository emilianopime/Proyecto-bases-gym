document.addEventListener('DOMContentLoaded', function() {    // === ELEMENTOS DEL DOM ===
    const btnRegistrarPago = document.getElementById('btnRegistrarPago');
    const btnFirstPayment = document.getElementById('btnFirstPayment');
    const btnCancelarPago = document.getElementById('btnCancelarPago');
    const btnVistaTabla = document.getElementById('btnVistaTabla');
    const btnVistaTarjetas = document.getElementById('btnVistaTarjetas');
    
    const seccionListaPagos = document.getElementById('seccionListaPagos');
    const seccionFormularioPago = document.getElementById('seccionFormularioPago');
    
    // Validar elementos
    if (!seccionListaPagos) {
        console.error('CRITICAL ERROR: seccionListaPagos not found');
        return;
    }
    if (!seccionFormularioPago) {
        console.error('CRITICAL ERROR: seccionFormularioPago not found');
        return;
    }
    if (!btnRegistrarPago) {
        console.error('CRITICAL ERROR: btnRegistrarPago not found');
        return;
    }
    
    const formularioPago = document.getElementById('formulario-pago');
    const tablaPagos = document.getElementById('tablaPagos');
    const contenedorTarjetas = document.getElementById('contenedor-tarjetas');
    const vistaTabla = document.getElementById('vista-tabla');
    const vistaTarjetas = document.getElementById('vista-tarjetas');
    
    const loadingPagos = document.getElementById('loading-pagos');
    const emptyStatePagos = document.getElementById('empty-state-pagos');
    const buscarPagos = document.getElementById('buscarPagos');
    
    // Elementos del formulario
    const buscarCliente = document.getElementById('buscarCliente');
    const listaClientes = document.getElementById('lista-clientes');
    const clienteSeleccionado = document.getElementById('cliente-seleccionado');
    const btnCambiarCliente = document.getElementById('btnCambiarCliente');
    const membresiaSelect = document.getElementById('membresiaSelect');
    const montoPagar = document.getElementById('montoPagar');
    const tipoPago = document.getElementById('tipoPago');
    const fechaPago = document.getElementById('fechaPago');
    const fechaInicio = document.getElementById('fechaInicio');
    
    // Elementos informativos
    const clienteNombre = document.getElementById('clienteNombre');
    const clienteDetalles = document.getElementById('clienteDetalles');
    const clienteMembresia = document.getElementById('clienteMembresia');
    const precioMembresia = document.getElementById('precio-membresia');
    const formLegend = document.getElementById('form-legend');
    
    // Modales
    const modalConfirmacion = document.getElementById('modal-confirmacion');
    const modalDetallePago = document.getElementById('modal-detalle-pago');
    const btnConfirmar = document.getElementById('btnConfirmar');
    const btnCancelarModal = document.getElementById('btnCancelarModal');
    const mensajeConfirmacion = document.getElementById('mensaje-confirmacion');
    
    // === VARIABLES GLOBALES ===
    let pagosData = [];
    let pagosFiltrados = [];
    let clienteActual = null;
    let editandoPago = null;
    let timeoutBusqueda = null;

    // === FUNCIONES DE UI HELPERS ===
    function mostrarCargando(mostrar) {
        if (loadingPagos) {
            loadingPagos.style.display = mostrar ? 'flex' : 'none';
        }
    }

    function mostrarEstadoVacio(mostrar) {
        if (emptyStatePagos) {
            emptyStatePagos.style.display = mostrar ? 'flex' : 'none';
        }
    }

    function mostrarError(mensaje) {
        console.error(mensaje);
        alert(mensaje);
    }

    function mostrarExito(mensaje) {
        console.log(mensaje);
        alert(mensaje);
    }

    function formatearFecha(fechaISO) {
        if (!fechaISO) return 'N/A';
        try {
            const fecha = new Date(fechaISO);
            const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
            const correctedDate = new Date(fecha.getTime() + userTimezoneOffset);
            
            const dia = String(correctedDate.getDate()).padStart(2, '0');
            const mes = String(correctedDate.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
            const anio = correctedDate.getFullYear();
            return `${dia}/${mes}/${anio}`;
        } catch (e) {
            console.error("Error formateando fecha:", fechaISO, e);
            return 'Fecha inválida';
        }
    }

    function formatearPeriodo(fechaInicioISO, fechaFinISO) {
        if (!fechaInicioISO || !fechaFinISO) return 'N/A';
        return `${formatearFecha(fechaInicioISO)} - ${formatearFecha(fechaFinISO)}`;
    }    
    // === FUNCIONES DE NAVEGACIÓN ===
    function mostrarSeccion(seccion) {
        console.log(`Mostrando sección: ${seccion}`);
        
        try {
            // Método 1: Usar clases
            seccionListaPagos.classList.add('hidden');
            seccionFormularioPago.classList.add('hidden');
            
            // Método 2: Usar estilos inline como respaldo
            seccionListaPagos.style.display = 'none';
            seccionFormularioPago.style.display = 'none';
            
            // Mostrar la sección solicitada
            if (seccion === 'lista') {
                seccionListaPagos.classList.remove('hidden');
                seccionListaPagos.style.display = 'block';
                console.log('Sección lista mostrada');
            } else if (seccion === 'formulario') {
                seccionFormularioPago.classList.remove('hidden');
                seccionFormularioPago.style.display = 'block';
                console.log('Sección formulario mostrada');
            }
            
            // Verificar el estado final
            console.log('Estado final - Lista display:', window.getComputedStyle(seccionListaPagos).display);
            console.log('Estado final - Formulario display:', window.getComputedStyle(seccionFormularioPago).display);
            
        } catch (error) {
            console.error('Error en mostrarSeccion:', error);
        }
    }
    
    function toggleVista() {
        const esTabla = btnVistaTabla.classList.contains('active');
        
        if (esTabla) {
            vistaTabla.style.display = 'block';
            vistaTarjetas.style.display = 'none';
        } else {
            vistaTabla.style.display = 'none';
            vistaTarjetas.style.display = 'block';
        }
    }
    
    // === FUNCIONES DE CARGA DE DATOS ===
    async function cargarPagos() {
        try {
            mostrarCargando(true);
            const response = await fetch('/api/pagos');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            pagosData = await response.json();
            pagosFiltrados = [...pagosData];
            
            if (pagosData.length === 0) {
                mostrarEstadoVacio(true);
            } else {
                mostrarEstadoVacio(false);
                renderizarPagos();
            }
            
            cargarEstadisticas();
            
        } catch (error) {
            console.error('Error al cargar pagos:', error);
            mostrarError('Error al cargar los pagos. Por favor, intente nuevamente.');
        } finally {
            mostrarCargando(false);
        }
    }
    
    async function cargarEstadisticas() {
        try {
            const response = await fetch('/api/pagos/estadisticas');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const stats = await response.json();
            renderizarEstadisticas(stats);
            
        } catch (error) {
            console.error('Error al cargar estadísticas:', error);
        }
    }
    
    async function cargarTiposPago() {
        try {
            const response = await fetch('/api/pagos/tipos-pago');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const tipos = await response.json();
            poblarSelectTiposPago(tipos);
            
        } catch (error) {
            console.error('Error al cargar tipos de pago:', error);
        }
    }
    
    async function cargarMembresiasDisponibles() {
        try {
            const response = await fetch('/api/pagos/membresias-disponibles');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const membresias = await response.json();
            poblarSelectMembresias(membresias);
            
        } catch (error) {
            console.error('Error al cargar membresías:', error);
        }
    }
    
    // === FUNCIONES DE RENDERIZADO ===
    function renderizarEstadisticas(stats) {
        const container = document.getElementById('stats-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.totalPagos || 0}</h3>
                        <p>Total Pagos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${(stats.totalRecaudado || 0).toFixed(2)}</h3>
                        <p>Total Recaudado</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.pagosPendientes || 0}</h3>
                        <p>Pagos Pendientes</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="stat-info">
                        <h3>$${(stats.promedioMensual || 0).toFixed(2)}</h3>
                        <p>Promedio Mensual</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    function renderizarPagos() {
        renderizarTabla(pagosFiltrados);
        renderizarTarjetas(pagosFiltrados);
    }
    
    function renderizarTabla(pagos) {
        if (!tablaPagos) return;
        
        tablaPagos.innerHTML = '';
        
        if (pagos.length === 0) {
            tablaPagos.innerHTML = '<tr><td colspan="8" class="text-center">No se encontraron pagos</td></tr>';
            return;
        }
        
        pagos.forEach(pago => {
            const fila = document.createElement('tr');
            const esEditable = !(pago.estado === 'Activa' || pago.estado === 'Vencida' || pago.estado === 'Cancelada');
            fila.innerHTML = `
                <td>${pago.nombreCliente || 'N/A'}</td>
                <td>${pago.nombreMembresia || 'N/A'}</td>
                <td class="text-right">$${(pago.montoPagado || 0).toFixed(2)}</td>
                <td>
                    <span class="payment-status status-${(pago.estadoPago || '').toLowerCase().replace(' ', '')}">
                        ${pago.estadoPago || 'N/A'}
                    </span>
                </td>
                <td>${pago.tipoPago || 'N/A'}</td>
                <td>${formatearFecha(pago.fechaPago)}</td>
                <td>${formatearPeriodo(pago.fechaInicio, pago.fechaFin)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-table" onclick="verDetallePago(${pago.clienteMembresiaId})" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-table" onclick="editarPago(${pago.clienteMembresiaId})" title="Editar" ${!esEditable ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            `;
            tablaPagos.appendChild(fila);
        });
    }
    
    function renderizarTarjetas(pagos) {
        if (!contenedorTarjetas) return;
        
        contenedorTarjetas.innerHTML = '';
        
        if (pagos.length === 0) {
            contenedorTarjetas.innerHTML = '<p class="text-center" style="grid-column: 1 / -1;">No se encontraron pagos</p>';
            return;
        }
        
        pagos.forEach(pago => {
            const tarjeta = document.createElement('div');
            tarjeta.className = 'payment-card';
            const esEditable = !(pago.estado === 'Activa' || pago.estado === 'Vencida' || pago.estado === 'Cancelada');
            tarjeta.innerHTML = `
                <div class="card-header">
                    <h3>${pago.nombreCliente || 'Cliente N/A'}</h3>
                    <div class="payment-amount">$${(pago.montoPagado || 0).toFixed(2)}</div>
                </div>
                <div class="card-body">
                    <div class="card-info">
                        <div class="info-item">
                            <span class="info-label">Membresía:</span>
                            <span class="info-value">${pago.nombreMembresia || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Estado:</span>
                            <span class="payment-status status-${(pago.estadoPago || '').toLowerCase().replace(' ', '')}">
                                ${pago.estadoPago || 'N/A'}
                            </span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Método:</span>
                            <span class="info-value">${pago.tipoPago || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Fecha:</span>
                            <span class="info-value">${formatearFecha(pago.fechaPago)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Período:</span>
                            <span class="info-value">${formatearPeriodo(pago.fechaInicio, pago.fechaFin)}</span>
                        </div>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn-secondary" onclick="verDetallePago(${pago.clienteMembresiaId})">
                        <i class="fas fa-eye"></i> Ver Detalles
                    </button>
                    <button class="btn-primary" onclick="editarPago(${pago.clienteMembresiaId})" ${!esEditable ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </div>
            `;
            contenedorTarjetas.appendChild(tarjeta);
        });
    }
    
    // === FUNCIONES DE BÚSQUEDA ===
    function configurarBusqueda() {
        if (buscarPagos) {
            buscarPagos.addEventListener('input', function() {
                const filtro = this.value.toLowerCase().trim();
                
                if (filtro === '') {
                    pagosFiltrados = [...pagosData];
                } else {
                    pagosFiltrados = pagosData.filter(pago =>
                        (pago.nombreCliente || '').toLowerCase().includes(filtro) ||
                        (pago.nombreMembresia || '').toLowerCase().includes(filtro) ||
                        (pago.tipoPago || '').toLowerCase().includes(filtro) ||
                        (pago.estadoPago || '').toLowerCase().includes(filtro)
                    );
                }
                
                renderizarPagos();
            });
        }
    }
      async function buscarClientes(query) {
        if (!query || query.length < 2) {
            listaClientes.classList.add('hidden');
            return;
        }
        
        try {
            const response = await fetch(`/api/pagos/buscar-clientes?termino=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const clientes = await response.json();
            mostrarListaClientes(clientes);
            
        } catch (error) {
            console.error('Error al buscar clientes:', error);
            listaClientes.classList.add('hidden');
        }
    }
    
    function mostrarListaClientes(clientes) {
        listaClientes.innerHTML = '';
        
        if (clientes.length === 0) {
            listaClientes.innerHTML = '<div class="client-option">No se encontraron clientes</div>';
        } else {
            clientes.forEach(cliente => {
                const opcion = document.createElement('div');
                opcion.className = 'client-option';
                opcion.innerHTML = `
                    <div class="client-name">${cliente.nombreCompleto}</div>
                    <div class="client-details">ID: ${cliente.clienteId} | ${cliente.telefono || 'Sin teléfono'}</div>
                `;
                opcion.addEventListener('click', () => seleccionarCliente(cliente));
                listaClientes.appendChild(opcion);
            });
        }
        
        listaClientes.classList.remove('hidden');
    }
    
    function seleccionarCliente(cliente) {
        clienteActual = cliente;
        
        clienteNombre.textContent = cliente.nombreCompleto;
        clienteDetalles.textContent = `ID: ${cliente.clienteId} | ${cliente.telefono || 'Sin teléfono'}`;
        
        // Actualizar badge de membresía
        const membresiaSpan = clienteMembresia;
        membresiaSpan.textContent = cliente.estadoMembresia || 'Sin membresía';
        membresiaSpan.className = `membership-badge ${cliente.estadoMembresia === 'Activa' ? 'membership-active' : 'membership-inactive'}`;
        
        buscarCliente.style.display = 'none';
        clienteSeleccionado.classList.remove('hidden');
        listaClientes.classList.add('hidden');
    }
    
    // === FUNCIONES DEL FORMULARIO ===
    function poblarSelectTiposPago(tipos) {
        tipoPago.innerHTML = '<option value="">-- Seleccionar Método --</option>';
        
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.tipoPagoId;
            option.textContent = tipo.nombre;
            tipoPago.appendChild(option);
        });
    }
    
    function poblarSelectMembresias(membresias) {
        membresiaSelect.innerHTML = '<option value="">-- Seleccionar Membresía --</option>';
        
        membresias.forEach(membresia => {
            const option = document.createElement('option');
            option.value = membresia.membresiaId;
            option.textContent = `${membresia.nombre} - $${membresia.precio} (${membresia.duracionDias} días)`;
            option.dataset.precio = membresia.precio;
            membresiaSelect.appendChild(option);
        });
    }
    
    function limpiarFormulario() {
        formularioPago.reset();
        clienteActual = null;
        editandoPago = null;
        
        buscarCliente.style.display = 'block';
        clienteSeleccionado.classList.add('hidden');
        listaClientes.classList.add('hidden');
        precioMembresia.textContent = '0.00';
        
        formLegend.textContent = 'Registrar Nuevo Pago';
        
        // Establecer fecha actual
        const hoy = new Date().toISOString().split('T')[0];
        fechaPago.value = hoy;
        fechaInicio.value = hoy;
    }
    
    function configurarFormulario() {
        // Búsqueda de clientes
        buscarCliente.addEventListener('input', function() {
            clearTimeout(timeoutBusqueda);
            timeoutBusqueda = setTimeout(() => {
                buscarClientes(this.value);
            }, 300);
        });
        
        // Cambiar cliente seleccionado
        btnCambiarCliente.addEventListener('click', function() {
            buscarCliente.style.display = 'block';
            buscarCliente.value = '';
            clienteSeleccionado.classList.add('hidden');
            listaClientes.classList.add('hidden');
            clienteActual = null;
        });
        
        // Actualizar precio cuando se selecciona membresía
        membresiaSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            const precio = selectedOption.dataset.precio || '0';
            precioMembresia.textContent = parseFloat(precio).toFixed(2);
            
            if (precio && !montoPagar.value) {
                montoPagar.value = precio;
            }
        });
          // Validar formulario al enviar
        formularioPago.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!clienteActual) {
                mostrarError('Debe seleccionar un cliente');
                return;
            }
            
            const formData = new FormData(this);
            const pagoData = {
                clienteId: clienteActual.clienteId,
                membresiaId: formData.get('membresiaId'),
                montoPagado: parseFloat(formData.get('montoPagar')),
                tipoPagoId: formData.get('tipoPago'),
                fechaPago: formData.get('fechaPago'),
                fechaInicio: formData.get('fechaInicio'),
                notas: formData.get('notas') || null
            };
            

            console.log('Datos del pago a enviar:', pagoData);
            
            // Validaciones 
            if (!pagoData.membresiaId) {
                mostrarError('Debe seleccionar una membresía');
                return;
            }
            
            if (!pagoData.montoPagado || pagoData.montoPagado <= 0) {
                mostrarError('El monto debe ser mayor a cero');
                return;
            }
            
            if (!pagoData.tipoPagoId) {
                mostrarError('Debe seleccionar un método de pago');
                return;
            }
            
            try {
                let response;
                
                if (editandoPago) {
                    console.log('Actualizando pago ID:', editandoPago);
                    response = await fetch(`/api/pagos/${editandoPago}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(pagoData)
                    });
                } else {
                    console.log('Registrando nuevo pago');
                    response = await fetch('/api/pagos', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(pagoData)
                    });
                }
                
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Error del servidor:', errorData);
                    throw new Error(errorData.error || errorData.message || 'Error al procesar el pago');
                }
                
                const result = await response.json();
                console.log('Respuesta del servidor:', result);
                
                mostrarExito(editandoPago ? 'Pago actualizado correctamente' : 'Pago registrado correctamente');
                limpiarFormulario();
                mostrarSeccion('lista');
                cargarPagos();
                
            } catch (error) {
                console.error('Error al procesar pago:', error);
                mostrarError(error.message || 'Error al procesar el pago');
            }
        });
    }
    
    // === EVENT LISTENERS ===
    function inicializarEventListeners() {        if (btnRegistrarPago) {
            btnRegistrarPago.addEventListener('click', function() {
                console.log("Botón 'Registrar Nuevo Pago' clickeado");
                console.log('Estado antes - Lista:', !seccionListaPagos.classList.contains('hidden'), 'Formulario:', !seccionFormularioPago.classList.contains('hidden'));
                
                editandoPago = null;
                
                // Mostrar formulario PRIMERO
                mostrarSeccion('formulario');
                
                // Limpiar y configurar
                setTimeout(() => {
                    limpiarFormulario();
                    formLegend.textContent = 'Registrar Nuevo Pago';
                    
                    // Registrar Pago
                    const submitButton = formularioPago.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.innerHTML = '<i class="fas fa-save"></i> Registrar Pago';
                    }
                    
                    console.log('Estado después - Lista:', !seccionListaPagos.classList.contains('hidden'), 'Formulario:', !seccionFormularioPago.classList.contains('hidden'));
                    console.log("Formulario mostrado y configurado.");
                }, 10);
            });
        } else {
            console.error('btnRegistrarPago no encontrado en el DOM');
        }

        if (btnFirstPayment) {
            btnFirstPayment.addEventListener('click', function() {
                console.log("Botón 'Registrar Primer Pago' clickeado");
                editandoPago = null;
                limpiarFormulario();
                mostrarSeccion('formulario');
                formLegend.textContent = 'Registrar Primer Pago';
                 // Ver que el botón de submit del formulario diga "Registrar Pago"
                const submitButton = formularioPago.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.innerHTML = '<i class="fas fa-save"></i> Registrar Pago';
                }
                console.log("Mostrando sección formulario para el primer pago.");
            });
        }

        if (btnCancelarPago) {
            btnCancelarPago.addEventListener('click', function() {
                console.log("Botón 'Cancelar Pago' clickeado");
                mostrarSeccion('lista');
                limpiarFormulario();
                console.log("Mostrando sección lista y limpiando formulario.");
            });
        }

        if (btnVistaTabla) {
            btnVistaTabla.addEventListener('click', function() {
                this.classList.add('active');
                btnVistaTarjetas.classList.remove('active');
                toggleVista();
                console.log("Cambiando a vista de tabla.");
            });
        }

        if (btnVistaTarjetas) {
            btnVistaTarjetas.addEventListener('click', function() {
                this.classList.add('active');
                btnVistaTabla.classList.remove('active');
                toggleVista();
                console.log("Cambiando a vista de tarjetas.");
            });
        }
        
        // Cerrar modales
        document.querySelectorAll('.modal .btn-close-modal, .modal .btn-secondary').forEach(btn => {
            btn.addEventListener('click', function() {
                this.closest('.modal').classList.add('hidden');
            });
        });

        if (btnCancelarModal) {
            btnCancelarModal.addEventListener('click', function() {
                if(modalConfirmacion) modalConfirmacion.classList.add('hidden');
            });
        }
    }
      // === INICIALIZACIÓN ===
    function init() {
        console.log("Inicializando módulo de pagos...");
        
        // Verificar elementos
        console.log('btnRegistrarPago encontrado:', !!btnRegistrarPago);
        console.log('seccionListaPagos encontrado:', !!seccionListaPagos);
        console.log('seccionFormularioPago encontrado:', !!seccionFormularioPago);
        console.log('formularioPago encontrado:', !!formularioPago);
        
        mostrarSeccion('lista'); 
        toggleVista();
        
        cargarPagos();
        cargarTiposPago();
        cargarMembresiasDisponibles();
        
        configurarFormulario();
        configurarBusqueda();
        inicializarEventListeners(); // Ver que los event listeners se inicializan
        console.log("Módulo de pagos inicializado.");
    }

    init(); 
});

// Funciones globales para ser llamadas desde HTM
window.verDetallePago = async function(pagoId) {
    console.log(`Ver detalle del pago ID: ${pagoId}`);
    try {
        const pago = pagosData.find(p => p.clienteMembresiaId === pagoId);
        if (!pago) {
            mostrarError('No se encontraron los detalles del pago');
            return;
        }
        
        const detallePagoContent = document.getElementById('detalle-pago-content');
        detallePagoContent.innerHTML = `
            <div class="payment-details">
                <div class="detail-group">
                    <h4><i class="fas fa-user"></i> Información del Cliente</h4>
                    <p><strong>Nombre:</strong> ${pago.nombreCliente}</p>
                    <p><strong>Correo:</strong> ${pago.correoCliente || 'N/A'}</p>
                    <p><strong>Teléfono:</strong> ${pago.telefonoCliente || 'N/A'}</p>
                </div>
                <div class="detail-group">
                    <h4><i class="fas fa-id-card"></i> Información de la Membresía</h4>
                    <p><strong>Tipo:</strong> ${pago.nombreMembresia}</p>
                    <p><strong>Precio:</strong> $${(pago.precioMembresia || 0).toFixed(2)}</p>
                    <p><strong>Período:</strong> ${formatearPeriodo(pago.fechaInicio, pago.fechaFin)}</p>
                </div>
                <div class="detail-group">
                    <h4><i class="fas fa-credit-card"></i> Información del Pago</h4>
                    <p><strong>Monto Pagado:</strong> $${(pago.montoPagado || 0).toFixed(2)}</p>
                    <p><strong>Estado:</strong> <span class="payment-status status-${(pago.estadoPago || '').toLowerCase().replace(' ', '')}">${pago.estadoPago}</span></p>
                    <p><strong>Método:</strong> ${pago.tipoPago || 'N/A'}</p>
                    <p><strong>Fecha:</strong> ${formatearFecha(pago.fechaPago)}</p>
                    ${pago.notas ? `<p><strong>Notas:</strong> ${pago.notas}</p>` : ''}
                </div>
            </div>
        `;
        
        modalDetallePago.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error al mostrar detalles:', error);
        mostrarError('Error al cargar los detalles del pago');
    }
};
window.editarPago = async function(pagoId) {
    console.log(`Editando pago ID: ${pagoId}`);
    const pago = pagosData.find(p => p.clienteMembresiaId === pagoId);
    if (!pago) {
        mostrarError('Pago no encontrado');
        return;
    }

    editandoPago = pagoId; // Guardar el ID del pago que se está editando
    
    // Selección del cliente
    if (pago.clienteId && pago.nombreCliente) {
        seleccionarCliente({ 
            clienteId: pago.clienteId, 
            nombreCompleto: pago.nombreCliente,
            telefono: pago.telefonoCliente || '', 
            estadoMembresia: pago.estadoMembresiaCliente || 'Desconocido'
        });
    } else {
        clienteActual = null;
        buscarCliente.style.display = 'block';
        clienteSeleccionado.classList.add('hidden');
    }

    // Llenar el formulario
    if(membresiaSelect) membresiaSelect.value = pago.membresiaId;
    if(montoPagar) montoPagar.value = pago.montoPagado;
    if(tipoPago) tipoPago.value = pago.tipoPagoId;
    if(fechaPago) fechaPago.value = pago.fechaPago ? pago.fechaPago.split('T')[0] : '';
    if(fechaInicio) fechaInicio.value = pago.fechaInicio ? pago.fechaInicio.split('T')[0] : '';
    const notasTextarea = formularioPago.querySelector('#notas');
    if(notasTextarea) notasTextarea.value = pago.notas || '';

    // Actualizar UI del formulario
    formLegend.textContent = 'Editar Pago';
    const submitButton = formularioPago.querySelector('button[type="submit"]');
    if (submitButton) {
        submitButton.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    }
    
    // Actualizar precio de membresía
    const selectedMembresiaOption = membresiaSelect.options[membresiaSelect.selectedIndex];
    if (selectedMembresiaOption && selectedMembresiaOption.dataset.precio) {
        precioMembresia.textContent = parseFloat(selectedMembresiaOption.dataset.precio).toFixed(2);
    } else {
        precioMembresia.textContent = parseFloat(pago.montoPagado).toFixed(2);
    }
    
    mostrarSeccion('formulario');
    console.log("Formulario llenado para editar pago.");
};
