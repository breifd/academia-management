import { UsuarioService } from './../../../services/usuario.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfesorService } from '../../../services/profesor.service';
import { ProfesorEntity } from  '../../../interfaces/profesor-entity';
import { Page } from '../../../interfaces/page';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';
import { ActivatedRoute, Route, Router } from '@angular/router';

@Component({
  selector: 'app-profesores',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-profesores.component.html',
  styleUrls: ['./lista-profesores.component.scss']
})
export class ProfesoresComponent implements OnInit {
  // Propiedades para almacenar la lista de profesores y la página actual
  profesores: ProfesorEntity[] = [];
  page: Page<ProfesorEntity> | null = null;

  // Parámetros de paginación y filtrado
  currentPage: number = 0;
  pageSize: number = 10;
  sortBy: string = 'id';
  sortDirection: string = 'asc';
  nombreFilter: string = '';
  apellidoFilter: string = '';
  especialidadFilter: string = '';

  especialidades: string[] = []; // Lista de especialidades para el filtro

  // para saber si hay una búsqueda activa
  isSearchActive : boolean = false;

  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;
  activeTab: 'todos' | 'especialidad' = 'todos';

  constructor(private profesorService: ProfesorService, private router : Router, private routes : ActivatedRoute, private usuarioService : UsuarioService) {}

  ngOnInit(): void {
    this.loadProfesores();
    this.loadEspecialidades();
  }

  loadProfesores(): void {
    this.loading = true;
    this.error = null;
    this.activeTab = 'todos';
    this.isSearchActive = false;

    this.profesorService.getProfesores(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.profesores = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los profesores. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  loadEspecialidades(): void {
    this.profesorService.getEspecialidades().subscribe({
      next: (especialidades) => {
        this.especialidades = especialidades;
      },
      error: (err) => {
        this.error = 'Error al cargar las especialidades. Inténtelo de nuevo más tarde.';
        console.error('Error:', err);
      }
    });
  }

  search(): void {
    // Si todos los filtros están vacíos en la pestaña "todos", cargamos todos los profesores
    if (!this.isSearchActive && this.activeTab === 'todos' && !this.nombreFilter.trim() && !this.apellidoFilter.trim()) {
      this.loadProfesores();
      return;
    }

    this.loading = true;
    this.error = null;

    //Solo se resetea la pagina si no hay una busqueda activa, no cuando se cambia de página (paginación)
    if(!this.isSearchActive){
      this.currentPage = 0;
    }

    this.isSearchActive = true; // Se activa la búsqueda

    if (this.activeTab === 'todos') {
      this.searchByNombreApellido();
    } else {
      this.searchByEspecialidad();
    }
  }

  searchByNombreApellido(): void {
    this.profesorService.searchProfesores(this.nombreFilter, this.apellidoFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.profesores = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al buscar profesores. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  searchByEspecialidad(): void {
    if (!this.especialidadFilter.trim()) {
      this.error = 'Por favor, seleccione una especialidad.';
      this.loading = false;
      return;
    }
    this.profesorService.getByEspecialidad(this.especialidadFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection
    ).subscribe({
      next: (page) => {
        this.page = page;
        this.profesores = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al buscar profesores por especialidad. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.search();
  }
  // Método para cambiar la pestaña activa
  // Cambia la pestaña activa y resetea los filtros
  setActiveTab(tab: 'todos' | 'especialidad'): void {
    // Si la pestaña activa es diferente a la seleccionada, cambia la pestaña activa
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.resetFilters();
    }
  }

  resetFilters(): void {
    this.nombreFilter = '';
    this.apellidoFilter = '';
    this.especialidadFilter = '';
    this.currentPage = 0;
    this.isSearchActive = false; // Resetea el estado de búsqueda activa

    if (this.activeTab === 'todos') {
      this.loadProfesores();
    }
  // Si la pestaña activa es "especialidad", carga los profesores por especialidad

  }
  verProfesor(id: number): void {
    const queryParams= {modo: 'view'};
    this.router.navigate(['/profesores', id], { queryParams });
  }
  editarProfesor(id: number): void {
    const queryParams= {modo: 'edit'};
    this.router.navigate(['/profesores', id], { queryParams });
  }
  eliminarProfesor(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar este profesor?')) {
      this.loading = true;
      this.error = null;

      console.log('🗑️ Iniciando eliminación del profesor ID:', id);

      // PASO 1: Verificar si tiene usuario asociado
      this.usuarioService.getUsuarioByProfesorId(id).subscribe({
        next: (usuario) => {
          console.log('✅ Usuario encontrado:', usuario.username);
          console.log('📝 Procediendo a eliminar usuario primero...');

          // PASO 2: Eliminar el usuario primero
          this.usuarioService.deleteUsuario(usuario.id!).subscribe({
            next: () => {
              console.log('✅ Usuario eliminado exitosamente');
              console.log('📝 Procediendo a eliminar profesor...');

              // PASO 3: Eliminar el profesor después
              this.eliminarSoloProfesor(id);
            },
            error: (err) => {
              console.error('❌ Error al eliminar usuario:', err);

              // Si falla eliminar usuario, aún así intentar con el profesor
              console.log('⚠️ Intentando eliminar profesor sin usuario...');
              this.eliminarSoloProfesor(id);
            }
          });
        },
        error: (err) => {
          if (err.status === 404) {
            console.log('ℹ️ Profesor sin usuario asociado');
            console.log('📝 Procediendo a eliminar solo profesor...');

            // PASO 3: No tiene usuario, eliminar solo el profesor
            this.eliminarSoloProfesor(id);
          } else {
            console.error('❌ Error al verificar usuario:', err);
            this.error = 'Error al verificar usuario asociado';
            this.loading = false;
          }
        }
      });
    }
  }

  eliminarSoloProfesor(id: number): void {
    console.log('🗑️ Eliminando profesor ID:', id);
    //Eliminar solo el profesor sin eliminar el usuario
    this.profesorService.deleteProfesor(id).subscribe({
      next: () => {
        console.log('✅ Profesor eliminado exitosamente');
        this.loading = false;

        // Recargar la lista
        if (this.isSearchActive) {
          this.search();
        } else {
          this.loadProfesores();
        }
      },
      error: (err) => {
        console.error('❌ Error al eliminar profesor:', err);
        this.error = 'Error al eliminar el profesor. Inténtelo de nuevo más tarde.';
        this.loading = false;

        // Mostrar detalles del error en consola
        if (err.error && err.error.message) {
          console.error('Detalles del error:', err.error.message);
        }
      }
    });
}
  nuevoProfesor(): void {
    const queryParams= {modo: 'crear'};
    this.router.navigate(['/profesores/nuevo'], { queryParams });

  }
    // Método para}
}
