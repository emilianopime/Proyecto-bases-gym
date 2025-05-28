// Script para la funcionalidad del Módulo de Clientes - Listo para Backend

document.addEventListener('DOMContentLoaded', function() {
    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const btnMostrarFormularioRegistro = document.getElementById('btnMostrarFormularioRegistro');
    const btnCancelarRegistro = document.getElementById('btnCancelarRegistro');
    const btnCerrarPerfil = document.getElementById('btnCerrarPerfil');

    const seccionRegistrarCliente = document.getElementById('seccionRegistrarCliente');
    const seccionListaClientes = document.getElementById('seccionListaClientes');
    const seccionPerfilCliente = document.getElementById('seccionPerfilCliente');
    
    const formularioCliente = document.getElementById('formulario-cliente');
    const cuerpoTablaClientes = document.getElementById('cuerpoTablaClientes');

    // Elementos del perfil del cliente (para poblar desde el backend)
    const perfilClienteNombreCompleto = document.getElementById('perfilClienteNombreCompleto');
    const perfilClienteID = document.getElementById('perfilClienteID');
    const perfilPrimerNombre = document.getElementById('perfilPrimerNombre');
    const perfilSegundoNombre = document.getElementById('perfilSegundoNombre');
    const perfilApellidoPaterno = document.getElementById('perfilApellidoPaterno');
    const perfilApellidoMaterno = document.getElementById('perfilApellidoMaterno');
    const perfilFechaNacimiento = document.getElementById('perfilFechaNacimiento');
    const perfilTelefono = document.getElementById('perfilTelefono');
    const perfilCorreo = document.getElementById('perfilCorreo');
    const perfilGenero = document.getElementById('perfilGenero');
    const perfilFechaRegistro = document.getElementById('perfilFechaRegistro');

    // Elementos para listas en pestañas del perfil
    const listaMembresiasCliente = document.getElementById('listaMembresiasCliente');
    const listaAsistenciaCliente = document.getElementById('listaAsistenciaCliente');
    const listaNotasCliente = document.getElementById('listaNotasCliente');


    // --- MANEJO DE VISIBILIDAD DE SECCIONES ---
    function mostrarSeccion(seccionAMostrar) {
        seccionRegistrarCliente.style.display = 'none';
        seccionListaClientes.style.display = 'none';
        seccionPerfilCliente.style.display = 'none';

        if (seccionAMostrar) {
            seccionAMostrar.style.display = 'block';
        }
    }

    // --- EVENT LISTENERS ---
    if (btnMostrarFormularioRegistro) {
        btnMostrarFormularioRegistro.addEventListener('click', function() {
            formularioCliente.reset();
            delete formularioCliente.dataset.editingId; // Asegurar que no esté en modo edición
            document.querySelector('#seccionRegistrarCliente legend').textContent = "Datos del Nuevo Cliente";
            formularioCliente.querySelector('.btn-submit').innerHTML = '<i class="fas fa-save"></i> Guardar Cliente';
            mostrarSeccion(seccionRegistrarCliente);
        });
    }

    if (btnCancelarRegistro) {
        btnCancelarRegistro.addEventListener('click', function() {
            formularioCliente.reset();
            delete formularioCliente.dataset.editingId;
            mostrarSeccion(seccionListaClientes);
        });
    }

    if (formularioCliente) {
        formularioCliente.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(formularioCliente);
            const datosCliente = Object.fromEntries(formData.entries());
            const clienteIdParaActualizar = formularioCliente.dataset.editingId;

            console.log("Datos del formulario principal (formularioCliente):", datosCliente); // Log all data
            console.log("Membresía ID seleccionada (formularioCliente):", formData.get('membresia')); // Specifically log membresia
            
            let url = '/api/clientes'; // URL para crear
            let method = 'POST';

            if (clienteIdParaActualizar) {
                url = `/api/clientes/${clienteIdParaActualizar}`; // URL para actualizar
                method = 'PUT';
            }

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosCliente)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(`Error del servidor: ${response.status} - ${errorData.message || 'Error desconocido'}`);
                }
                
                const resultado = await response.json();
                console.log('Respuesta del servidor:', resultado);
                alert(clienteIdParaActualizar ? 'Cliente actualizado con éxito' : 'Cliente registrado con éxito');
                    cargarClientes(); // Recargar la lista
                mostrarSeccion(seccionListaClientes);
                formularioCliente.reset();
                delete formularioCliente.dataset.editingId;
                document.querySelector('#seccionRegistrarCliente legend').textContent = "Datos del Nuevo Cliente";
                formularioCliente.querySelector('.btn-submit').innerHTML = '<i class="fas fa-save"></i> Guardar Cliente';
                formularioCliente.querySelector('.btn-submit').innerHTML = '<i class="fas fa-save"></i> Guardar Cliente';


            } catch (error) {
                console.error('Error al guardar cliente:', error);
                alert(`Error al guardar cliente: ${error.message}`);
            }
        });
    }

    if (btnCerrarPerfil) {
        btnCerrarPerfil.addEventListener('click', function() {
            mostrarSeccion(seccionListaClientes);
        });
    }

    // --- LÓGICA DE PESTAÑAS (TABS) ---
    const tablinks = document.querySelectorAll(".perfil-tabs .tablink");
    tablinks.forEach(button => {
        button.addEventListener('click', function(event) {
            abrirTab(event, this.dataset.tab);
        });
    });
    
    window.abrirTab = function(evt, tabName) {
        let i, tabcontent, currentTablinks;
        tabcontent = document.getElementsByClassName("tabcontent");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].style.display = "none";
        }
        currentTablinks = document.getElementsByClassName("tablink");
        for (i = 0; i < currentTablinks.length; i++) {
            currentTablinks[i].className = currentTablinks[i].className.replace(" active", "");
        }
        
        const tabElement = document.getElementById(tabName);
        if (tabElement) {
            tabElement.style.display = "block";
        } else {
            console.warn(`Contenido de pestaña no encontrado: ${tabName}`);
        }

        if (evt && evt.currentTarget) {
           evt.currentTarget.className += " active";
        } else { 
            const activeTabButton = document.querySelector(`.tablink[data-tab="${tabName}"]`);
            if (activeTabButton) activeTabButton.className += " active";
        }
    }

    // --- CARGA Y VISUALIZACIÓN DE DATOS ---
    async function cargarClientes() {
        console.log("Intentando cargar clientes desde el backend...");
        try {
            const response = await fetch('/api/clientes');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const clientes = await response.json();
            poblarTablaClientes(clientes);
        } catch (error) {
            console.error('Error al cargar clientes:', error);
            cuerpoTablaClientes.innerHTML = '<tr><td colspan="6">Error al cargar clientes. Intente más tarde.</td></tr>';
        }

        // Placeholder si no hay backend o hay error:
        // poblarTablaClientes([]); // Llama con array vacío para mostrar mensaje de "No hay clientes"
    }

    function poblarTablaClientes(clientes) {
        if (!cuerpoTablaClientes) return;
        cuerpoTablaClientes.innerHTML = ''; 

        if (!clientes || clientes.length === 0) {
            cuerpoTablaClientes.innerHTML = '<tr><td colspan="6">No hay clientes registrados o no se pudieron cargar.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${cliente.clienteID || 'N/A'}</td>
                <td>${cliente.primerNombre || ''} ${cliente.segundoNombre || ''} ${cliente.apellidoPaterno || ''} ${cliente.apellidoMaterno || ''}</td>
                <td>${cliente.telefono || 'N/A'}</td>
                <td>${cliente.correo || 'N/A'}</td>
                <td>${cliente.membresiaActual || 'N/A'}</td>
                <td>
                    <button class="btn-accion-tabla btn-ver-perfil" data-clienteid="${cliente.clienteID}" title="Ver Perfil"><i class="fas fa-eye"></i></button>
                    <button class="btn-accion-tabla btn-editar-cliente" data-clienteid="${cliente.clienteID}" title="Editar Cliente"><i class="fas fa-edit"></i></button>
                    <button class="btn-accion-tabla btn-asignar-membresia" data-clienteid="${cliente.clienteID}" title="Asignar Membresía"><i class="fas fa-id-card"></i></button>
                    <button class="btn-accion-tabla btn-eliminar-cliente" data-clienteid="${cliente.clienteID}" title="Eliminar Cliente"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            cuerpoTablaClientes.appendChild(fila);
        });

        document.querySelectorAll('.btn-ver-perfil').forEach(button => {
            button.addEventListener('click', function() {
                cargarYMostrarPerfilCliente(this.dataset.clienteid);
            });
        });
        document.querySelectorAll('.btn-editar-cliente').forEach(button => {
            button.addEventListener('click', function() {
                prepararEdicionCliente(this.dataset.clienteid);
            });
        });
        
        document.querySelectorAll('.btn-asignar-membresia').forEach(button => {
            button.addEventListener('click', function() {
                abrirFormularioAsignarMembresia(this.dataset.clienteid);
            });
        });

        document.querySelectorAll('.btn-eliminar-cliente').forEach(button => {
            button.addEventListener('click', function() {
                eliminarCliente(this.dataset.clienteid);
            });
        });
    }
    
    async function eliminarCliente(clienteId) {
        if (!confirm(`¿Está seguro de que desea eliminar al cliente con ID ${clienteId}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/clientes/${clienteId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error del servidor: ${response.status}`);
            }

            const resultado = await response.json();
            alert(resultado.message || 'Cliente eliminado con éxito.');
            cargarClientes(); // Recargar la lista de clientes
        } catch (error) {
            console.error(`Error al eliminar cliente ${clienteId}:`, error);
            alert(`Error al eliminar cliente: ${error.message}`);
        }
    }

    async function cargarYMostrarPerfilCliente(clienteId) {
        console.log(`Intentando cargar perfil para cliente ID: ${clienteId} desde el backend`);
        try {
            const response = await fetch(`/api/clientes/${clienteId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Error desconocido'}`);
            }
            const cliente = await response.json();

            if (cliente) {
                perfilClienteNombreCompleto.textContent = `${cliente.primerNombre || ''} ${cliente.segundoNombre || ''} ${cliente.apellidoPaterno || ''} ${cliente.apellidoMaterno || ''}`;
                perfilClienteID.textContent = cliente.clienteID || 'N/A';
                perfilPrimerNombre.textContent = cliente.primerNombre || 'N/A';
                perfilSegundoNombre.textContent = cliente.segundoNombre || 'N/A';
                perfilApellidoPaterno.textContent = cliente.apellidoPaterno || 'N/A';
                perfilApellidoMaterno.textContent = cliente.apellidoMaterno || 'N/A';
                perfilFechaNacimiento.textContent = cliente.fechaNacimiento ? cliente.fechaNacimiento : 'N/A'; // Ya viene como YYYY-MM-DD
                perfilTelefono.textContent = cliente.telefono || 'N/A';
                perfilCorreo.textContent = cliente.correo || 'N/A';                perfilGenero.textContent = cliente.genero || 'N/A'; 
                perfilFechaRegistro.textContent = cliente.fechaRegistro ? cliente.fechaRegistro : 'N/A'; // Ya viene como YYYY-MM-DD
                
                // Cargar datos para las otras pestañas (Membresías, Asistencia, Notas)
                cargarMembresiasCliente(clienteId);
                // cargarAsistenciaCliente(clienteId);
                // cargarNotasCliente(clienteId);
                
                mostrarSeccion(seccionPerfilCliente);
                abrirTab(null, 'infoPersonalTab'); // Abrir la primera pestaña por defecto
            } else {
                alert("Cliente no encontrado.");
            }
        } catch (error) {
            console.error(`Error al cargar perfil del cliente ${clienteId}:`, error);
            alert("Error al cargar el perfil del cliente: " + error.message);
        }
        
        // Placeholder si no hay backend:
        // alert(`Simulación: Mostrar perfil para cliente ID ${clienteId}. Reemplazar con llamada real.`);
        // Deberías limpiar los campos del perfil o mostrar un mensaje si no se pueden cargar los datos.
        // perfilClienteNombreCompleto.textContent = "Nombre Apellido (Carga Pendiente)";
        // perfilClienteID.textContent = clienteId;
        // ... limpiar o poner placeholders en otros campos del perfil
        // listaMembresiasCliente.innerHTML = "<p><em>Carga de membresías pendiente...</em></p>";
        // listaAsistenciaCliente.innerHTML = "<p><em>Carga de asistencia pendiente...</em></p>";
        // listaNotasCliente.innerHTML = "<p><em>Carga de notas pendiente...</em></p>";
        // mostrarSeccion(seccionPerfilCliente);
        // abrirTab(null, 'infoPersonalTab');
    }

    async function prepararEdicionCliente(clienteId) {
        console.log(`Intentando preparar edición para cliente ID: ${clienteId} desde el backend`);
        try {
            const response = await fetch(`/api/clientes/${clienteId}`);
            if (!response.ok) {
                 const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData.message || 'Error desconocido'}`);
            }
            const clienteAEditar = await response.json();

            if (clienteAEditar) {
                document.getElementById('primerNombre').value = clienteAEditar.primerNombre || '';
                document.getElementById('segundoNombre').value = clienteAEditar.segundoNombre || '';
                document.getElementById('apellidoPaterno').value = clienteAEditar.apellidoPaterno || '';
                document.getElementById('apellidoMaterno').value = clienteAEditar.apellidoMaterno || '';
                document.getElementById('fechaNacimiento').value = clienteAEditar.fechaNacimiento || ''; // Viene como YYYY-MM-DD
                document.getElementById('telefono').value = clienteAEditar.telefono || '';
                document.getElementById('correo').value = clienteAEditar.correo || '';
                document.getElementById('genero').value = clienteAEditar.genero || '';

                // Seleccionar la membresía actual del cliente en el dropdown
                const selectMembresia = document.getElementById('membresia');
                if (clienteAEditar.currentMembresiaID) {
                    selectMembresia.value = clienteAEditar.currentMembresiaID;
                } else {
                    selectMembresia.value = ""; // Si no tiene membresía activa/pendiente, seleccionar la opción por defecto
                }

                formularioCliente.dataset.editingId = clienteId;
                document.querySelector('#seccionRegistrarCliente legend').textContent = "Editar Datos del Cliente";
                formularioCliente.querySelector('.btn-submit').innerHTML = '<i class="fas fa-save"></i> Actualizar Cliente';
                mostrarSeccion(seccionRegistrarCliente);
            } else {
                alert("Error: No se encontró el cliente para editar.");
            }
        } catch (error) {
            console.error(`Error al obtener datos del cliente ${clienteId} para edición:`, error);
            alert("Error al obtener datos del cliente para editar: " + error.message);
        }

        // Placeholder si no hay backend:
        // alert(`Simulación: Preparar edición para cliente ID ${clienteId}. Reemplazar con llamada real.`);
        // Podrías poblar el formulario con datos genéricos o un mensaje
        // formularioCliente.reset();
        // document.getElementById('primerNombre').value = "Nombre a Editar";
        // formularioCliente.dataset.editingId = clienteId;
        // document.querySelector('#seccionRegistrarCliente legend').textContent = "Editar Datos del Cliente";
        // formularioCliente.querySelector('.btn-submit').innerHTML = '<i class="fas fa-save"></i> Actualizar Cliente';
        // mostrarSeccion(seccionRegistrarCliente);
    }

    // --- FILTRADO DE TABLA (CLIENT-SIDE) ---
    // Esta función puede permanecer si el filtrado es client-side sobre los datos ya cargados.
    // Si tienes muchos datos, considera un filtrado server-side (enviar el término de búsqueda a la API).
    window.filtrarTabla = function() {
        const filtroInput = document.getElementById('buscarCliente');
        if (!filtroInput) return;
        const filtro = filtroInput.value.toLowerCase();
        const filas = cuerpoTablaClientes.getElementsByTagName('tr');
        
        for (let i = 0; i < filas.length; i++) {
            // Verificar que la fila no sea la de "No hay clientes..."
            if (filas[i].getElementsByTagName('td').length > 1) {
                let textoFila = filas[i].textContent || filas[i].innerText;
                if (textoFila.toLowerCase().indexOf(filtro) > -1) {
                    filas[i].style.display = "";
                } else {
                    filas[i].style.display = "none";
                }
            }
        }
    }    // --- INICIALIZACIÓN ---
    mostrarSeccion(seccionListaClientes);
    cargarClientes(); // Intentar cargar los clientes al iniciar
    cargarMembresiasDisponibles(); // Cargar las membresías disponibles para el formulario
    
    // Hacer la función cargarClientes disponible globalmente para actualizaciones desde otras ventanas
    window.cargarClientes = cargarClientes;

    // --- FUNCIONES PARA MEMBRESÍAS ---
    async function cargarMembresiasDisponibles() {
        try {
            const response = await fetch('/api/membresias-disponibles');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const membresias = await response.json();
            poblarSelectMembresias(membresias);
        } catch (error) {
            console.error('Error al cargar membresías disponibles:', error);
        }
    }

    function poblarSelectMembresias(membresias) {
        const selectMembresia = document.getElementById('membresia');
        if (!selectMembresia) return;

        // Limpiar opciones existentes excepto la primera
        while (selectMembresia.children.length > 1) {
            selectMembresia.removeChild(selectMembresia.lastChild);
        }

        membresias.forEach(membresia => {
            const option = document.createElement('option');
            option.value = membresia.membresiaID;
            option.textContent = `${membresia.nombre} - $${membresia.precio} (${membresia.duracionDias} días)`;
            selectMembresia.appendChild(option);
        });
    }

    // Función para cargar y mostrar las membresías de un cliente
    async function cargarMembresiasCliente(clienteId) {
        try {
            const response = await fetch(`/api/clientes/${clienteId}/membresias`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const membresias = await response.json();
            mostrarMembresiasCliente(membresias);
        } catch (error) {
            console.error(`Error al cargar membresías del cliente ${clienteId}:`, error);
            listaMembresiasCliente.innerHTML = '<p><em>Error al cargar membresías del cliente.</em></p>';
        }
    }

    function mostrarMembresiasCliente(membresias) {
        if (!listaMembresiasCliente) return;

        if (!membresias || membresias.length === 0) {
            listaMembresiasCliente.innerHTML = '<p><em>Este cliente no tiene membresías asignadas activas o recientes.</em></p>';
            return;
        }

        // Tomar solo la primera membresía (la más reciente según el backend)
        const membresiaActual = membresias[0];

        let html = '<div class="membresias-cliente">';
        const estadoClass = membresiaActual.estado.toLowerCase();
        html += `
            <div class="membresia-item ${estadoClass}">
                <h4>${membresiaActual.nombreMembresia}</h4>
                <p><strong>Estado:</strong> <span class="estado-${estadoClass}">${membresiaActual.estado}</span></p>
                <p><strong>Período:</strong> ${membresiaActual.fechaInicio} - ${membresiaActual.fechaFin}</p>
                <p><strong>Monto Pagado:</strong> $${membresiaActual.montoPagado || 'N/A'}</p>
                <p><strong>Método de Pago:</strong> ${membresiaActual.tipoPago}</p>
                ${membresiaActual.notas ? `<p><strong>Notas:</strong> ${membresiaActual.notas}</p>` : ''}
            </div>
        `;
        html += '</div>';
        listaMembresiasCliente.innerHTML = html;
    }

    // Agregar event listener para el botón de asignar nueva membresía
    const btnAbrirFormMembresia = document.getElementById('btnAbrirFormMembresia');
    if (btnAbrirFormMembresia) {
        btnAbrirFormMembresia.addEventListener('click', function() {
            const clienteId = perfilClienteID.textContent;
            if (clienteId && clienteId !== 'N/A') {
                abrirFormularioAsignarMembresia(clienteId);
            } else {
                alert('Error: No se puede determinar el ID del cliente.');
            }
        });
    }

    function abrirFormularioAsignarMembresia(clienteId) {
        // Crear modal dinámico para asignar membresía
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Asignar Nueva Membresía</h3>
                    <button class="btn-cerrar-modal" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form class="modal-form" id="form-asignar-membresia">
                    <div class="campo">
                        <label for="nuevaMembresia">Tipo de Membresía</label>
                        <select id="nuevaMembresia" name="membresiaId" required>
                            <option value="">-- Seleccionar Membresía --</option>
                        </select>
                    </div>
                    <div class="campo">
                        <label for="notasMembresia">Notas (Opcional)</label>
                        <textarea id="notasMembresia" name="notas" placeholder="Observaciones adicionales..."></textarea>
                    </div>
                    <div class="campo-botones">
                        <button type="submit" class="btn-submit">
                            <i class="fas fa-save"></i> Asignar Membresía
                        </button>
                        <button type="button" class="btn-cancelar" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Cargar membresías en el select del modal
        fetch('/api/membresias-disponibles')
            .then(response => response.json())
            .then(membresias => {
                const select = modal.querySelector('#nuevaMembresia');
                membresias.forEach(membresia => {
                    const option = document.createElement('option');
                    option.value = membresia.membresiaID;
                    option.textContent = `${membresia.nombre} - $${membresia.precio} (${membresia.duracionDias} días)`;
                    select.appendChild(option);
                });
            })
            .catch(error => console.error('Error al cargar membresías:', error));

        // Agregar event listener al formulario
        const form = modal.querySelector('#form-asignar-membresia');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            console.log("Datos del modal de asignación de membresía:", data); // Log all data from modal
            console.log("Membresía ID seleccionada (modal):", formData.get('membresiaId')); // Specifically log membresiaId from modal
            
            try {
                const response = await fetch(`/api/clientes/${clienteId}/membresias`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Error al asignar membresía');
                }                alert('Membresía asignada con éxito');
                modal.remove();
                cargarMembresiasCliente(clienteId); // Recargar la lista de membresías
                cargarClientes(); // Recargar la tabla de clientes para mostrar la nueva membresía
            } catch (error) {
                console.error('Error al asignar membresía:', error);
                alert('Error al asignar membresía: ' + error.message);
            }
        });
    }
}); // Fin de DOMContentLoaded