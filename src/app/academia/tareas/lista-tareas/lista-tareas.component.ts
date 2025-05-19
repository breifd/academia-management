import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TareaService } from '../../../services/tarea.service';
import { TareaEntity } from '../../../interfaces/tarea-entity';
import { Page } from '../../../interfaces/page';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';

@Component({
  selector: 'app-lista-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-tareas.component.html',
  styleUrls: ['./lista-tareas.component.scss']
})
export class ListaTareasComponent implements OnInit {
  // Propiedades para almacenar la lista de tareas y la página actual
  tareas: TareaEntity[] = [];
  page: Page<TareaEntity> | null = null;

  // Parámetros de paginación y filtrado
  currentPage: number = 0;
  pageSize: number = 10;
  sortBy: string = 'id';
  sortDirection: string = 'asc';
  nombreFilter: string = '';

  // Para saber si hay una búsqueda activa
  isSearchActive: boolean = false;

  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;
  activeTab: 'todos' | 'pendientes' | 'vencidas' = 'todos';
new: any;

  constructor(private tareaService: TareaService, private router: Router) {}

  ngOnInit(): void {
    this.loadTareas();
  }

  loadTareas(): void {
    this.loading = true;
    this.error = null;
    this.isSearchActive = false;

    this.tareaService.getTareas(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.tareas = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las tareas. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  loadPendientes(): void {
    this.loading = true;
    this.error = null;
    this.isSearchActive = true;
    this.activeTab = 'pendientes';

    this.tareaService.getTareasPendientes(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.tareas = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las tareas pendientes. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  loadVencidas(): void {
    this.loading = true;
    this.error = null;
    this.isSearchActive = true;
    this.activeTab = 'vencidas';

    this.tareaService.getTareasVencidas(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.tareas = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las tareas vencidas. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  search(): void {
    if (!this.isSearchActive && !this.nombreFilter.trim()) {
      this.loadTareas();
      return;
    }

    this.loading = true;
    this.error = null;

    if (!this.isSearchActive) {
      this.currentPage = 0;
    }

    this.isSearchActive = true;

    this.tareaService.searchTareas(this.nombreFilter, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.tareas = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al buscar tareas. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  onPageChange(page: number): void {
    this.currentPage = page;

    if (this.activeTab === 'pendientes') {
      this.loadPendientes();
    } else if (this.activeTab === 'vencidas') {
      this.loadVencidas();
    } else if (this.isSearchActive) {
      this.search();
    } else {
      this.loadTareas();
    }
  }

  setActiveTab(tab: 'todos' | 'pendientes' | 'vencidas'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.resetFilters();

      if (tab === 'pendientes') {
        this.loadPendientes();
      } else if (tab === 'vencidas') {
        this.loadVencidas();
      } else {
        this.loadTareas();
      }
    }
  }

  resetFilters(): void {
    this.nombreFilter = '';
    this.currentPage = 0;
    this.isSearchActive = false;
  }

  formatFecha(fecha?: string): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString();
  }

  tieneDocumento(tarea: TareaEntity): boolean {
    return this.tareaService.tieneDocumento(tarea);
  }

  formatNota(tarea: TareaEntity): string {
    return this.tareaService.formatNota(tarea);
  }

  descargarDocumento(id: number): void {
    this.tareaService.downloadDocumento(id).subscribe({
      next: (blob) => {
        const tarea = this.tareas.find(t => t.id === id);
        if (tarea && tarea.nombreDocumento) {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = tarea.nombreDocumento;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        }
      },
      error: (err) => {
        this.error = 'Error al descargar el documento. Inténtelo de nuevo más tarde.';
        console.error('Error:', err);
      }
    });
  }

  verTarea(id: number): void {
    const queryParams = { modo: 'view' };
    this.router.navigate(['/tareas', id], { queryParams });
  }

  editarTarea(id: number): void {
    const queryParams = { modo: 'edit' };
    this.router.navigate(['/tareas', id], { queryParams });
  }

  eliminarTarea(id: number): void {
    if (confirm('¿Está seguro de que desea eliminar esta tarea?')) {
      this.tareaService.deleteTarea(id).subscribe({
        next: () => {
          if (this.activeTab === 'pendientes') {
            this.loadPendientes();
          } else if (this.activeTab === 'vencidas') {
            this.loadVencidas();
          } else if (this.isSearchActive) {
            this.search();
          } else {
            this.loadTareas();
          }
        },
        error: (err) => {
          this.error = 'Error al eliminar la tarea. Inténtelo de nuevo más tarde.';
          console.error('Error:', err);
        }
      });
    }
  }

  nuevaTarea(): void {
    const queryParams = { modo: 'crear' };
    this.router.navigate(['/tareas/nuevo'], { queryParams });
  }

  isTareaVencida(tarea: TareaEntity | null | undefined): boolean {
    // Comprobación completa de nulos
    if (!tarea || !tarea.fechaLimite) {
      return false;
    }
    try {
      const fechaLimite = new Date(tarea.fechaLimite);
      const ahora = new Date();
      return fechaLimite < ahora;
    } catch (error) {
      console.error('Error al procesar la fecha:', error);
      return false;
    }
}
}
