import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';
import { Page } from '../../../interfaces/page';
import { EntregaService } from '../../../services/entrega.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { EntregaEntity, EntregaResponseDTO, EstadoEntrega } from '../../../interfaces/entregas-entity';
import { LoginResponse, RolUsuario, UsuarioResponseDTO } from '../../../interfaces/usuario';

@Component({
  selector: 'app-lista-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-entregas.component.html',
  styleUrl: './lista-entregas.component.scss'
})
export class ListaEntregasComponent implements OnInit{

  entregas : EntregaResponseDTO[] = [];
  entregasOriginales: EntregaResponseDTO[] = []; // Para almacenar todas las entregas sin filtrar
  page : Page<EntregaResponseDTO> | null = null;

  //Usuario actual y Rol
  usuario: LoginResponse | null = null;
  rolUsuario = RolUsuario;
  estadoEntrega = EstadoEntrega;

  // Parámetros de paginación y filtrado
  currentPage: number = 0;
  pageSize: number = 10;
  sortBy: string = 'id';
  sortDirection: string = 'desc'; // Más recientes primero
  estadoFilter: EstadoEntrega | '' = '';

  isSearchActive: boolean = false;
  alumnoEspecifico: any = null;
  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;
  activeTab: 'todas' | 'pendientes' | 'calificadas' | 'vencidas' = 'todas';

  // Filtros específicos por contexto
  profesorId: number | null = null;
  alumnoId: number | null = null;
  tareaId: number | null = null;

  constructor (public entregaService : EntregaService,
                public router : Router,
                private route : ActivatedRoute,
                private authService : AuthService){}

  ngOnInit(): void {
      //Obtener Usuario actual
      this.authService.currentUser.subscribe(
        user => {
          this.usuario = user;
          if (this.usuario){
            this.handleRouteParams();
          }
      });
  }

  // Modificar este método para mejor manejo de parámetros
  handleRouteParams(): void {
    this.route.queryParams.subscribe(queryParams => {
      this.tareaId = queryParams['tareaId'] ? +queryParams['tareaId'] : null;
      this.profesorId = queryParams['profesorId'] ? +queryParams['profesorId'] : null;
      this.alumnoId = queryParams['alumnoId'] ? +queryParams['alumnoId'] : null;

      console.log('🔍 [ENTREGAS] Parámetros detectados:', {
        tareaId: this.tareaId,
        profesorId: this.profesorId,
        alumnoId: this.alumnoId
      });

      this.route.params.subscribe(params => {
        if (params['tareaId']) {
          this.tareaId = +params['tareaId'];
        }

        // ✅ NUEVA LÓGICA: Decidir qué cargar basado en los parámetros
        if (this.tareaId) {
          this.loadEntregasByTarea();
        } else if (this.alumnoId) {
          this.loadEntregasByAlumnoEspecifico();
        } else if (this.profesorId) {
          // ✅ NUEVO: Cargar entregas de un profesor específico
          this.loadEntregasByProfesorEspecifico();
        } else {
          // ✅ MODIFICADO: Cargar según el rol del usuario actual
          this.loadEntregasSegunRolUsuario();
        }
      });
    });
  }

  loadEntregasSegunRolUsuario(): void {
    if (!this.usuario) return;

    switch (this.usuario.rol) {
      case RolUsuario.PROFESOR:
        // ✅ USAR MÉTODO ESPECÍFICO PARA PROFESOR
        this.loadEntregasByProfesor();
        break;

      case RolUsuario.ALUMNO:
        if (this.usuario.alumnoId) {
          this.alumnoId = this.usuario.alumnoId;
          this.loadEntregasByAlumnoEspecifico();
        }
        break;

      case RolUsuario.ADMIN:
        this.loadTodasLasEntregasYFiltrar();
        break;

      default:
        this.loading = false;
        this.error = "Rol de usuario no reconocido";
        break;
    }
  }
  loadEntregasByProfesorEspecifico(): void {
      if (!this.profesorId) return;

      this.loading = true;
      this.error = null;

      console.log('👨‍🏫 [ENTREGAS] Cargando entregas para profesor ID:', this.profesorId);

      // Cargar todas las entregas y filtrar por el profesor específico
      this.entregaService.getEntregas(0, 1000, this.sortBy, this.sortDirection).subscribe({
        next: (page) => {
          console.log('👨‍🏫 [ENTREGAS] Total entregas obtenidas:', page.content.length);

          // ✅ CORREGIDO: Filtrar entregas de tareas del profesor específico
          const entregasDelProfesor = page.content.filter(entrega =>
            entrega.tarea?.profesor?.id === this.profesorId
          );

          console.log('👨‍🏫 [ENTREGAS] Entregas del profesor filtradas:', entregasDelProfesor.length);

          this.entregasOriginales = entregasDelProfesor;
          this.entregas = [...this.entregasOriginales];
          this.updatePage();
          this.loading = false;

          if (entregasDelProfesor.length === 0) {
            this.error = `❌ No se encontraron entregas para las tareas de este profesor.`;
          }
        },
        error: (err) => {
          this.error = "❌ Error al cargar las entregas del profesor";
          this.loading = false;
          console.error("Error: ", err);
        }
      });
    }

  puedeCalificarEstaEntrega(entrega: EntregaResponseDTO): boolean {
    // ✅ Verificaciones paso a paso con logs
    if (!this.esProfesor()) {
      console.log('❌ No es profesor');
      return false;
    }

    if (!this.usuario?.profesorId) {
      console.log('❌ No hay profesorId en usuario');
      return false;
    }

    // ✅ CRÍTICO: Verificar que la entrega tiene documento
    if (!entrega.tieneDocumento) {
      console.log('❌ La entrega no tiene documento');
      return false;
    }

    // ✅ Solo puede calificar si la entrega está en estado ENTREGADA
    if (entrega.estado !== EstadoEntrega.ENTREGADA) {
      console.log(`❌ Estado incorrecto: ${entrega.estado}, necesita ser: ${EstadoEntrega.ENTREGADA}`);
      return false;
    }

    // ✅ CRÍTICO: Solo puede calificar si la tarea fue creada por él
    const profesorDeLaTarea = entrega.tarea?.profesor?.id;
    const profesorLoggeado = this.usuario?.profesorId;

    if (profesorDeLaTarea !== profesorLoggeado) {
      console.log(`❌ Profesor de tarea (${profesorDeLaTarea}) != Profesor loggeado (${profesorLoggeado})`);
      return false;
    }

    console.log('✅ Puede calificar la entrega');
    return true;
  }

  validarAccionProfesor(entrega: EntregaResponseDTO, accion: string): { permitido: boolean, mensaje?: string } {
    if (!this.esProfesor() || !this.usuario?.profesorId) {
      return { permitido: false, mensaje: "❌ Solo los profesores pueden realizar esta acción" };
    }

    const profesorDeLaTarea = entrega.tarea?.profesor?.id;
    const profesorLoggeado = this.usuario.profesorId;

    if (profesorDeLaTarea !== profesorLoggeado) {
      return {
        permitido: false,
        mensaje: `❌ No puedes ${accion} esta entrega porque la tarea fue creada por otro profesor`
      };
    }

    return { permitido: true };
  }



  loadEntregasByTarea(): void {
    if (!this.tareaId) return;

    this.loading = true;
    this.error = null;

    console.log('📋 [ENTREGAS] Cargando entregas para tarea ID:', this.tareaId);

    // ✅ USAR EL MÉTODO CORRECTO DEL SERVICIO
    this.entregaService.getEntregasByTarea(this.tareaId, 0, 1000, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        console.log('📋 [ENTREGAS] Entregas de tarea cargadas:', page.content.length);
        this.entregasOriginales = page.content;
        this.entregas = [...this.entregasOriginales];
        this.updatePage();
        this.loading = false;
      },
      error: (err) => {
        this.error = "Error al cargar las entregas de la tarea";
        this.loading = false;
        console.error("Error: ", err);
      }
    });
  }


  loadTodasLasEntregasYFiltrar(): void {
    if (!this.usuario) return;

    this.loading = true;
    this.error = null;
    this.isSearchActive = false;

    // Primero cargamos todas las entregas
    this.entregaService.getEntregas(0, 1000, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.entregasOriginales = page.content;

        // Luego filtramos según el rol
        this.filtrarEntregasSegunRol();
        this.loading = false;
      },
      error: (err) => {
        this.error = "Error al cargar las entregas";
        this.loading = false;
        console.error("Error: ", err);
      }
    });
  }

  filtrarEntregasSegunRol(): void {
      if (!this.usuario) return;

    // ✅ NUEVO: Si hay un alumnoId específico, no filtrar por rol
    if (this.alumnoId) {
      // Ya se filtró en loadEntregasByAlumnoEspecifico()
      this.entregas = [...this.entregasOriginales];
      this.updatePage();
      return;
    }

    let entregasFiltradas = [...this.entregasOriginales];

    switch (this.usuario.rol) {
      case RolUsuario.PROFESOR:
        if (this.usuario.profesorId) {
          // Filtrar solo entregas de tareas creadas por este profesor
          entregasFiltradas = this.entregasOriginales.filter(entrega =>
            entrega.tarea?.profesor?.id === this.usuario!.profesorId
          );
        }
        break;

      case RolUsuario.ALUMNO:
        if (this.usuario.alumnoId) {
          // Filtrar solo entregas de este alumno
          entregasFiltradas = this.entregasOriginales.filter(entrega =>
            entrega.alumno?.id === this.usuario!.alumnoId
          );
        }
        break;

      case RolUsuario.ADMIN:
        // Admin ve todas las entregas, no necesita filtrado
        entregasFiltradas = [...this.entregasOriginales];
        break;

      default:
        entregasFiltradas = [];
        break;
    }

    this.entregas = entregasFiltradas;
    this.updatePage();
  }

  // Actualizar información de paginación basada en entregas filtradas
  updatePage(): void {
    const totalElements = this.entregas.length;
    const totalPages = Math.ceil(totalElements / this.pageSize);

    this.page = {
      content: this.getPaginatedEntregas(),
      totalElements: totalElements,
      totalPages: totalPages,
      size: this.pageSize,
      number: this.currentPage,
      first: this.currentPage === 0,
      last: this.currentPage >= totalPages - 1,
      empty: totalElements === 0,
      numberOfElements: this.getPaginatedEntregas().length,
      pageable: {
        pageNumber: this.currentPage,
        pageSize: this.pageSize,
        offset: this.currentPage * this.pageSize,
        paged: true,
        unpaged: false,
        sort: {
          empty: false,
          sorted: true,
          unsorted: false
        }
      },
      sort: {
        empty: false,
        sorted: true,
        unsorted: false
      }
    };
  }

  getPaginatedEntregas(): EntregaResponseDTO[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.entregas.slice(startIndex, endIndex);
  }

  loadEntregasPendientesCalificacion(): void {
    if (!this.usuario?.profesorId) return;

    // Filtrar entregas pendientes de calificación del profesor
    const entregasPendientes = this.entregasOriginales.filter(entrega =>
      entrega.tarea?.profesor?.id === this.usuario!.profesorId &&
      entrega.estado === EstadoEntrega.ENTREGADA
    );

    this.entregas = entregasPendientes;
    this.updatePage();
  }

  search(): void {
    if (!this.isSearchActive && !this.estadoFilter) {
      this.filtrarEntregasSegunRol();
      return;
    }

    this.isSearchActive = true;

    if (this.estadoFilter) {
      this.searchByEstado();
    } else {
      this.filtrarEntregasSegunRol();
    }
  }

  puedeAlumnoEditarEntrega(entrega: EntregaResponseDTO): boolean {
    // Solo alumnos pueden usar esta función
    if (!this.esAlumno()) return false;

    // Verificar que es su entrega
    if (entrega.alumno?.id !== this.usuario?.alumnoId) {
      console.log('❌ No es su entrega');
      return false;
    }

    // ✅ PUEDE EDITAR si está PENDIENTE o ENTREGADA
    const puedeEditar = entrega.estado === EstadoEntrega.PENDIENTE ||
                        entrega.estado === EstadoEntrega.ENTREGADA;

    console.log(`🔍 [ALUMNO-EDIT] Entrega ${entrega.id} - Estado: ${entrega.estado} - Puede editar: ${puedeEditar}`);

    return puedeEditar;
  }

  searchByEstado(): void {
    // Primero filtrar por rol, luego por estado
    this.filtrarEntregasSegunRol();

    if (this.estadoFilter) {
      this.entregas = this.entregas.filter(entrega =>
        entrega.estado === this.estadoFilter
      );
    }

    this.currentPage = 0; // Resetear a primera página
    this.updatePage();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePage();
  }

  setActiveTab(tab: 'todas' | 'pendientes' | 'calificadas' | 'vencidas'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.resetFilters();

      // ✅ PROFESOR: Filtrar entregas ya cargadas
      if (this.esProfesor()) {
        this.entregas = [...this.entregasOriginales];

        if (tab === 'pendientes') {
          this.entregas = this.entregas.filter(e => e.estado === EstadoEntrega.ENTREGADA);
        } else if (tab === 'calificadas') {
          this.entregas = this.entregas.filter(e => e.estado === EstadoEntrega.CALIFICADA);
        } else if (tab === 'vencidas') {
          this.entregas = this.entregas.filter(e => e.estado === EstadoEntrega.FUERA_PLAZO);
        }
        // Para 'todas' no necesita filtro adicional

        this.updatePage();
        return;
      }

      // ✅ ALUMNO ESPECÍFICO: Filtrar sus entregas por estado
      if (this.alumnoId) {
        this.entregas = [...this.entregasOriginales];

        if (tab === 'calificadas') {
          this.entregas = this.entregas.filter(e => e.estado === EstadoEntrega.CALIFICADA);
        } else if (tab === 'pendientes') {
          this.entregas = this.entregas.filter(e => e.estado === EstadoEntrega.ENTREGADA);
        } else if (tab === 'vencidas') {
          this.entregas = this.entregas.filter(e => e.estado === EstadoEntrega.FUERA_PLAZO);
        }

        this.updatePage();
        return;
      }

      // Lógica para admin
      this.loadTodasLasEntregasYFiltrar();
      this.updatePage();
    }
  }
  loadEntregasByProfesor(): void {
    if (!this.usuario?.profesorId) return;

    this.loading = true;
    this.error = null;

    console.log('👨‍🏫 [ENTREGAS] Cargando entregas para profesor ID:', this.usuario.profesorId);

    this.entregaService.getEntregasByProfesor(this.usuario.profesorId, 0, 1000, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        console.log('👨‍🏫 [ENTREGAS] Entregas del profesor cargadas:', page.content.length);
        this.entregasOriginales = page.content;
        this.entregas = [...this.entregasOriginales];
        this.updatePage();
        this.loading = false;
      },
      error: (err) => {
        this.error = "Error al cargar las entregas del profesor";
        this.loading = false;
        console.error("Error: ", err);
      }
    });
  }

  resetFilters(): void {
    this.estadoFilter = '';
    this.currentPage = 0;
    this.isSearchActive = false;
  }

  //Metodos de utilidades
  formatFecha(fecha?: string): string {
    return this.entregaService.formatFechaEntrega(fecha);
  }

  tieneDocumento(entrega: EntregaResponseDTO): boolean {
    return this.entregaService.tieneDocumento(entrega);
  }

  getEstadoColor(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoColor(estado);
  }

  getEstadoTexto(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoTexto(estado);
  }

  formatNota(entrega: EntregaResponseDTO): string {
    return this.entregaService.formatNota(entrega);
  }

  estaCalificada(entrega: EntregaResponseDTO): boolean {
    return this.entregaService.estaCalificada(entrega);
  }

  puedeSubirDocumento(entrega: EntregaResponseDTO): boolean {
    return this.entregaService.puedeSubirDocumento(entrega);
  }

  //Métodos de navegación y acciones
  verEntrega(id: number): void {
    const queryParams = { modo: 'view' };
    this.router.navigate(['/entregas', id], { queryParams });
  }

  editarEntrega(id: number): void {
    const entrega = this.entregas.find(e => e.id === id);

    if (!entrega) {
      this.error = "❌ Entrega no encontrada";
      return;
    }

    // ✅ Validar permisos específicos
    if (this.esAlumno()) {
      if (!this.puedeAlumnoEditarEntrega(entrega)) {
        this.error = "❌ No puedes editar esta entrega. Solo se pueden editar entregas pendientes o entregadas (no calificadas).";
        setTimeout(() => this.error = null, 5000);
        return;
      }

      // ✅ Verificar que está dentro del plazo si hay fecha límite
      if (entrega.tarea?.fechaLimite) {
        const fechaLimite = new Date(entrega.tarea.fechaLimite);
        const ahora = new Date();

        if (ahora > fechaLimite) {
          this.error = "❌ No puedes editar esta entrega porque la fecha límite ya pasó.";
          setTimeout(() => this.error = null, 5000);
          return;
        }
      }
    } else if (this.esAdmin()) {
      // Admin puede editar siempre
    } else {
      this.error = "❌ No tienes permisos para editar entregas";
      setTimeout(() => this.error = null, 3000);
      return;
    }

    // Proceder con la edición
    const queryParams = { modo: 'edit' };
    this.router.navigate(['/entregas', id], { queryParams });

    console.log(`✅ Navegando a editar entrega ${id}`);
  }

  calificarEntrega(id: number): void {
    const entrega = this.entregas.find(e => e.id === id);

    if (!entrega) {
      this.error = "❌ Entrega no encontrada";
      return;
    }

    // ✅ VALIDAR PERMISOS
    const validacion = this.validarAccionProfesor(entrega, 'calificar');

    if (!validacion.permitido) {
      this.error = validacion.mensaje || "❌ No tienes permisos para calificar esta entrega";
      setTimeout(() => this.error = null, 5000);
      return;
    }

    if (entrega.estado !== EstadoEntrega.ENTREGADA) {
      this.error = "❌ Solo se pueden calificar entregas en estado 'Entregada'";
      setTimeout(() => this.error = null, 3000);
      return;
    }

    // Proceder con la calificación
    const queryParams = { modo: 'calificar' };
    this.router.navigate(['/entregas', id], { queryParams });
  }

  descargarDocumento(id: number): void {
    this.entregaService.downloadDocumento(id).subscribe({
      next: (blob) => {
        const entrega = this.entregas.find(e => e.id === id);
        if (entrega && entrega.nombreDocumento) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = entrega.nombreDocumento;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }
      },
      error: (err) => {
        this.error = 'Error al descargar el documento';
        console.error('Error:', err);
      }
    });
  }

  eliminarEntrega(id: number): void {
    if (this.usuario?.rol === RolUsuario.ADMIN) {
      if (confirm('¿Está seguro de que desea eliminar esta entrega?')) {
        this.entregaService.deleteEntrega(id).subscribe({
          next: () => {
            this.successMessage = 'Entrega eliminada correctamente';
            this.loadTodasLasEntregasYFiltrar();
            setTimeout(() => this.successMessage = null, 3000);
          },
          error: (err) => {
            this.error = 'Error al eliminar la entrega';
            console.error('Error:', err);
          }
        });
      }
    }
  }

  getTareaInfo(): any {
    if (this.entregas.length > 0 && this.entregas[0].tarea) {
      return this.entregas[0].tarea;
    }
    return null;
  }
  esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

  esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  esAdmin(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }

  puedeEditarEntrega(entrega?: EntregaResponseDTO): boolean {
     if (this.esAdmin()) return true;

    // ✅ NUEVO: Alumno puede editar sus propias entregas
    if (this.esAlumno() && entrega) {
      return this.puedeAlumnoEditarEntrega(entrega);
    }

    // Profesores no pueden editar entregas (solo calificar)
    return false;
  }

  puedeCalificarEntrega(entrega : EntregaResponseDTO): boolean{
    console.log('🔍 [DEBUG] Verificando si puede calificar entrega:', {
      entregaId: entrega.id,
      estado: entrega.estado,
      esProfesor: this.esProfesor(),
      profesorLoggeado: this.usuario?.profesorId,
      profesorDeLaTarea: entrega.tarea?.profesor?.id,
      puedeCalificar: this.puedeCalificarEstaEntrega(entrega)
    });

    return this.puedeCalificarEstaEntrega(entrega);
  }


  puedeEliminarEntrega(): boolean {
    return this.esAdmin();
  }

  getHeaderTitle(): string {
    if (this.tareaId) {
      const tarea = this.getTareaInfo();
      if (tarea) {
        return `Entregas de: ${tarea.nombre}`;
      }
      return 'Entregas de la Tarea';
    }

  // ✅ NUEVO: Título específico para entregas de un alumno
    if (this.alumnoId && this.alumnoEspecifico) {
      return `Entregas de: ${this.alumnoEspecifico.nombre} ${this.alumnoEspecifico.apellido}`;
    } else if (this.alumnoId) {
      return 'Entregas del Alumno';
    }

    if (this.profesorId && this.activeTab === 'pendientes') {
      return 'Entregas Pendientes de Calificación';
    } else if (this.esProfesor()) {
      return 'Entregas de Mis Tareas';
    } else if (this.esAlumno()) {
      return 'Mis Entregas';
    } else {
      return 'Todas las Entregas';
    }
  }

  calificarRapido(entregaId: number, nota: number): void {
    if (!this.esProfesor()) return;

    const calificacion = {
      nota: nota,
      comentarios: `Calificación rápida: ${nota}/10`
    };

    this.entregaService.calificarEntrega(entregaId, calificacion).subscribe({
      next: (entrega) => {
        this.successMessage = `Entrega calificada con ${nota}/10`;
        this.loadEntregasByTarea(); // Recargar lista
        setTimeout(() => this.successMessage = null, 3000);
      },
      error: (err) => {
        this.error = 'Error al calificar la entrega';
        console.error('Error:', err);
      }
    });
  }

  // ✅ NUEVO MÉTODO: Estadísticas de entregas para profesores
  getEstadisticasEntregas(): any {
    const total = this.entregas.length;
    const entregadas = this.entregas.filter(e => e.estado === EstadoEntrega.ENTREGADA).length;
    const calificadas = this.entregas.filter(e => e.estado === EstadoEntrega.CALIFICADA).length;
    const fueraPlazo = this.entregas.filter(e => e.estado === EstadoEntrega.FUERA_PLAZO).length;
    const pendientes = this.entregas.filter(e => e.estado === EstadoEntrega.PENDIENTE).length;

    return {
      total,
      entregadas,
      calificadas,
      fueraPlazo,
      pendientes,
      porcentajeEntrega: total > 0 ? Math.round((entregadas + calificadas + fueraPlazo) / total * 100) : 0
    };
  }

  getEstadoColorDetallado(entrega: EntregaResponseDTO): string {
    switch (entrega.estado) {
      case EstadoEntrega.PENDIENTE:
        return '#ff9800'; // Naranja
      case EstadoEntrega.ENTREGADA:
        return '#2196f3'; // Azul
      case EstadoEntrega.CALIFICADA:
        return '#4caf50'; // Verde
      case EstadoEntrega.FUERA_PLAZO:
        // ✅ NUEVO: Color diferente para entregas automáticas
        if (this.entregaService.esEntregaAutomaticaPorVencimiento(entrega)) {
          return '#9e9e9e'; // Gris para automáticas
        }
        return '#f44336'; // Rojo para entregas tardías normales
      default:
        return '#666';
    }
  }

  tieneDocumentoProfesor(entrega: EntregaResponseDTO): boolean {
    return this.entregaService.tieneDocumentoProfesor(entrega);
  }

  descargarDocumentoProfesor(id: number): void {
    this.entregaService.downloadDocumentoProfesor(id).subscribe({
      next: (blob) => {
        const entrega = this.entregas.find(e => e.id === id);
        if (entrega && entrega.nombreDocumentoProfesor) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = entrega.nombreDocumentoProfesor;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }
      },
      error: (err) => {
        this.error = 'Error al descargar el documento del profesor';
        console.error('Error:', err);
      }
    });
  }
  // ✅ NUEVO MÉTODO: Cargar entregas de un alumno específico
loadEntregasByAlumnoEspecifico(): void {
  if (!this.alumnoId) return;

  this.loading = true;
  this.error = null;

  console.log('👤 [ENTREGAS] Cargando entregas para alumno ID:', this.alumnoId);

  // Cargar todas las entregas y filtrar por el alumno específico
  this.entregaService.getEntregas(0, 1000, this.sortBy, this.sortDirection).subscribe({
    next: (page) => {
      console.log('👤 [ENTREGAS] Total entregas obtenidas:', page.content.length);

      // Filtrar solo las entregas del alumno específico
      const entregasDelAlumno = page.content.filter(entrega =>
        entrega.alumno?.id === this.alumnoId
      );

      console.log('👤 [ENTREGAS] Entregas del alumno filtradas:', entregasDelAlumno.length);

      this.entregasOriginales = entregasDelAlumno;
      this.entregas = [...this.entregasOriginales];

      // Obtener información del alumno para el título (si hay entregas)
      if (entregasDelAlumno.length > 0 && entregasDelAlumno[0].alumno) {
        this.alumnoEspecifico = entregasDelAlumno[0].alumno;
      }

      this.updatePage();
      this.loading = false;
    },
    error: (err) => {
      this.error = "Error al cargar las entregas del alumno";
      this.loading = false;
      console.error("Error: ", err);
    }
  });
}
  getAlumnoEspecificoInfo(): any {
    return this.alumnoEspecifico;
  }

  puedeEditarCalificacion(entrega: EntregaResponseDTO): boolean {
    // Solo profesores pueden editar calificaciones
    if (!this.esProfesor()) return false;

    // Solo si la entrega está calificada
    if (entrega.estado !== EstadoEntrega.CALIFICADA) return false;

    // Solo si es el profesor que creó la tarea
    const profesorDeLaTarea = entrega.tarea?.profesor?.id;
    const profesorLoggeado = this.usuario?.profesorId;

    return profesorDeLaTarea === profesorLoggeado;
  }

  // Agregar este método para la acción de editar calificación
  editarCalificacion(id: number): void {
    const entrega = this.entregas.find(e => e.id === id);

    if (!entrega) {
      this.error = "❌ Entrega no encontrada";
      return;
    }

    if (!this.puedeEditarCalificacion(entrega)) {
      this.error = "❌ No tienes permisos para editar esta calificación";
      setTimeout(() => this.error = null, 5000);
      return;
    }

    // Navegar al formulario en modo editar-calificacion
    const queryParams = { modo: 'editar-calificacion' };
    this.router.navigate(['/entregas', id], { queryParams });
  }



}
