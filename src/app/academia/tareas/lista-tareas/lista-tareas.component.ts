import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TareaService } from '../../../services/tarea.service';

import { Page } from '../../../interfaces/page';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';

import { AuthService } from '../../../services/auth.service';
import { fromReadableStreamLike } from 'rxjs/internal/observable/innerFrom';
import { TareaResponseDTO, TareaSimpleDTO } from '../../../interfaces/tarea-entity';
import { LoginComponent } from '../../login/login/login.component';
import { LoginResponse, RolUsuario } from '../../../interfaces/usuario';

@Component({
  selector: 'app-lista-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-tareas.component.html',
  styleUrls: ['./lista-tareas.component.scss']
})
export class ListaTareasComponent implements OnInit {
  // Propiedades para almacenar la lista de tareas y la página actual
  tareas: TareaResponseDTO[] = [];
  page: Page<TareaResponseDTO> | null = null;
  //Usuario actual y rol (controlar permisos)
  usuario: LoginResponse | null=null;
  rolUsuario = RolUsuario;
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

  constructor(private tareaService: TareaService, private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser.subscribe(
      user => {
        this.usuario=user;
        if(this.usuario){
          this.loadTareasSegunRol();
        }
      }
    );
  }

  loadTareasSegunRol(): void{
    //Sino existe usuario no se puede cargar tareas
    if(!this.usuario) return;

    this.loading = true;
    this.error = null;
    this.isSearchActive = false;

    switch(this.usuario.rol){
      case RolUsuario.PROFESOR:
        if(this.usuario.profesorId){
          this.loadTareasProfesor(this.usuario.profesorId);
        }
        break;
      case RolUsuario.ADMIN:
        this.loadTodasLasTareas();
        break;
      case RolUsuario.ALUMNO:
        if(this.usuario.alumnoId){
          this.loadTareasAlumno(this.usuario.alumnoId)
        }
        break;
      default:
        this.loadTodasLasTareas();
        break;
    }
  }

  loadTareasProfesor(profesorId: number):void{
    this.tareaService.getTareasByProfesor(profesorId, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) =>{
        this.page=page;
        this.tareas= page.content;
        this.loading= false;
      }, error: (err) => {
        this.error = "Error al cargar las tareas del profesor";
        this.loading = false;
        console.error("Error: ", err);
      }
    });
  }

  loadTareasAlumno(alumnoId: number):void{
    this.tareaService.getTareasByAlumno(alumnoId, this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) =>{
        this.page=page;
        this.tareas= page.content;
        this.loading= false;
      }, error: (err) => {
        this.error = "Error al cargar las tareas del alumno";
        this.loading = false;
        console.error("Error: ", err);
      }
    });
  }

  loadTodasLasTareas(): void{
    this.tareaService.getTareas(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page)=>{
        this.page=page;
        this.tareas=page.content;
        this.loading=false;
      }, error: (err)=>{
        this.error="Error al cargar las tareas";
        this.loading=false;
        console.error("Error: ", err);
      }
    })
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
    // Sino existe una búsqueda activa o el filtro está vacío se cargarán las tareas según el rol como estaba previsto
    if (!this.isSearchActive && !this.nombreFilter.trim()) {
      this.loadTareasSegunRol();
      return;
    }

    this.loading = true;
    this.error = null;

    if (!this.isSearchActive) {
      this.currentPage = 0;
    }

    this.isSearchActive = true;
    // Si hay algún nombre en el filtro directamente buscamos las tareas
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
      this.loadTareasSegunRol();
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
        this.loadTareasSegunRol();
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

  tieneDocumento(tarea: TareaResponseDTO): boolean {
    return this.tareaService.tieneDocumento(tarea);
  }

  descargarDocumento(id: number): void{
    this.tareaService.downloadDocumento(id).subscribe({
      next: (blob)=>{
        //Si la llamada tiene éxito obtiene un objeto tipo BLOB
        const tarea=this.tareas.find(t=> t.id === id);
        // se comprueba si existe la tarea con el id y si esta contiene un un documento con nombre definido
        if(tarea && tarea.nombreDocumento){
            //Se descarga el archivo
            const url = window.URL.createObjectURL(blob);
            const a= document.createElement('a');
            a.href=url;
            a.download= tarea.nombreDocumento;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        }
      }, error: (err)=>{
        this.error= "Error al descargar el documento";
        console.error("Error: ",err);
      }
    });
  }

  verEntregas(tareaId:number): void{
    this.router.navigate(['/tareas', tareaId, 'entregas']);
  }

  verEntregasProfesor(profesorId: number): void {
    this.router.navigate(['/entregas'], {
      queryParams: { profesorId: profesorId, filtro: 'pendientes' }
    });
  }

  // Navegación general
  verTodasLasEntregas(): void {
    this.router.navigate(['/entregas']);
  }

  hacerEntrega(tareaId: number): void{
     this.router.navigate([`/tareas/${tareaId}/entrega`])
  }

  verTarea(id: number): void {
    const queryParams = { modo: 'view' };
    this.router.navigate(['/tareas', id], { queryParams });
  }

  editarTarea(id: number): void {

    if(this.usuario?.rol === RolUsuario.ADMIN || this.usuario?.rol === RolUsuario.PROFESOR){

      const queryParams = { modo: 'edit' };
      this.router.navigate(['/tareas', id], { queryParams });

    }
  }

  eliminarTarea(id: number): void {
    if(this.usuario?.rol === RolUsuario.ADMIN || this.usuario?.rol === RolUsuario.PROFESOR){
      if (confirm('¿Está seguro de que desea eliminar esta tarea?')) {
        this.tareaService.deleteTarea(id).subscribe({
          next: () => {

              this.loadTareasSegunRol();

          },
          error: (err) => {
            this.error = 'Error al eliminar la tarea. Inténtelo de nuevo más tarde.';
            console.error('Error:', err);
          }
        });
      }
    }
  }

  nuevaTarea(): void {
    if(this.usuario?.rol === RolUsuario.ADMIN || this.usuario?.rol === RolUsuario.PROFESOR){
      const queryParams = { modo: 'crear' };
      this.router.navigate(['/tareas/nuevo'], { queryParams });
    }
  }

  puedeCrearTarea(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR || this.usuario?.rol === RolUsuario.ADMIN;
  }

   puedeEditarTarea(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR || this.usuario?.rol === RolUsuario.ADMIN;
  }

   esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

   esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  isTareaVencida(tarea: TareaSimpleDTO | null | undefined): boolean {
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
