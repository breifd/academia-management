import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';

import { Page } from '../../../interfaces/page';
import { AlumnoService } from '../../../services/alumno.service';
import { Router } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';
import { AlumnoResponseDTO } from '../../../interfaces/alumno-entity';
import { AuthService } from '../../../services/auth.service';
import { CursoService } from '../../../services/curso.service';

@Component({
  selector: 'app-lista-alumnos',
  imports: [CommonModule, FormsModule,PaginationComponent],
  templateUrl: './lista-alumnos.component.html',
  styleUrl: './lista-alumnos.component.scss'
})
export class ListaAlumnosComponent implements OnInit {

  alumnos: AlumnoResponseDTO[] =[];
  page: Page<AlumnoResponseDTO> |null = null; // Propiedad para almacenar la página de alumnos
  // Propiedades para la paginación
  currentPage: number = 0; // Página actual
  pageSize: number = 10; // Tamaño de página
  sortBy: string = 'id';
  sortDirection: string = 'asc';
  nombreFilter: string = '';
  apellidoFilter: string = '';

  isSearchActive: boolean = false; // Propiedad para saber si hay una búsqueda activa

  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;

  private cursosCompartidosCache: Map<number, boolean> = new Map();

  constructor(private alumnoService: AlumnoService,
    private router : Router,
    private usuarioService : UsuarioService,
    private authService: AuthService,
    private cursoService: CursoService) {} // Constructor del componente, inyectando el servicio de alumnos

  ngOnInit(): void {
    this.getAlumnos(); // Llama al método para obtener los alumnos al inicializar el componente
  }

 getAlumnos(): void {
  this.loading = true;
  this.error = null;

  this.alumnoService.getAlumnos(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
    next: async (response) => {
      this.page = response;
      this.alumnos = response.content;
      this.loading = false;

      // 🔥 CARGAR PERMISOS PARA PROFESORES
      if (this.authService.isProfesor()) {
        // Cargar permisos en paralelo para todos los alumnos
        const permissionPromises = this.alumnos.map(alumno =>
          this.loadPermissionsForAlumno(alumno)
        );

        try {
          await Promise.all(permissionPromises);
        } catch (error) {
          console.error('Error cargando permisos:', error);
        }
      }
    },
    error: (error) => {
      this.error = 'Error al cargar los alumnos';
      this.loading = false;
      console.error('Error al cargar los alumnos:', error);
    }
  });
}
  buscar(): void {
  if(!this.isSearchActive && !this.nombreFilter.trim() && !this.apellidoFilter.trim()){
    this.getAlumnos();
    return;
  }
  this.loading = true;
  this.error = null;

  if(!this.isSearchActive){
    this.currentPage = 0;
  }
  this.isSearchActive = true;

  this.alumnoService.searchAlumnos(this.nombreFilter, this.apellidoFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
    next: async (page) => {
      this.page = page;
      this.alumnos = page.content;
      this.loading = false;

      // 🔥 CARGAR PERMISOS PARA PROFESORES
      if (this.authService.isProfesor()) {
        const permissionPromises = this.alumnos.map(alumno =>
          this.loadPermissionsForAlumno(alumno)
        );

        try {
          await Promise.all(permissionPromises);
        } catch (error) {
          console.error('Error cargando permisos:', error);
        }
      }
    },
    error: (error) => {
      this.error = 'Error al cargar los alumnos';
      this.loading = false;
      console.error('Error al cargar los alumnos:', error);
    }
  });
}

  onPageChange(page: number): void {
    // Método para manejar el cambio de página
    this.currentPage = page;
    // Llama al método para obtener los alumnos de la nueva página
    if (this.nombreFilter.trim() || this.apellidoFilter.trim()) {
      this.buscar();
    } else {
      this.getAlumnos();
    }
  }

  resetFilters(): void {
    // Método para restablecer los filtros
    this.nombreFilter = '';
    this.apellidoFilter = '';
    this.currentPage = 0;
    this.isSearchActive = false;
    this.getAlumnos();
  }

  formatDate(dateString?: string): string {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString();
  }
  verAlumno(id: number): void {
    const queryParams ={modo: "view"};
    this.router.navigate(['/alumnos', id], { queryParams }); // Navega a la vista del alumno con el ID proporcionado
  }
  editarAlumno(id: number): void {
    const queryParams = { modo: 'edit' };
    this.router.navigate(['/alumnos', id], { queryParams }); // Navega a la vista de edición del alumno con el ID proporcionado

  }
  eliminarAlumno(id: number): void {
  if (confirm('¿Está seguro de que desea eliminar este alumno? También se eliminará su usuario asociado si existe.')) {
    this.loading = true;
    this.error = null;

    console.log('🗑️ Iniciando eliminación del alumno ID:', id);

    // PASO 1: Verificar si tiene usuario asociado
    this.usuarioService.getUsuarioByAlumnoId(id).subscribe({
      next: (usuario) => {
        console.log('✅ Usuario encontrado:', usuario.username);

        // PASO 2: Eliminar el usuario primero
        this.usuarioService.deleteUsuario(usuario.id!).subscribe({
          next: () => {
            console.log('✅ Usuario eliminado exitosamente');
            this.eliminarSoloAlumno(id);
          },
          error: (err) => {
            console.error('❌ Error al eliminar usuario:', err);
            this.eliminarSoloAlumno(id);
          }
        });
      },
      error: (err) => {
        if (err.status === 404) {
          console.log('ℹ️ Alumno sin usuario asociado');
          this.eliminarSoloAlumno(id);
        } else {
          console.error('❌ Error al verificar usuario:', err);
          this.error = 'Error al verificar usuario asociado';
          this.loading = false;
        }
      }
    });
  }
}

private eliminarSoloAlumno(id: number): void {
  this.alumnoService.deleteAlumno(id).subscribe({
    next: () => {
      console.log('✅ Alumno eliminado exitosamente');
      this.loading = false;

      if (this.isSearchActive) {
        this.buscar();
      } else {
        this.getAlumnos();
      }
    },
    error: (error) => {
      console.error('❌ Error al eliminar alumno:', error);
      this.error = 'Error al eliminar el alumno';
      this.loading = false;
    }
  });
}
  nuevoAlumno(): void {
    const queryParams = { modo: 'crear' };
    this.router.navigate(['/alumnos/nuevo'], {queryParams}); // Navega a la vista de creación de un nuevo alumno
  }

  verTareas(): void{
    this.router.navigate(['/tareas']); // Navega a la vista de tareas
  }

   verTareasAlumno(alumnoId: number): void {
    this.router.navigate(['/tareas'], {
      queryParams: { alumnoId: alumnoId, filtro: 'alumno' }
    });
  }

  // Ver entregas de un alumno
  verEntregasAlumno(alumnoId: number): void {
    this.router.navigate(['/entregas'], {
      queryParams: { alumnoId: alumnoId, filtro: 'alumno' }
    });
  }
  canCreateAlumno(): boolean {
    return this.authService.isProfesor() || this.authService.isAdmin();
  }

  canEditAlumno(alumno: AlumnoResponseDTO): boolean {
  // Admin y profesor siempre pueden editar
    if (this.authService.isAdmin() || this.authService.isProfesor()) {
      return true;
    }

    // Si es alumno, solo puede editar su propio perfil
    if (this.authService.isAlumno()) {
      const currentUser = this.authService.currentUserValue;
      return currentUser?.alumnoId === alumno.id;
    }

    return false;
  }

/**
 * Verifica si el usuario puede eliminar un alumno
 * Solo ADMIN puede eliminar alumnos
 */
  canDeleteAlumno(): boolean {
    return this.authService.isAdmin();
  }


  private async profesorComparteCursoConAlumno(alumnoId: number): Promise<boolean> {
    if (!this.authService.isProfesor()) {
      return false;
    }

    const currentUser = this.authService.currentUserValue;
    if (!currentUser?.profesorId) {
      return false;
    }

    // Verificar cache primero
    const cacheKey = alumnoId;
    if (this.cursosCompartidosCache.has(cacheKey)) {
      return this.cursosCompartidosCache.get(cacheKey)!;
    }

    try {
      // Obtener cursos del profesor actual
      const cursosProfesorResponse = await this.cursoService.getCursosByProfesor(
        currentUser.profesorId, 0, 1000, 'id', 'asc'
      ).toPromise();

      // Obtener cursos del alumno
      const cursosAlumnoResponse = await this.alumnoService.getCursosByAlumno(
        alumnoId, 0, 1000, 'id', 'asc'
      ).toPromise();

      if (!cursosProfesorResponse?.content || !cursosAlumnoResponse?.content) {
        this.cursosCompartidosCache.set(cacheKey, false);
        return false;
      }

      // Verificar si hay intersección de cursos
      const cursosProfesorIds = cursosProfesorResponse.content.map(c => c.id);
      const cursosAlumnoIds = cursosAlumnoResponse.content.map(c => c.id);

      const tienesCursosCompartidos = cursosProfesorIds.some(profesorCursoId =>
        cursosAlumnoIds.includes(profesorCursoId)
      );

      // Guardar en cache
      this.cursosCompartidosCache.set(cacheKey, tienesCursosCompartidos);

      return tienesCursosCompartidos;

    } catch (error) {
      console.error('Error verificando cursos compartidos:', error);
      // En caso de error, no permitir acceso por seguridad
      this.cursosCompartidosCache.set(cacheKey, false);
      return false;
    }
  }

  /**
   * Verifica si el usuario puede ver tareas de un alumno específico (VERSIÓN ROBUSTA)
   * - ADMIN: puede ver tareas de cualquier alumno
   * - PROFESOR: solo puede ver tareas de alumnos de SUS cursos
   * - ALUMNO: solo puede ver sus propias tareas
   */
  async canViewTareasAlumnoRobust(alumno: AlumnoResponseDTO): Promise<boolean> {
    // Admin siempre puede ver todas las tareas
    if (this.authService.isAdmin()) {
      return true;
    }

    // Si es alumno, solo puede ver sus propias tareas
    if (this.authService.isAlumno()) {
      const currentUser = this.authService.currentUserValue;
      return currentUser?.alumnoId === alumno.id;
    }

    // Si es profesor, verificar si comparte cursos con el alumno
    if (this.authService.isProfesor()) {
      return await this.profesorComparteCursoConAlumno(alumno.id!);
    }

    return false;
  }

  /**
   * Verifica si el usuario puede ver entregas de un alumno específico (VERSIÓN ROBUSTA)
   * Misma lógica que las tareas
   */
  async canViewEntregasAlumnoRobust(alumno: AlumnoResponseDTO): Promise<boolean> {
    return await this.canViewTareasAlumnoRobust(alumno);
  }

  // 🔥 MÉTODOS SÍNCRONOS PARA USO EN TEMPLATE (con estados de carga)

  /**
   * Estados de los botones para cada alumno
   */
  buttonStates: Map<number, {
    canViewTareas: boolean | null;
    canViewEntregas: boolean | null;
    loading: boolean;
  }> = new Map();

  /**
   * Inicializar estado de botones para un alumno
   */
  private initButtonState(alumnoId: number): void {
    if (!this.buttonStates.has(alumnoId)) {
      this.buttonStates.set(alumnoId, {
        canViewTareas: null,
        canViewEntregas: null,
        loading: true
      });
    }
  }

  /**
   * Cargar permisos para un alumno específico
   */
  async loadPermissionsForAlumno(alumno: AlumnoResponseDTO): Promise<void> {
    if (!alumno.id) return;

    this.initButtonState(alumno.id);
    const state = this.buttonStates.get(alumno.id)!;

    state.loading = true;

    try {
      const [canViewTareas, canViewEntregas] = await Promise.all([
        this.canViewTareasAlumnoRobust(alumno),
        this.canViewEntregasAlumnoRobust(alumno)
      ]);

      state.canViewTareas = canViewTareas;
      state.canViewEntregas = canViewEntregas;
    } catch (error) {
      console.error('Error cargando permisos para alumno', alumno.id, error);
      state.canViewTareas = false;
      state.canViewEntregas = false;
    } finally {
      state.loading = false;
    }
  }

  /**
   * Métodos síncronos para usar en el template
   */
  canViewTareasAlumno(alumno: AlumnoResponseDTO): boolean {
    if (!alumno.id) return false;

    // Para casos simples (admin y propio alumno) responder inmediatamente
    if (this.authService.isAdmin()) return true;

    if (this.authService.isAlumno()) {
      const currentUser = this.authService.currentUserValue;
      return currentUser?.alumnoId === alumno.id;
    }

    // Para profesores, usar el estado cacheado
    const state = this.buttonStates.get(alumno.id);
    return state?.canViewTareas === true;
  }

  canViewEntregasAlumno(alumno: AlumnoResponseDTO): boolean {
    if (!alumno.id) return false;

    // Para casos simples (admin y propio alumno) responder inmediatamente
    if (this.authService.isAdmin()) return true;

    if (this.authService.isAlumno()) {
      const currentUser = this.authService.currentUserValue;
      return currentUser?.alumnoId === alumno.id;
    }

    // Para profesores, usar el estado cacheado
    const state = this.buttonStates.get(alumno.id);
    return state?.canViewEntregas === true;
  }

  isLoadingPermissions(alumno: AlumnoResponseDTO): boolean {
    if (!alumno.id) return false;
    const state = this.buttonStates.get(alumno.id);
    return state?.loading === true;
  }

}
