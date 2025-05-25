// =============================================================================
// Gestión de Clases - JavaScript
// =============================================================================

class ClasesManager {
    constructor() {
        this.clases = [];
        this.entrenadores = [];
        this.filteredClases = [];
        this.currentEditingId = null;
        
        this.init();
    }

    // ==========================================================================
    // Inicialización
    // ==========================================================================
    init() {
        this.setupEventListeners();
        this.loadClases();
        this.loadEntrenadores();
    }

    setupEventListeners() {
        // Botones principales
        document.getElementById('btnToggleForm').addEventListener('click', () => this.showForm());
        document.getElementById('btnAddFirstClass').addEventListener('click', () => this.showForm());
        document.getElementById('btnCloseForm').addEventListener('click', () => this.hideForm());
        document.getElementById('btnCancelForm').addEventListener('click', () => this.hideForm());
        
        // Formulario
        document.getElementById('formClase').addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Búsqueda y filtros
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('dayFilter').addEventListener('change', (e) => this.handleDayFilter(e.target.value));
        document.getElementById('levelFilter').addEventListener('change', (e) => this.handleLevelFilter(e.target.value));
        
        // Modal de eliminación
        document.getElementById('btnCancelDelete').addEventListener('click', () => this.hideDeleteModal());
        document.getElementById('btnConfirmDelete').addEventListener('click', () => this.confirmDelete());
        
        // Cerrar modal al hacer clic fuera
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.hideDeleteModal();
            }
        });
    }

    // ==========================================================================
    // Gestión de datos
    // ==========================================================================
    async loadClases() {
        try {
            this.showLoading();
            
            const response = await fetch('/api/clases');
            const data = await response.json();
            
            if (data.success) {
                this.clases = data.data || [];
                this.filteredClases = [...this.clases];
                this.renderClases();
            } else {
                throw new Error(data.message || 'Error al cargar clases');
            }
        } catch (error) {
            console.error('Error al cargar clases:', error);
            this.showNotification('Error al cargar las clases', 'error');
            this.hideLoading();
            this.showEmptyState();
        }
    }

    async loadEntrenadores() {
        try {
            const response = await fetch('/api/clases/entrenadores');
            const data = await response.json();
            
            if (data.success) {
                this.entrenadores = data.data || [];
                this.populateEntrenadoresSelect();
            } else {
                console.warn('Error al cargar entrenadores:', data.message);
            }
        } catch (error) {
            console.error('Error al cargar entrenadores:', error);
        }
    }

    populateEntrenadoresSelect() {
        const select = document.getElementById('entrenadorId');
        select.innerHTML = '<option value="">Sin entrenador asignado</option>';
        
        this.entrenadores.forEach(entrenador => {
            const option = document.createElement('option');
            option.value = entrenador.ENTRENADORID;
            option.textContent = entrenador.NOMBRECOMPLETO;
            select.appendChild(option);
        });
    }

    // ==========================================================================
    // Renderizado
    // ==========================================================================
    renderClases() {
        this.hideLoading();
        
        const grid = document.getElementById('clasesGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredClases.length === 0) {
            grid.style.display = 'none';
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        grid.style.display = 'grid';
        
        grid.innerHTML = this.filteredClases.map(clase => this.createClaseCard(clase)).join('');
        
        // Agregar event listeners a los botones de las tarjetas
        this.attachCardEventListeners();
    }

    createClaseCard(clase) {
        const statusClass = clase.ACTIVA === 1 ? 'active' : 'inactive';
        const statusText = clase.ACTIVA === 1 ? 'Activa' : 'Inactiva';
        const levelClass = this.getLevelClass(clase.NIVELDIFICULTAD);
        
        return `
            <div class="class-card" data-clase-id="${clase.CLASEID}">
                <div class="class-card-header">
                    <div>
                        <h3 class="class-title">${clase.NOMBRE}</h3>
                        <span class="class-status ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                <div class="class-info">
                    <div class="class-info-row">
                        <i class="fas fa-user-tie"></i>
                        <span class="class-trainer">${clase.NOMBREENTRENADOR || 'Sin entrenador asignado'}</span>
                    </div>
                    <div class="class-info-row">
                        <i class="fas fa-calendar-day"></i>
                        <span>${clase.DIASEMANA}</span>
                    </div>
                    <div class="class-info-row">
                        <i class="fas fa-clock"></i>
                        <span>${clase.HORAINICIO} - ${this.calculateEndTime(clase.HORAINICIO, clase.DURACIONMINUTOS)}</span>
                    </div>
                    <div class="class-info-row">
                        <i class="fas fa-stopwatch"></i>
                        <span>${clase.DURACIONMINUTOS} minutos</span>
                    </div>
                    <div class="class-info-row">
                        <i class="fas fa-users"></i>
                        <span>Máximo ${clase.CAPACIDADMAXIMA} personas</span>
                    </div>
                </div>
                
                ${clase.DESCRIPCION ? `<p class="class-description">${clase.DESCRIPCION}</p>` : ''}
                
                <div class="class-level ${levelClass}">${clase.NIVELDIFICULTAD}</div>
                
                <div class="class-actions">
                    <button class="btn-icon btn-edit" data-action="edit" data-clase-id="${clase.CLASEID}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" data-action="delete" data-clase-id="${clase.CLASEID}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    getLevelClass(nivel) {
        switch (nivel?.toLowerCase()) {
            case 'principiante': return 'principiante';
            case 'intermedio': return 'intermedio';
            case 'avanzado': return 'avanzado';
            default: return 'todos';
        }
    }

    calculateEndTime(startTime, duration) {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startInMinutes = hours * 60 + minutes;
        const endInMinutes = startInMinutes + duration;
        const endHours = Math.floor(endInMinutes / 60);
        const endMins = endInMinutes % 60;
        return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
    }

    attachCardEventListeners() {
        const editButtons = document.querySelectorAll('[data-action="edit"]');
        const deleteButtons = document.querySelectorAll('[data-action="delete"]');
        
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const claseId = e.currentTarget.getAttribute('data-clase-id');
                this.editClase(claseId);
            });
        });
        
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const claseId = e.currentTarget.getAttribute('data-clase-id');
                this.showDeleteModal(claseId);
            });
        });
    }

    // ==========================================================================
    // Formulario
    // ==========================================================================
    showForm(claseData = null) {
        const formSection = document.getElementById('formSection');
        const formTitle = document.getElementById('formTitle');
        const submitBtn = document.getElementById('btnSubmitForm');
        
        if (claseData) {
            // Modo edición
            formTitle.innerHTML = '<i class="fas fa-edit"></i> Editar Clase';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar Clase';
            this.populateForm(claseData);
            this.currentEditingId = claseData.CLASEID;
        } else {
            // Modo creación
            formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Registrar Nueva Clase';
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Clase';
            this.resetForm();
            this.currentEditingId = null;
        }
        
        formSection.classList.remove('hidden');
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    hideForm() {
        document.getElementById('formSection').classList.add('hidden');
        this.resetForm();
        this.currentEditingId = null;
    }

    resetForm() {
        const form = document.getElementById('formClase');
        form.reset();
        document.getElementById('activa').checked = true;
    }

    populateForm(claseData) {
        document.getElementById('nombre').value = claseData.NOMBRE || '';
        document.getElementById('descripcion').value = claseData.DESCRIPCION || '';
        document.getElementById('entrenadorId').value = claseData.ENTRENADORID || '';
        document.getElementById('diaSemana').value = claseData.DIASEMANA || '';
        document.getElementById('horaInicio').value = claseData.HORAINICIO || '';
        document.getElementById('duracionMinutos').value = claseData.DURACIONMINUTOS || '';
        document.getElementById('capacidadMaxima').value = claseData.CAPACIDADMAXIMA || '';
        document.getElementById('nivelDificultad').value = claseData.NIVELDIFICULTAD || '';
        document.getElementById('activa').checked = claseData.ACTIVA === 1;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = this.getFormData();
        
        if (!this.validateFormData(formData)) {
            return;
        }
        
        try {
            this.setSubmitButtonLoading(true);
            
            let response;
            if (this.currentEditingId) {
                response = await fetch(`/api/clases/${this.currentEditingId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            } else {
                response = await fetch('/api/clases', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification(
                    this.currentEditingId ? 'Clase actualizada exitosamente' : 'Clase creada exitosamente',
                    'success'
                );
                this.hideForm();
                this.loadClases();
            } else {
                throw new Error(data.message || 'Error al procesar la clase');
            }
        } catch (error) {
            console.error('Error al enviar formulario:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.setSubmitButtonLoading(false);
        }
    }

    getFormData() {
        return {
            nombre: document.getElementById('nombre').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            entrenadorId: document.getElementById('entrenadorId').value || null,
            diaSemana: document.getElementById('diaSemana').value,
            horaInicio: document.getElementById('horaInicio').value,
            duracionMinutos: parseInt(document.getElementById('duracionMinutos').value),
            capacidadMaxima: parseInt(document.getElementById('capacidadMaxima').value),
            nivelDificultad: document.getElementById('nivelDificultad').value,
            activa: document.getElementById('activa').checked ? 1 : 0
        };
    }

    validateFormData(data) {
        if (!data.nombre) {
            this.showNotification('El nombre de la clase es requerido', 'error');
            return false;
        }
        
        if (!data.diaSemana) {
            this.showNotification('El día de la semana es requerido', 'error');
            return false;
        }
        
        if (!data.horaInicio) {
            this.showNotification('La hora de inicio es requerida', 'error');
            return false;
        }
        
        if (!data.duracionMinutos || data.duracionMinutos < 15 || data.duracionMinutos > 180) {
            this.showNotification('La duración debe estar entre 15 y 180 minutos', 'error');
            return false;
        }
        
        if (!data.capacidadMaxima || data.capacidadMaxima < 1 || data.capacidadMaxima > 50) {
            this.showNotification('La capacidad máxima debe estar entre 1 y 50 personas', 'error');
            return false;
        }
        
        if (!data.nivelDificultad) {
            this.showNotification('El nivel de dificultad es requerido', 'error');
            return false;
        }
        
        return true;
    }

    setSubmitButtonLoading(loading) {
        const btn = document.getElementById('btnSubmitForm');
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        } else {
            btn.disabled = false;
            btn.innerHTML = this.currentEditingId ? 
                '<i class="fas fa-save"></i> Actualizar Clase' : 
                '<i class="fas fa-save"></i> Guardar Clase';
        }
    }

    // ==========================================================================
    // Edición y eliminación
    // ==========================================================================
    async editClase(claseId) {
        try {
            const response = await fetch(`/api/clases/${claseId}`);
            const data = await response.json();
            
            if (data.success) {
                this.showForm(data.data);
            } else {
                throw new Error(data.message || 'Error al cargar los datos de la clase');
            }
        } catch (error) {
            console.error('Error al editar clase:', error);
            this.showNotification(error.message, 'error');
        }
    }

    showDeleteModal(claseId) {
        this.currentEditingId = claseId;
        document.getElementById('deleteModal').classList.remove('hidden');
    }

    hideDeleteModal() {
        this.currentEditingId = null;
        document.getElementById('deleteModal').classList.add('hidden');
    }

    async confirmDelete() {
        if (!this.currentEditingId) return;
        
        try {
            const response = await fetch(`/api/clases/${this.currentEditingId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Clase eliminada exitosamente', 'success');
                this.hideDeleteModal();
                this.loadClases();
            } else {
                throw new Error(data.message || 'Error al eliminar la clase');
            }
        } catch (error) {
            console.error('Error al eliminar clase:', error);
            this.showNotification(error.message, 'error');
        }
    }

    // ==========================================================================
    // Búsqueda y filtros
    // ==========================================================================
    handleSearch(query) {
        this.applyFilters();
    }

    handleDayFilter(day) {
        this.applyFilters();
    }

    handleLevelFilter(level) {
        this.applyFilters();
    }

    applyFilters() {
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        const dayFilter = document.getElementById('dayFilter').value;
        const levelFilter = document.getElementById('levelFilter').value;
        
        this.filteredClases = this.clases.filter(clase => {
            const matchesSearch = !searchQuery || 
                clase.NOMBRE.toLowerCase().includes(searchQuery) ||
                (clase.NOMBREENTRENADOR && clase.NOMBREENTRENADOR.toLowerCase().includes(searchQuery)) ||
                clase.DIASEMANA.toLowerCase().includes(searchQuery);
            
            const matchesDay = !dayFilter || clase.DIASEMANA === dayFilter;
            const matchesLevel = !levelFilter || clase.NIVELDIFICULTAD === levelFilter;
            
            return matchesSearch && matchesDay && matchesLevel;
        });
        
        this.renderClases();
    }

    // ==========================================================================
    // UI States
    // ==========================================================================
    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('clasesGrid').style.display = 'none';
        document.getElementById('emptyState').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showEmptyState() {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('clasesGrid').style.display = 'none';
    }

    // ==========================================================================
    // Notificaciones
    // ==========================================================================
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        // Colores según el tipo
        switch (type) {
            case 'success':
                notification.style.background = '#10b981';
                break;
            case 'error':
                notification.style.background = '#ef4444';
                break;
            case 'warning':
                notification.style.background = '#f59e0b';
                break;
            default:
                notification.style.background = '#3b82f6';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Mostrar notificación
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Ocultar después de 5 segundos
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 5000);
    }
}

// =============================================================================
// Inicialización
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    window.clasesManager = new ClasesManager();
});
