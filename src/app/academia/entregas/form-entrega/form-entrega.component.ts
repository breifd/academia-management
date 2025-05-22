import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TareaEntity } from '../../../interfaces/tarea-entity';
import { CalificacionDTO, EntregaEntity, EntregaRequestDTO, EstadoEntrega } from '../../../interfaces/Entregas';
import { Usuario } from '../../../interfaces/usuario';
import { RolUsuario } from '../../../enum/rol-usuario';
import { EntregaService } from '../../../services/entrega.service';
import { TareaService } from '../../../services/tarea.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

export type FormMode = 'view' | 'edit' | 'crear' | 'calificar';

@Component({
  selector: 'app-form-entrega',
  standalone: true,
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './form-entrega.component.html',
  styleUrl: './form-entrega.component.scss'
})
export class FormEntregaComponent implements OnInit {

  entregaForm: FormGroup;
  calificacionForm: FormGroup;
  mode: FormMode ='crear';

  entregaID: number | null = null;
  tareaID: number | null = null;
  tarea: TareaEntity | null = null;
  entrega: EntregaEntity | null = null;
  usuario: Usuario | null = null;

  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Para manejo de archivos
  archivoSeleccionado: File | null = null;
  nombreArchivoActual: string | null = null;

  // Estados y roles
  estadoEntrega = EstadoEntrega;
  rolUsuario = RolUsuario;

  constructor (
    private fb: FormBuilder,
    private entregaService: EntregaService,
    private tareaService: TareaService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
      this.entregaForm=this.createForm();
      this.calificacionForm=this.createCalificacionForm();
  }

  ngOnInit(): void {
      this.authService.currentUser.subscribe(
        user =>{
          this.usuario=user;
          if(this.usuario){
            this.handleRouteParams();
          }
      });
  }

  handleRouteParams(): void {
    this.route.params.subscribe(params => {
      const entregaId = params['id'];
      const tareaId = params['tareaId'];

      this.route.queryParams.subscribe(queryParams => {
        this.mode = queryParams['modo'] as FormMode || 'crear';

        if (entregaId) {
          // Editar o ver entrega existente
          this.entregaID = +entregaId;
          this.loadEntrega(this.entregaID);
        } else if (tareaId) {
          // Crear nueva entrega para una tarea
          this.tareaID = +tareaId;
          this.loadTarea(this.tareaID);
        }

        this.tipoMode();
      });
    });
  }
  createForm(): FormGroup {
    return this.fb.group({
      comentarios: ['', [Validators.maxLength(500)]]
    });
  }

  createCalificacionForm(): FormGroup {
    return this.fb.group({
      nota: [null, [Validators.required, Validators.min(0), Validators.max(10)]],
      comentarios: ['', [Validators.maxLength(500)]]
    });
  }

  loadTarea(id: number): void {
    this.loading = true;
    this.tareaService.getTareaById(id).subscribe({
      next: (tarea) => {
        this.tarea = tarea;
        this.loading = false;

        // Si es alumno, verificar si ya tiene entrega para esta tarea
        if (this.esAlumno() && this.usuario?.alumnoId) {
          this.checkEntregaExistente();
        }
      },
      error: (err) => {
        this.error = 'Error al cargar los datos de la tarea';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  checkEntregaExistente(): void {
    // Aquí se podría implementar una verificación de entrega existente
    // Por ahora asumimos que no existe
  }

  loadEntrega(id: number): void {
    this.loading = true;
    this.entregaService.getEntregaById(id).subscribe({
      next: (entrega) => {
        this.entrega = entrega;
        this.tarea = entrega.tarea || null;
        this.nombreArchivoActual = entrega.nombreDocumento || null;

        // Cargar datos en el formulario
        this.entregaForm.patchValue({
          comentarios: entrega.comentarios || ''
        });

        if (this.mode === 'calificar' && this.esProfesor()) {
          this.calificacionForm.patchValue({
            nota: entrega.nota || null,
            comentarios: entrega.comentarios || ''
          });
        }

        this.tipoMode();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos de la entrega';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  tipoMode(): void {
    if (this.mode === 'view') {
      this.entregaForm.disable();
      this.calificacionForm.disable();
    } else {
      this.entregaForm.enable();
      if (this.mode === 'calificar') {
        this.calificacionForm.enable();
      }
    }
  }

  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.archivoSeleccionado = element.files[0];
    } else {
      this.archivoSeleccionado = null;
    }
  }

  crearEntrega(): void {
    if (this.entregaForm.invalid || !this.tareaID) {
      this.entregaForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const entregaData: EntregaRequestDTO = {
      tareaId: this.tareaID,
      comentarios: this.entregaForm.get('comentarios')?.value || ''
    };

    this.entregaService.createEntrega(entregaData).subscribe({
      next: (entrega) => {
        this.entrega = entrega;
        this.entregaID = entrega.id!;
        this.successMessage = 'Entrega creada correctamente';

        // Si hay archivo seleccionado, subirlo
        if (this.archivoSeleccionado) {
          this.uploadFile();
        } else {
          this.loading = false;
          setTimeout(() => this.router.navigate(['/entregas']), 2000);
        }
      },
      error: (err) => {
        this.error = 'Error al crear la entrega. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  uploadFile(): void {
    if (this.entregaID && this.archivoSeleccionado) {
      this.entregaService.uploadDocumento(this.entregaID, this.archivoSeleccionado).subscribe({
        next: (entrega) => {
          this.entrega = entrega;
          this.nombreArchivoActual = entrega.nombreDocumento || null;
          this.successMessage = 'Documento subido correctamente';
          this.loading = false;
          this.archivoSeleccionado = null;

          // Resetear input file
          const fileInput = document.getElementById('documento') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        },
        error: (err) => {
          this.error = 'Error al subir el documento. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error:', err);
        }
      });
    }
  }

  calificarEntrega(): void {
    if (this.calificacionForm.invalid || !this.entregaID) {
      this.calificacionForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const calificacionData: CalificacionDTO = {
      nota: this.calificacionForm.get('nota')?.value,
      comentarios: this.calificacionForm.get('comentarios')?.value || ''
    };

    this.entregaService.calificarEntrega(this.entregaID, calificacionData).subscribe({
      next: (entrega) => {
        this.entrega = entrega;
        this.successMessage = 'Entrega calificada correctamente';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/entregas']), 2000);
      },
      error: (err) => {
        this.error = 'Error al calificar la entrega. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  descargarDocumento(): void {
    if (this.entregaID) {
      this.entregaService.downloadDocumento(this.entregaID).subscribe({
        next: (blob) => {
          if (this.nombreArchivoActual) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.nombreArchivoActual;
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
  }

  guardar(): void {
    if (this.mode === 'crear') {
      this.crearEntrega();
    } else if (this.mode === 'calificar') {
      this.calificarEntrega();
    }
  }

  cancelar(): void {
    if (this.tareaID && this.mode === 'crear') {
      this.router.navigate(['/tareas']);
    } else {
      this.router.navigate(['/entregas']);
    }
  }

  // Métodos de utilidad
  getModoTexto(): string {
    switch (this.mode) {
      case 'view': return 'Ver';
      case 'edit': return 'Editar';
      case 'calificar': return 'Calificar';
      default: return 'Hacer';
    }
  }

  tieneDocumento(): boolean {
    return this.entregaService.tieneDocumento(this.entrega!);
  }

  getEstadoColor(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoColor(estado);
  }

  getEstadoTexto(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoTexto(estado);
  }

  formatFecha(fecha?: string): string {
    return this.entregaService.formatFechaEntrega(fecha);
  }

  isTareaVencida(): boolean {
    if (!this.tarea?.fechaLimite) return false;
    return new Date(this.tarea.fechaLimite) < new Date();
  }

  puedeSubirDocumento(): boolean {
    if (!this.entrega) return this.mode === 'crear';
    return this.entregaService.puedeSubirDocumento(this.entrega);
  }

  // Métodos de permisos
  esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

  esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  esAdmin(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }

  puedeCalificar(): boolean {
    return this.esProfesor() && this.entrega?.estado === EstadoEntrega.ENTREGADA;
  }

  mostrarFormularioEntrega(): boolean {
    return this.mode === 'crear' || (this.mode === 'view' && this.esAlumno());
  }

  mostrarFormularioCalificacion(): boolean {
    return this.mode === 'calificar' || (this.mode === 'view' && this.entrega?.nota !== undefined);
  }



}
