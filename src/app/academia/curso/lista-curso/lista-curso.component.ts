import { Component, OnInit } from '@angular/core';
import { CursoEntity } from '../../../interfaces/curso-entity';
import { Page } from '../../../interfaces/page';
import { CursoService } from '../../../services/curso.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';

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

  isSearchActive: boolean = false; // Propiedad para saber si hay una búsqueda activa


  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;
  activeTab: 'todos' | 'nivel' = 'todos';

  constructor(private cursoService: CursoService, private router : Router) {}

  ngOnInit(): void {
    this.loadCursos(); // Carga los cursos al inicializar el componente
    this.niveles
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
      },
      error: (err) => {
        this.error = 'Error al cargar los cursos'; // Se asigna un mensaje de error
        this.loading = false; // Se establece el estado de carga a falso
        console.error('Error al cargar los cursos:', err); // Se muestra el error en la consola
      }
    });
  }

  buscar():void{
    // Se establece el estado de carga y se inicializan las propiedades de error y búsqueda
    this.loading = true;
    this.error = null;

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
    if(this.activeTab === 'nivel'){
      this.buscarPorNivel();
    }
    else{
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
  onPageChange(page: number): void {
    this.currentPage = page;
    this.buscar();
  }

  // Método para cambiar la pestaña activa
  setActiveTab(tab: 'todos' | 'nivel'): void {
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

}
