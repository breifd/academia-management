import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';
import { AlumnoEntity } from '../../../interfaces/alumno-entity';
import { Page } from '../../../interfaces/page';
import { AlumnoService } from '../../../services/alumno.service';
import { Router } from '@angular/router';
import { UsuarioService } from '../../../services/usuario.service';

@Component({
  selector: 'app-lista-alumnos',
  imports: [CommonModule, FormsModule,PaginationComponent],
  templateUrl: './lista-alumnos.component.html',
  styleUrl: './lista-alumnos.component.scss'
})
export class ListaAlumnosComponent implements OnInit {

  alumnos: AlumnoEntity[] =[];
  page: Page<AlumnoEntity> |null = null; // Propiedad para almacenar la página de alumnos
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

  constructor(private alumnoService: AlumnoService, private router : Router, private usuarioService : UsuarioService) {} // Constructor del componente, inyectando el servicio de alumnos

  ngOnInit(): void {
    this.getAlumnos(); // Llama al método para obtener los alumnos al inicializar el componente
  }

  getAlumnos(): void {
    this.loading = true;
    this.error = null;

    this.alumnoService.getAlumnos(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (response) => {
        this.page = response; // Asigna la respuesta a la propiedad page
        this.alumnos = response.content; // Asigna el contenido de la respuesta a la propiedad alumnos
        this.loading = false; // Cambia el estado de carga a falso
      },
      error: (error) => {
        this.error = 'Error al cargar los alumnos'; // Manejo de errores
        this.loading = false; // Cambia el estado de carga a falso
        console.error('Error al cargar los alumnos:', error); // Muestra el error en la consola
      }
    });
  }

  buscar():void{
    if(!this.isSearchActive && !this.nombreFilter.trim() && !this.apellidoFilter.trim()){
      this.getAlumnos(); // Si no hay filtros, llama al método para obtener todos los alumnos
      return;
    }
    this.loading = true;
    this.error = null;

    if(!this.isSearchActive){
      this.currentPage = 0; //Resetea la pagina a 0 para poder mostrar los resultados de la busqueda unicamente si no hay búsqueda activa
    }
    this.isSearchActive = true; // Marca que hay una búsqueda activa
    // Llama al servicio para buscar alumnos con los filtros aplicados
    this.alumnoService.searchAlumnos(this.nombreFilter, this.apellidoFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) =>{
        this.page = page; // Asigna la respuesta a la propiedad page
        this.alumnos = page.content; // Asigna el contenido de la respuesta a la propiedad alumnos
        this.loading = false; // Cambia el estado de carga a falso
      },
      error: (error) => {
        this.error = 'Error al cargar los alumnos'; // Manejo de errores
        this.loading = false; // Cambia el estado de carga a falso
        console.error('Error al cargar los alumnos:', error); // Muestra el error en la consola
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
}
