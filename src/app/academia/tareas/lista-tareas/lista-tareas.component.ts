// lista-tareas.component.ts - Optimizado para mejor rendimiento

import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';
import { Subject, takeUntil, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';

import { TareaService } from '../../../services/tarea.service';
import { AuthService } from '../../../services/auth.service';
import { CursoService } from '../../../services/curso.service';

import { Page } from '../../../interfaces/page';
import { TareaResponseDTO } from '../../../interfaces/tarea-entity';
import { LoginResponse, RolUsuario } from '../../../interfaces/usuario';
import { CursoSimpleDTO } from '../../../interfaces/curso-entity';
import { EntregaResponseDTO } from '../../../interfaces/entregas-entity';
import { EntregaService } from '../../../services/entrega.service';

@Component({
  selector: 'app-lista-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-tareas.component.html',
  styleUrl: './lista-tareas.component.scss'
})
export class ListaTareasComponent implements OnInit, OnDestroy {

  // ✅ OPTIMIZACIÓN: Subject para destruir subscripciones
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  tareas: TareaResponseDTO[] = [];
  tareasOriginales: TareaResponseDTO[] = [];
  page: Page<TareaResponseDTO> | null = null;
  cursos: CursoSimpleDTO[] = [];
  entregasDelAlumno: EntregaResponseDTO[] = [];

  alumnoIdEspecifico: number | null = null;
  profesorIdEspecifico: number | null = null;

  // Usuario y roles
  usuario: LoginResponse | null = null;
  rolUsuario = RolUsuario;

  // Parámetros de búsqueda y filtrado
  currentPage: number = 0;
  pageSize: number = 10;
  sortBy: string = 'fechaLimite';
  sortDirection: string = 'asc';

  // Filtros
  nombreFilter: string = '';
  cursoFilter: number | null = null;
  estadoFilter: 'todas' | 'pendientes' | 'vencidas' | 'activas' = 'todas';

  // Estados de la aplicación
  loading: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;

  constructor(
    private tareaService: TareaService,
    private authService: AuthService,
    private cursoService: CursoService,
    private router: Router,
    private route: ActivatedRoute,
    private entregaService: EntregaService
  ) {
    // ✅ OPTIMIZACIÓN: Debounce para búsqueda
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.filtrarTareas();
    });
  }

    ngOnInit(): void {
    console.log('🔄 [LISTA TAREAS] Inicializando componente...');

    // ✅ MODIFICAR - Detectar si se está consultando un alumno o profesor específico
    this.route.queryParams.subscribe(params => {
      if (params['alumnoId']) {
        this.alumnoIdEspecifico = +params['alumnoId'];
        this.profesorIdEspecifico = null; // Reset
        console.log('👤 [LISTA TAREAS] Consultando tareas del alumno ID:', this.alumnoIdEspecifico);
      } else if (params['profesorId']) {  // <-- NUEVA CONDICIÓN
        this.profesorIdEspecifico = +params['profesorId'];
        this.alumnoIdEspecifico = null; // Reset
        console.log('👨‍🏫 [LISTA TAREAS] Consultando tareas del profesor ID:', this.profesorIdEspecifico);
      }
    });

    this.authService.currentUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        console.log('👤 [LISTA TAREAS] Usuario cargado:', user?.rol);
        this.usuario = user;
        if (this.usuario) {
          this.loadCursos();
          this.loadTareas();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCursos(): void {
    console.log('📚 [LISTA TAREAS] Cargando cursos...');

    this.cursoService.getCursosLista()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cursos) => {
          this.cursos = cursos;
          console.log('✅ [LISTA TAREAS] Cursos cargados:', cursos.length);
        },
        error: (err) => {
          console.error('❌ [LISTA TAREAS] Error al cargar cursos:', err);
        }
      });
  }

  loadTareas(): void {
  if (!this.usuario) {
    console.log('⚠️ [LISTA TAREAS] No hay usuario, saltando carga de tareas');
    return;
  }

  console.log('📋 [LISTA TAREAS] Cargando tareas para rol:', this.usuario.rol);
  this.loading = true;
  this.error = null;

  // ✅ MODIFICAR - Agregar lógica para profesor específico
  if (this.alumnoIdEspecifico) {
    console.log('🎯 [LISTA TAREAS] Modo consulta específica - Alumno ID:', this.alumnoIdEspecifico);
    this.loadTareasParaAlumnoEspecifico(this.alumnoIdEspecifico);
  } else if (this.profesorIdEspecifico) {  // <-- NUEVA CONDICIÓN
    console.log('🎯 [LISTA TAREAS] Modo consulta específica - Profesor ID:', this.profesorIdEspecifico);
    this.loadTareasParaProfesorEspecifico(this.profesorIdEspecifico);
  } else {
    // Lógica original sin cambios
    if (this.esAlumno()) {
      this.loadTareasParaAlumno();
    } else if (this.esProfesor()) {
      this.loadTareasParaProfesor();
    } else {
      this.loadTodasLasTareas();
    }
  }
}

  // ✅ MÉTODO ESPECÍFICO: Cargar tareas solo para el alumno logueado
  loadTareasParaAlumno(): void {
    if (!this.usuario?.alumnoId) {
      this.error = 'No se pudo identificar al alumno';
      this.loading = false;
      return;
    }

    // Cargar tanto las tareas como las entregas del alumno
    this.loadTareasYEntregasParaAlumno(this.usuario.alumnoId);
  }

  loadTareasParaAlumnoEspecifico(alumnoId: number): void {
    console.log('🎓 [LISTA TAREAS] Cargando tareas para alumno ID:', alumnoId);

    // Si es el alumno logueado, cargar también sus entregas
    if (this.esAlumno() && this.usuario?.alumnoId === alumnoId) {
      this.loadTareasYEntregasParaAlumno(alumnoId);
    } else {
      // Si no es el alumno logueado (ej: admin viendo tareas de un alumno), solo cargar tareas
      this.loadSoloTareasParaAlumno(alumnoId);
    }
  }

  // ✅ MÉTODO ESPECÍFICO: Cargar tareas para el profesor logueado
  loadTareasParaProfesor(): void {
    if (!this.usuario?.profesorId) {
      this.error = 'No se pudo identificar al profesor';
      this.loading = false;
      return;
    }

    console.log('👨‍🏫 [LISTA TAREAS] Cargando tareas para profesor ID:', this.usuario.profesorId);

    this.tareaService.getTareasByProfesor(this.usuario.profesorId, 0, 1000, this.sortBy, this.sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          console.log('✅ [LISTA TAREAS] Tareas de profesor cargadas:', page.content.length);
          this.tareasOriginales = page.content;
          this.filtrarTareas();
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ [LISTA TAREAS] Error tareas profesor:', err);
          this.error = 'Error al cargar tus tareas';
          this.loading = false;
        }
      });
  }

  // ✅ MÉTODO ESPECÍFICO: Cargar todas las tareas (para admin)
  loadTodasLasTareas(): void {
    console.log('👑 [LISTA TAREAS] Cargando todas las tareas (admin)');

    this.tareaService.getTareas(0, 1000, this.sortBy, this.sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          console.log('✅ [LISTA TAREAS] Todas las tareas cargadas:', page.content.length);
          this.tareasOriginales = page.content;
          this.filtrarTareas();
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ [LISTA TAREAS] Error todas las tareas:', err);
          this.error = 'Error al cargar las tareas';
          this.loading = false;
        }
      });
  }

  // ✅ FILTRADO EN EL FRONTEND OPTIMIZADO
  filtrarTareas(): void {
    console.log('🔍 [LISTA TAREAS] Filtrando tareas...');
    console.log('  - Filtro nombre:', this.nombreFilter);
    console.log('  - Filtro curso:', this.cursoFilter);
    console.log('  - Filtro estado:', this.estadoFilter);

    let tareasFiltradas = [...this.tareasOriginales];

    // Filtro por nombre
    if (this.nombreFilter.trim()) {
      const filtroLower = this.nombreFilter.toLowerCase();
      tareasFiltradas = tareasFiltradas.filter(tarea =>
        tarea.nombre.toLowerCase().includes(filtroLower) ||
        (tarea.descripcion && tarea.descripcion.toLowerCase().includes(filtroLower))
      );
    }

    // Filtro por curso
    if (this.cursoFilter) {
      tareasFiltradas = tareasFiltradas.filter(tarea =>
        tarea.curso?.id === this.cursoFilter
      );
    }

    // Filtro por estado
    if (this.estadoFilter !== 'todas') {
      const ahora = new Date();
      tareasFiltradas = tareasFiltradas.filter(tarea => {
        switch (this.estadoFilter) {
          case 'pendientes':
            return tarea.fechaLimite && new Date(tarea.fechaLimite) >= ahora;
          case 'vencidas':
            return tarea.fechaLimite && new Date(tarea.fechaLimite) < ahora;
          case 'activas':
            return !tarea.fechaPublicacion || new Date(tarea.fechaPublicacion) <= ahora;
          default:
            return true;
        }
      });
    }

    this.tareas = tareasFiltradas;
    this.currentPage = 0; // Resetear a primera página
    this.updatePage();

    console.log('✅ [LISTA TAREAS] Filtrado completo. Tareas resultantes:', this.tareas.length);
  }

  // ✅ OPTIMIZACIÓN: Búsqueda con debounce
  onSearchChange(): void {
    this.searchSubject.next(this.nombreFilter);
  }

  search(): void {
    this.filtrarTareas();
  }

  resetFilters(): void {
    console.log('🧹 [LISTA TAREAS] Limpiando filtros...');
    this.nombreFilter = '';
    this.cursoFilter = null;
    this.estadoFilter = 'todas';
    this.currentPage = 0;
    this.filtrarTareas();
  }

  // ✅ PAGINACIÓN EN EL FRONTEND
  updatePage(): void {
    const totalElements = this.tareas.length;
    const totalPages = Math.ceil(totalElements / this.pageSize);

    this.page = {
      content: this.getPaginatedTareas(),
      totalElements: totalElements,
      totalPages: totalPages,
      size: this.pageSize,
      number: this.currentPage,
      first: this.currentPage === 0,
      last: this.currentPage >= totalPages - 1,
      empty: totalElements === 0,
      numberOfElements: this.getPaginatedTareas().length,
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

  getPaginatedTareas(): TareaResponseDTO[] {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.tareas.slice(startIndex, endIndex);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePage();
  }

  // ✅ MÉTODOS DE NAVEGACIÓN
  crearTarea(): void {
    console.log('🚀 [LISTA TAREAS] Navegando a crear tarea...');
    this.router.navigate(['/tareas/nuevo'], {
      queryParams: { modo: 'crear' }
    });
  }

  verTarea(id: number): void {
    console.log('👁️ [LISTA TAREAS] Ver tarea ID:', id);
    this.router.navigate(['/tareas', id], {
      queryParams: { modo: 'view' }
    });
  }

  editarTarea(id: number): void {
    console.log('✏️ [LISTA TAREAS] Editar tarea ID:', id);
    this.router.navigate(['/tareas', id], {
      queryParams: { modo: 'edit' }
    });
  }

  eliminarTarea(id: number): void {
    if (!confirm('¿Está seguro de que desea eliminar esta tarea?')) {
      return;
    }

    console.log('🗑️ [LISTA TAREAS] Eliminando tarea ID:', id);

    this.tareaService.deleteTarea(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ [LISTA TAREAS] Tarea eliminada correctamente');
          this.successMessage = 'Tarea eliminada correctamente';
          this.loadTareas();
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          console.error('❌ [LISTA TAREAS] Error al eliminar:', err);
          this.error = 'Error al eliminar la tarea';
        }
      });
  }

  // Navegar a entregas de una tarea específica
  verEntregasTarea(tareaId: number): void {
    console.log('📋 [LISTA TAREAS] Ver entregas tarea ID:', tareaId);
    this.router.navigate(['/entregas'], {
      queryParams: { tareaId: tareaId }
    });
  }

  // ✅ ACCIÓN ESPECÍFICA PARA ALUMNOS: Hacer entrega
  hacerEntrega(tareaId: number): void {
    if (this.esAlumno()) {
      console.log('📤 [LISTA TAREAS] Hacer entrega tarea ID:', tareaId);
      this.router.navigate(['/tareas', tareaId, 'entrega']);
    }
  }

  // ✅ MÉTODOS DE UTILIDAD
  formatFecha(fecha?: string): string {
    if (!fecha) return 'No definida';
    try {
      const fechaObj = new Date(fecha);
      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  isTareaVencida(tarea: TareaResponseDTO): boolean {
    if (!tarea.fechaLimite) return false;
    return new Date(tarea.fechaLimite) < new Date();
  }

  getEstadoTarea(tarea: TareaResponseDTO): string {
    if (this.isTareaVencida(tarea)) return 'Vencida';
    if (tarea.fechaPublicacion && new Date(tarea.fechaPublicacion) > new Date()) return 'Programada';
    return 'Activa';
  }

  getEstadoColor(tarea: TareaResponseDTO): string {
    const estado = this.getEstadoTarea(tarea);
    switch (estado) {
      case 'Vencida': return '#f44336';
      case 'Programada': return '#ff9800';
      case 'Activa': return '#4caf50';
      default: return '#666';
    }
  }

  tieneDocumento(tarea: TareaResponseDTO): boolean {
    return this.tareaService.tieneDocumento(tarea);
  }

  // ✅ VERIFICACIONES DE ROL
  esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

  esAdmin(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }

  puedeCrearTarea(): boolean {
    // ✅ MODIFICAR - No mostrar botón cuando se consulta alumno o profesor específico
    if (this.alumnoIdEspecifico || this.profesorIdEspecifico) return false;

    return this.esProfesor() || this.esAdmin();
  }


  puedeEditarTarea(tarea: TareaResponseDTO): boolean {
    if (this.esAdmin()) return true;
    if (this.esProfesor() && this.usuario?.profesorId === tarea.profesor?.id) return true;
    return false;
  }

  puedeEliminarTarea(tarea: TareaResponseDTO): boolean {
    return this.puedeEditarTarea(tarea);
  }

  puedeVerEntregas(tarea: TareaResponseDTO): boolean {
    return this.puedeEditarTarea(tarea);
  }

   puedeHacerEntrega(tarea: TareaResponseDTO): boolean {
    if (!this.esAlumno()) return false;
    if (tarea.fechaPublicacion && new Date(tarea.fechaPublicacion) > new Date()) return false;

    // ✅ NUEVO: No permitir entregas si la tarea está vencida
    if (this.isTareaVencida(tarea)) {
      return false;
    }

    // ✅ NUEVO: No permitir entregas si ya entregó esta tarea
    if (this.yaEntregoTarea(tarea.id!)) {
      return false;
    }

    return true;
  }

  getHeaderTitle(): string {
    if (this.alumnoIdEspecifico) {
      return 'Tareas del Alumno';
    }

    // ✅ NUEVO - Título para profesor específico
    if (this.profesorIdEspecifico) {
      return 'Tareas del Profesor';
    }

    if (this.esAlumno()) return 'Mis Tareas Asignadas';
    if (this.esProfesor()) return 'Mis Tareas Creadas';
    return 'Todas las Tareas';
  }
  getEmptyMessage(): string {
    if (this.alumnoIdEspecifico) {
      return 'Este alumno no tiene tareas asignadas.';
    }

    // ✅ NUEVO - Mensaje para profesor específico
    if (this.profesorIdEspecifico) {
      return 'Este profesor no ha creado tareas aún.';
    }

    if (this.esAlumno()) return 'No tienes tareas asignadas en este momento.';
    if (this.esProfesor()) return 'No has creado ninguna tarea aún.';
    return 'No hay tareas registradas en el sistema.';
  }

  getTareasActivas(): number {
    return this.tareas.filter(t => !this.isTareaVencida(t)).length;
  }

  getTareasVencidas(): number {
    return this.tareas.filter(t => this.isTareaVencida(t)).length;
  }

  descargarDocumento(tareaId: number, nombreArchivo: string): void {
    console.log('📥 [LISTA TAREAS] Descargando documento tarea ID:', tareaId);

    this.tareaService.downloadDocumento(tareaId).subscribe({
      next: (blob) => {
        console.log('✅ [LISTA TAREAS] Documento descargado correctamente');

        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo;
        document.body.appendChild(a);
        a.click();

        // Limpiar
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      },
      error: (err) => {
        console.error('❌ [LISTA TAREAS] Error al descargar:', err);
        this.error = 'Error al descargar el documento. Inténtelo de nuevo más tarde.';
        setTimeout(() => this.error = null, 5000);
      }
    });
  }
  loadTareasParaProfesorEspecifico(profesorId: number): void {
  console.log('👨‍🏫 [LISTA TAREAS] Cargando tareas para profesor ID:', profesorId);

  this.tareaService.getTareasByProfesor(profesorId, 0, 1000, this.sortBy, this.sortDirection)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (page) => {
        console.log('✅ [LISTA TAREAS] Tareas de profesor específico cargadas:', page.content.length);
        this.tareasOriginales = page.content;
        this.filtrarTareas();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ [LISTA TAREAS] Error tareas profesor específico:', err);
        this.error = 'Error al cargar las tareas del profesor';
        this.loading = false;
      }
    });
}

  loadTareasYEntregasParaAlumno(alumnoId: number): void {
    console.log('🎓📤 [LISTA TAREAS] Cargando tareas Y entregas para alumno ID:', alumnoId);

    // Cargar tareas y entregas en paralelo
    const tareas$ = this.tareaService.getTareasByAlumno(alumnoId, 0, 1000, this.sortBy, this.sortDirection);
    const entregas$ = this.entregaService.getEntregas(0, 1000, 'id', 'desc');

    forkJoin({
      tareas: tareas$,
      entregas: entregas$
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (result) => {
        console.log('✅ [LISTA TAREAS] Tareas cargadas:', result.tareas.content.length);

        // Filtrar solo las entregas de este alumno
        this.entregasDelAlumno = result.entregas.content.filter(
          entrega => entrega.alumno?.id === alumnoId
        );

        console.log('✅ [LISTA TAREAS] Entregas del alumno cargadas:', this.entregasDelAlumno.length);

        this.tareasOriginales = result.tareas.content;
        this.filtrarTareas();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ [LISTA TAREAS] Error al cargar tareas y entregas:', err);
        this.error = 'Error al cargar las tareas del alumno';
        this.loading = false;
      }
    });
  }

  // ✅ NUEVO MÉTODO: Cargar solo tareas (para cuando no es el alumno logueado)
  loadSoloTareasParaAlumno(alumnoId: number): void {
    this.tareaService.getTareasByAlumno(alumnoId, 0, 1000, this.sortBy, this.sortDirection)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          console.log('✅ [LISTA TAREAS] Tareas de alumno cargadas:', page.content.length);
          this.tareasOriginales = page.content;
          this.filtrarTareas();
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ [LISTA TAREAS] Error tareas alumno:', err);
          this.error = 'Error al cargar las tareas del alumno';
          this.loading = false;
        }
      });
  }

  // ✅ NUEVO MÉTODO: Verificar si el alumno ya entregó una tarea
  yaEntregoTarea(tareaId: number): boolean {
    if (!this.esAlumno() || this.entregasDelAlumno.length === 0) {
      return false;
    }

    return this.entregasDelAlumno.some(entrega => entrega.tarea?.id === tareaId);
  }


}
