import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination/pagination.component';
import { EntregaEntity, EstadoEntrega } from '../../../interfaces/Entregas';
import { Page } from '../../../interfaces/page';
import { Usuario } from '../../../interfaces/usuario';
import { RolUsuario } from '../../../enum/rol-usuario';
import { EntregaService } from '../../../services/entrega.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-lista-entregas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './lista-entregas.component.html',
  styleUrl: './lista-entregas.component.scss'
})
export class ListaEntregasComponent implements OnInit{

  entregas : EntregaEntity[] = [];
  page : Page<EntregaEntity> | null=null;

  //Usuario actual y Rol
  usuario: Usuario | null=null;
  rolUsuario = RolUsuario;
  estadoEntrega = EstadoEntrega;

  // Parámetros de paginación y filtrado
  currentPage: number = 0;
  pageSize: number = 10;
  sortBy: string = 'id';
  sortDirection: string = 'desc'; // Más recientes primero
  estadoFilter: EstadoEntrega | '' = '';

  isSearchActive: boolean=false;

  // Propiedades para manejar el estado de carga y errores
  loading: boolean = false;
  error: string | null = null;
  successMessage: string | null = null;
  activeTab: 'todas' | 'pendientes' | 'calificadas' | 'vencidas' = 'todas';

  // Filtros específicos por contexto
  profesorId: number | null = null;
  alumnoId: number | null = null;
  tareaId: number | null = null;

  constructor (private entregaService : EntregaService,
                private router : Router,
                private route : ActivatedRoute,
                private authService : AuthService){}

  ngOnInit(): void {
      //Obtener Usuario actual
      this.authService.currentUser.subscribe(
        user => {
          this.usuario=user;
          if (this.usuario){
            this.handleRouteParams();
          }
      });
  }

  handleRouteParams(): void{
    this.route.params.subscribe(
      params=> {
        this.profesorId=params['profesorId'] ? +params['profesorId'] : null;
        this.alumnoId=params['alumnoId'] ? +params['alumnoId'] : null;
        this.tareaId=params['tareaId'] ? +params['tareaId'] : null;

        const filtro= params['filtro'];
        if(filtro=== 'pendientes' && this.profesorId){
          this.activeTab ='pendientes';
          this.loadEntregasPendientesCalificacion();
        } else if(filtro === 'alumno' && this.alumnoId){
          this.loadEntregasAlumno();
        } else {
          this.loadEntregasSegunRol();
        }
    });
  }

  loadEntregasSegunRol():void{
    if(!this.usuario) return;

    this.loading=true;
    this.error = null;
    this.isSearchActive = false;

    switch(this.usuario.rol){
      case RolUsuario.PROFESOR:

        if(this.usuario.profesorId){
          this.loadEntregasPendientesCalificacion();
        }
        break;

      case RolUsuario.ALUMNO:

        if(this.usuario.alumnoId){
          this.loadEntregasAlumno();
        }
        break;

      case RolUsuario.ADMIN:

        this.loadTodasLasEntregas();
        break;

      default:

        this.loadTodasLasEntregas();
        break;

    }
  }

  loadTodasLasEntregas():void{
    this.entregaService.getEntregas(this.currentPage,this.pageSize,this.sortBy,this.sortDirection).subscribe({
      next: (page)=>{
        this.page=page;
        this.entregas=page.content;
        this.loading=false;
      }, error: (err)=>{
        this.error="Error al cargar las entregas";
        this.loading= false;
        console.error("Error_: ", err);
      }
    });
  }

  loadEntregasPendientesCalificacion(): void {
    this.entregaService.getEntregasPendientesCalificacion(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.entregas = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las entregas pendientes';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  loadEntregasAlumno(): void {
    this.entregaService.getEntregasByAlumno(this.currentPage, this.pageSize, this.sortBy, this.sortDirection).subscribe({
      next: (page) => {
        this.page = page;
        this.entregas = page.content;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar las entregas del alumno';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  search():void{
    if(!this.isSearchActive && ! this.estadoFilter){
      this.loadEntregasSegunRol();
      return;
    }
    this.loading=true;
    this.error=null;
    if(!this.isSearchActive){
      this.currentPage=0;
    }
    this.isSearchActive=true;
    if(this.estadoFilter){
      this.searchByEstado();
    }else{
      this.loadEntregasSegunRol();
    }
  }

  searchByEstado():void{
    this.loadEntregasSegunRol();
  }

  onPageChange(page: number): void {
    this.currentPage = page;

    if (this.activeTab === 'pendientes') {
      this.loadEntregasPendientesCalificacion();
    } else if (this.isSearchActive) {
      this.search();
    } else {
      this.loadEntregasSegunRol();
    }
  }

  setActiveTab(tab: 'todas' | 'pendientes' | 'calificadas' | 'vencidas'): void {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.resetFilters();

      if (tab === 'pendientes') {
        this.loadEntregasPendientesCalificacion();
      } else {
        this.loadEntregasSegunRol();
      }
    }
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

  tieneDocumento(entrega: EntregaEntity): boolean {
    return this.entregaService.tieneDocumento(entrega);
  }

  getEstadoColor(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoColor(estado);
  }

  getEstadoTexto(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoTexto(estado);
  }

  formatNota(entrega: EntregaEntity): string {
    return this.entregaService.formatNota(entrega);
  }

  estaCalificada(entrega: EntregaEntity): boolean {
    return this.entregaService.estaCalificada(entrega);
  }

  puedeSubirDocumento(entrega: EntregaEntity): boolean {
    return this.entregaService.puedeSubirDocumento(entrega);
  }

  //Métodos de navegación y acciones
  verEntrega(id: number):void{
    const queryParams= {modo: 'view'};
    this.router.navigate(['/entregas', id], { queryParams });
  }

  editarEntrega(id: number): void {
    if (this.puedeEditarEntrega()) {
      const queryParams = { modo: 'edit' };
      this.router.navigate(['/entregas', id], { queryParams });
    }
  }

  calificarEntrega(id: number): void {
    if (this.esProfesor()) {
      const queryParams = { modo: 'calificar' };
      this.router.navigate(['/entregas', id], { queryParams });
    }
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
            this.loadEntregasSegunRol();
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

  esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

  esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  esAdmin(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }

  puedeEditarEntrega(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }

  puedeCalificarEntrega(entrega : EntregaEntity): boolean{
    if(!this.esProfesor()) return false;
    return entrega.estado === EstadoEntrega.ENTREGADA;

  }

  puedeEliminarEntrega(): boolean {
    return this.esAdmin();
  }

  getHeaderTitle(): string{
    if (this.profesorId && this.activeTab === 'pendientes') {
      return 'Entregas Pendientes de Calificación';
    } else if (this.alumnoId) {
      return 'Mis Entregas';
    } else if (this.esProfesor()) {
      return 'Entregas de Mis Tareas';
    } else if (this.esAlumno()) {
      return 'Mis Entregas';
    } else {
      return 'Todas las Entregas';
    }
  }

}







