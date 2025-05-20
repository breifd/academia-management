import { Component, OnInit } from '@angular/core';
import { CursoEntity } from '../../../interfaces/curso-entity';
import { Page } from '../../../interfaces/page';
import { CursoService } from '../../../services/curso.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';
import { ProfesorEntity } from '../../../interfaces/profesor-entity';
import { AlumnoEntity } from '../../../interfaces/alumno-entity';
import { AlumnoService } from '../../../services/alumno.service';
import { ProfesorService } from '../../../services/profesor.service';
import { forkJoin, map, of, switchMap } from 'rxjs';
import { fromReadableStreamLike } from 'rxjs/internal/observable/innerFrom';

@Component({
  selector: 'app-lista-curso',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-curso.component.html',
  styleUrl: './lista-curso.component.scss'
})
export class ListaCursoComponent implements OnInit{

  cursos : CursoEntity[] = [];
  page: Page<CursoEntity> | null = null;
  niveles: string[] = [];
  //Parametros de la paginacion y del filtrado
  currentPage: number = 0;
  pageSize: number = 10;
  sortBy: string = 'id';
  sortDirection: string = 'asc';
  nombreFilter: string = '';
  nivelFilter: string = '';
  plazasMinimas: number= 1;

  isSearchActive: boolean = false; // Propiedad para saber si hay una búsqueda activa
  activeTab : 'todos' | 'nivel' | 'disponibles'='todos';


  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;

  // Propiedades para el modal de profesores
  showProfesorModal: boolean = false;
  loadingProfesores: boolean = false;
  profesoresDisponibles: ProfesorEntity[] = [];
  selectedProfesorId: number | null = null;

  // Propiedades para el modal de alumnos
  showAlumnoModal: boolean = false;
  loadingAlumnos: boolean = false;
  alumnosDisponibles: AlumnoEntity[] = [];
  selectedAlumnoId: number | null = null;

  //Curso seleccionado donde realizar modificaciones
  cursoSeleccionado : CursoEntity | null = null;

   // Estado de procesamiento
  processingAction: boolean = false;

  constructor(private cursoService: CursoService, private router : Router, private alumnoService : AlumnoService, private profesorService: ProfesorService) {
    this.niveles = this.cursoService.getNiveles();
  }

  ngOnInit(): void {
    this.loadCursos(); // Carga los cursos al inicializar el componente

  }

  loadCursos():void{
    // Se establece el estado de carga y se inicializan las propiedades de error y búsqueda
    this.loading = true;
    this.error = null;
    this.activeTab = 'todos';
    this.isSearchActive = false;

    // Se llama al servicio para obtener los cursos
    this.cursoService.getCursos(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page; // Se asigna la página de cursos a la propiedad page
        this.cursos = page.content; // Se asigna el contenido de la página a la propiedad cursos
        this.loading = false; // Se establece el estado de carga a falso
        console.log('Cursos cargados:', this.cursos); // Añade esto para depuración
      },
      error: (err) => {
        this.error = 'Error al cargar los cursos'; // Se asigna un mensaje de error
        this.loading = false; // Se establece el estado de carga a falso
        console.error('Error al cargar los cursos:', err); // Se muestra el error en la consola
      }
    });
  }

  buscar():void{
    // Se verifica si hay filtros activos
    if(!this.isSearchActive && !this.nombreFilter.trim() && this.activeTab === 'todos'){
      this.loadCursos(); // Si no hay filtros, se cargan todos los cursos
      return;
    }

    this.loading = true;
    this.error = null;

    if(!this.isSearchActive){
      this.currentPage = 0; // Se resetea la página a 0 para mostrar los resultados de la búsqueda
    }
    this.isSearchActive = true; // Se marca que hay una búsqueda activa
    switch(this.activeTab){
      case 'nivel':
        this.buscarPorNivel();
        break;
      case 'disponibles':
        this.buscarCursosDisponibles();
        break;
      default:
        this.buscarPorNombre();
    }
  }

  buscarPorNivel():void{
    if(!this.nivelFilter.trim()){
      this.error = 'Por favor, seleccione un nivel.'; //No cargamos ningún curso si no hay un nivel seleccionado mostramos un error
      this.loading = false;
      return;
    }
    this.cursoService.getByNivel(this.nivelFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.cursos = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al buscar cursos por nivel. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });

  }

  buscarPorNombre():void{
    this.cursoService.searchCursos(this.nombreFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.cursos = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al buscar cursos. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  buscarCursosDisponibles():void{
    const plazasMinimas= this.plazasMinimas || 1;
    this.cursoService.getCursosConPlazasDisponibles(plazasMinimas, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page)=>{
        this.page=page;
        this.cursos=page.content;
        this.loading=false;
      }, error: (err)=>{
        this.error="Error al buscar con plazas disponibles"
        this.loading=true;
        console.log("Error: ",err)
      }
    });
  }


  onPageChange(page: number): void {
    this.currentPage = page;
    this.buscar();
  }

  // Método para cambiar la pestaña activa
  setActiveTab(tab: 'todos' | 'nivel' | 'disponibles'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.resetFilters();
    }
  }

  resetFilters(): void {
    this.nombreFilter = '';
    this.nivelFilter = '';
    this.currentPage = 0;
    this.isSearchActive = false;
    this.plazasMinimas=1;

    if (this.activeTab === 'todos') {
      this.loadCursos();
    }
  }

  verCurso(id: number): void {
    const queryParams = { modo: 'view' };
    this.router.navigate(['/cursos', id], { queryParams });
  }

  editarCurso(id: number): void {
    const queryParams = { modo: 'edit' };
    this.router.navigate(['/cursos', id], { queryParams });
  }
  eliminarCurso(id: number): void {
    if (confirm('¿Estás seguro de que deseas eliminar este curso?')) {
      this.cursoService.deleteCurso(id).subscribe({
        next: () => {
          if (this.isSearchActive) {
            this.buscar();
          } else {
            this.loadCursos();
          }
        },
        error: (error) => {
          this.error = 'Error al eliminar el curso';
          console.error('Error al eliminar el curso:', error);
        }
      });
    }
  }
  nuevoCurso(): void {
    const queryParams = { modo: 'crear' };
    this.router.navigate(['/cursos/nuevo'], { queryParams });
  }

   formatProfesores(curso: CursoEntity): string {
    return this.cursoService.formatProfesoresList(curso.profesores ?? []);
  }

  getNumeroAlumnos(curso: CursoEntity): number {
    if (!curso.alumnos) {
      return 0;
    }
    return Array.isArray(curso.alumnos) ? curso.alumnos.length : 0;
  }
   getFullProfesoresList(curso: CursoEntity): string {
    if (!curso.profesores || curso.profesores.length === 0) {
      return 'No hay profesores asignados';
    }

    return curso.profesores.map(p => `${p.nombre} ${p.apellido}`).join(', ');
  }
  hasPlazasDisponibles(curso: CursoEntity | null): boolean {
    if (!curso) {
      return false;
    }

    return this.cursoService.hasPlazasDisponibles(curso);
  }
  getPlazasDisponibles(curso: CursoEntity | null): number {
    if (!curso) {
      return 0;
    }

    return this.cursoService.getPlazasDisponibles(curso);
  }

  getMaxAlumnos(): number {
    return this.cursoService.getMaxAlumnos();
  }
  abrirModalProfesor(curso : CursoEntity): void{
    this.cursoSeleccionado= curso;
    this.showProfesorModal=true;
    this.loadingProfesores=true;
    this.selectedProfesorId=null;

    //Obtenemos todos los profesores y filtrar los que ya están en el curso
    forkJoin({
      todos: this.profesorService.getProfesoresLista(),
      asignados: this.cursoService.getProfesoresByCurso(curso.id!)
    }).subscribe({
      next: (r) =>{
        const profesoresAsignados = r.asignados;
        const profesoresAsignadosIds = profesoresAsignados.map(p => p.id);

         this.profesoresDisponibles = r.todos.filter(
          profesor => !profesoresAsignadosIds.includes(profesor.id)
        );
        this.loadingProfesores=false;
      }, error: (err) =>{
        console.error("Error al cargar el profesor ",err)
        this.loadingProfesores=false;
        this.error="Error al cargar la lista de profesores"
      }
    })
  }

  abrirModalAlumno(curso: CursoEntity): void {
    // No abrir el modal si no hay plazas disponibles
    if (!this.hasPlazasDisponibles(curso)) {
      return;
    }

    this.cursoSeleccionado = curso;
    this.showAlumnoModal = true;
    this.loadingAlumnos = true;
    this.selectedAlumnoId = null;

    // Obtener la lista de alumnos y filtrar los que ya están matriculados en el curso
    forkJoin({
      todos: this.alumnoService.getAlumnos(0, 1000).pipe(
        map( page => page.content)
      ),
      matriculados: this.cursoService.getAlumnosByCurso(curso.id!)
    }).subscribe({
      next: (r) => {
        // Filtrar alumnos que no están matriculados en el curso
        const alumnosMatriculados = r.matriculados;
        const alumnosMatriculadosIds = alumnosMatriculados.map(a => a.id);

        this.alumnosDisponibles = r.todos.filter(
          alumno => !alumnosMatriculadosIds.includes(alumno.id)
        );

        this.loadingAlumnos = false;
      },
      error: (err) => {
        console.error('Error al cargar alumnos:', err);
        this.loadingAlumnos = false;
        this.error = 'Error al cargar la lista de alumnos';
      }
    });
  }
    //Cerramos y reseteamos los datos de los modales para que no se mezclen datos en distintas operaciones
   cerrarModales(): void {
    this.showProfesorModal = false;
    this.showAlumnoModal = false;
    this.cursoSeleccionado = null;
    this.selectedProfesorId = null;
    this.selectedAlumnoId = null;
  }
   asignarProfesor(): void {
    if (!this.cursoSeleccionado?.id || !this.selectedProfesorId || this.processingAction) {
      return;
    }

    this.processingAction = true;

    this.cursoService.assignProfesorToCurso(this.cursoSeleccionado.id, this.selectedProfesorId).subscribe({
      next: (cursoActualizado) => {
        // Actualizar el curso en la lista
        this.loadCursos();
        const index = this.cursos.findIndex(c => c.id === cursoActualizado.id);
        if (index !== -1) {
         this.cursoService.getCursoById(cursoActualizado.id!).subscribe(cursoCompleto => {
          this.cursos[index] = cursoCompleto;
        });
        }

        this.processingAction = false;
        this.cerrarModales();

        // Mostrar mensaje de éxito
        this.error = null;
        setTimeout(() => {
          alert('Profesor asignado correctamente');
        }, 800);
      },
      error: (err) => {
        console.error('Error al asignar profesor:', err);
        this.processingAction = false;
        this.error = 'Error al asignar el profesor al curso';
      }
    });
  }
   matricularAlumno(): void {
    if (!this.cursoSeleccionado?.id || !this.selectedAlumnoId || this.processingAction || !this.hasPlazasDisponibles(this.cursoSeleccionado)) {
      return;
    }

    this.processingAction = true;

    this.cursoService.enrollAlumnoInCurso(this.cursoSeleccionado.id, this.selectedAlumnoId).subscribe({
      next: (cursoActualizado) => {
        // Actualizar el curso en la lista
        const index = this.cursos.findIndex(c => c.id === cursoActualizado.id);
        if (index !== -1) {
          //cogemos el curso en nuestra lista y lo actualizamos por el que acabamos de insertar el alumnos
          this.cursos[index] = cursoActualizado;
        }

        this.processingAction = false;
        this.cerrarModales();

        // Mostrar mensaje de éxito
        this.error = null;
        setTimeout(() => {
          alert('Alumno matriculado correctamente');
        }, 100);
      },
      error: (err) => {
        console.error('Error al matricular alumno:', err);
        this.processingAction = false;
        this.error = 'Error al matricular al alumno en el curso';
      }
    });
  }
}
