import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';

import { TareaService } from '../../../services/tarea.service';
import { AuthService } from '../../../services/auth.service';
import { CursoService } from '../../../services/curso.service';

import { Page } from '../../../interfaces/page';
import { TareaResponseDTO } from '../../../interfaces/tarea-entity';
import { LoginResponse, RolUsuario } from '../../../interfaces/usuario';
import { CursoSimpleDTO } from '../../../interfaces/curso-entity';

@Component({
  selector: 'app-lista-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-tareas.component.html',
  styleUrl: './lista-tareas.component.scss'
})
export class ListaTareasComponent implements OnInit {

  tareas: TareaResponseDTO[] = [];
  tareasOriginales: TareaResponseDTO[] = []; // Para filtrar en el frontend
  page: Page<TareaResponseDTO> | null = null;
  cursos: CursoSimpleDTO[] = [];

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
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.usuario = user;
      this.loadCursos();
      this.loadTareas();
    });
  }

  loadCursos(): void {
    this.cursoService.getCursosLista().subscribe({
      next: (cursos) => {
        this.cursos = cursos;
      },
      error: (err) => {
        console.error('Error al cargar cursos:', err);
      }
    });
  }

  loadTareas(): void {
    if (!this.usuario) return;

    this.loading = true;
    this.error = null;

    // 🔥 LÓGICA PRINCIPAL: Cargar tareas según el rol del usuario
    if (this.esAlumno()) {
      this.loadTareasParaAlumno();
    } else if (this.esProfesor()) {
      this.loadTareasParaProfesor();
    } else {
      this.loadTodasLasTareas();
    }
  }

  // ✅ MÉTODO ESPECÍFICO: Cargar tareas solo para el alumno logueado
  loadTareasParaAlumno(): void {
    if (!this.usuario?.alumnoId) {
      this.error = 'No se pudo identificar al alumno';
      this.loading = false;
      return;
    }

    // Usar el endpoint específico para obtener tareas del alumno
    this.tareaService.getTareasByAlumno(this.usuario.alumnoId, 0, 1000, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        console.log('🎯 Tareas cargadas para alumno:', page.content.length);
        this.tareasOriginales = page.content;
        this.filtrarTareas();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar tus tareas asignadas';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  // ✅ MÉTODO ESPECÍFICO: Cargar tareas para el profesor logueado
  loadTareasParaProfesor(): void {
    if (!this.usuario?.profesorId) {
      this.error = 'No se pudo identificar al profesor';
      this.loading = false;
      return;
    }

    this.tareaService.getTareasByProfesor(this.usuario.profesorId, 0, 1000, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        console.log('🎯 Tareas cargadas para profesor:', page.content.length);
        this.tareasOriginales = page.content;
        this.filtrarTareas();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar tus tareas';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  // ✅ MÉTODO ESPECÍFICO: Cargar todas las tareas (para admin)
  loadTodasLasTareas(): void {
    this.tareaService.getTareas(0, 1000, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        console.log('🎯 Todas las tareas cargadas:', page.content.length);
        this.tareasOriginales = page.content;
        this.filtrarTareas();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las tareas';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  // ✅ FILTRADO EN EL FRONTEND
  filtrarTareas(): void {
    let tareasFiltradas = [...this.tareasOriginales];

    // Filtro por nombre
    if (this.nombreFilter.trim()) {
      tareasFiltradas = tareasFiltradas.filter(tarea =>
        tarea.nombre.toLowerCase().includes(this.nombreFilter.toLowerCase()) ||
        (tarea.descripcion && tarea.descripcion.toLowerCase().includes(this.nombreFilter.toLowerCase()))
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
  }

  search(): void {
    this.filtrarTareas();
  }

  resetFilters(): void {
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
   console.log('🚀 Navegando a crear tarea...'); // Debug
  this.router.navigate(['/tareas/nuevo']);
  }

  verTarea(id: number): void {
    this.router.navigate(['/tareas', id]);
  }

  editarTarea(id: number): void {
    this.router.navigate(['/tareas', id], { queryParams: { modo: 'edit' } });
  }

  eliminarTarea(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar esta tarea?')) {
      this.tareaService.deleteTarea(id).subscribe({
        next: () => {
          this.successMessage = 'Tarea eliminada correctamente';
          this.loadTareas();
          setTimeout(() => this.successMessage = null, 3000);
        },
        error: (err) => {
          this.error = 'Error al eliminar la tarea';
          console.error('Error:', err);
        }
      });
    }
  }

  // Navegar a entregas de una tarea específica
  verEntregasTarea(tareaId: number): void {
    this.router.navigate(['/entregas'], { queryParams: { tareaId: tareaId } });
  }

  // ✅ ACCIÓN ESPECÍFICA PARA ALUMNOS: Hacer entrega
  hacerEntrega(tareaId: number): void {
    if (this.esAlumno()) {
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
    if (this.isTareaVencida(tarea)) {
      return 'Vencida';
    }
    if (tarea.fechaPublicacion && new Date(tarea.fechaPublicacion) > new Date()) {
      return 'Programada';
    }
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
    return tarea.tieneDocumento || false;
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

  // ✅ VERIFICAR SI EL ALUMNO PUEDE HACER LA ENTREGA
  puedeHacerEntrega(tarea: TareaResponseDTO): boolean {
    if (!this.esAlumno()) return false;

    // Verificar si la tarea ya está publicada
    if (tarea.fechaPublicacion && new Date(tarea.fechaPublicacion) > new Date()) {
      return false;
    }

    // Permitir entrega incluso si está vencida (el sistema manejará la penalización)
    return true;
  }

  getHeaderTitle(): string {
    if (this.esAlumno()) {
      return 'Mis Tareas Asignadas';
    } else if (this.esProfesor()) {
      return 'Mis Tareas Creadas';
    } else {
      return 'Todas las Tareas';
    }
  }

  getEmptyMessage(): string {
    if (this.esAlumno()) {
      return 'No tienes tareas asignadas en este momento.';
    } else if (this.esProfesor()) {
      return 'No has creado ninguna tarea aún.';
    } else {
      return 'No hay tareas registradas en el sistema.';
    }
  }

  getTareasActivas(): number {
    return this.tareas.filter(t => !this.isTareaVencida(t)).length;
  }

  getTareasVencidas(): number {
    return this.tareas.filter(t => this.isTareaVencida(t)).length;
  }
}
