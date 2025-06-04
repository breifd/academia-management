import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { EntregaService } from '../../../services/entrega.service';
import { TareaService } from '../../../services/tarea.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { TareaResponseDTO, TareaSimpleDTO } from '../../../interfaces/tarea-entity';
import { CalificacionDTO, EntregaCreateDTO, EntregaRequestDTO, EntregaResponseDTO, EstadoEntrega } from '../../../interfaces/entregas-entity';
import { LoginResponse, RolUsuario } from '../../../interfaces/usuario';

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
  tarea: TareaResponseDTO | null = null;
  entrega: EntregaResponseDTO | null = null;
  usuario: LoginResponse | null = null;

  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Para manejo de archivos
  archivoSeleccionado: File | null = null;
  nombreArchivoActual: string | null = null;

  archivoProfesorSeleccionado: File | null = null;
  nombreArchivoProfesor: string | null = null;

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
        this.nombreArchivoProfesor = entrega.nombreDocumentoProfesor || null; // ✅ NUEVO

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
  onFileProfesorSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    if (element.files && element.files.length > 0) {
      this.archivoProfesorSeleccionado = element.files[0];
    } else {
      this.archivoProfesorSeleccionado = null;
    }
  }

// ✅ MÉTODO CORREGIR: Pasar alumnoId desde el frontend
crearEntrega(): void {
  if (!this.tareaID) {
    this.error = 'No se puede crear la entrega sin una tarea válida.';
    return;
  }

  // ✅ VERIFICAR QUE TENEMOS EL ALUMNO ID
  if (!this.usuario?.alumnoId) {
    this.error = 'No se puede identificar al alumno actual.';
    return;
  }

  this.loading = true;
  this.error = null;
  this.successMessage = null;

  const tareaVencida = this.isTareaVencida();
  let mensajeAdvertencia = '';

  if (tareaVencida) {
    mensajeAdvertencia = '\n⚠️ ADVERTENCIA: La tarea está vencida. Se aplicará penalización automática.';
  }

  // ✅ INCLUIR ALUMNO ID EN EL DTO
  const entregaData: EntregaCreateDTO = {
    tareaId: this.tareaID,
    alumnoId: this.usuario.alumnoId, // 🔥 ESTO ES LO IMPORTANTE
    comentarios: (this.entregaForm.get('comentarios')?.value || '') + mensajeAdvertencia
  };

  console.log('🔥 Enviando entrega con datos:', entregaData);

  this.entregaService.createEntrega(entregaData).subscribe({
    next: (entrega) => {
      this.entrega = entrega;
      this.entregaID = entrega.id!;

      if (tareaVencida) {
        this.successMessage = '⚠️ Entrega creada FUERA DE PLAZO. Se ha aplicado penalización automática (Nota: 0).';
      } else {
        this.successMessage = '✅ Entrega creada correctamente. Ahora puedes subir tu documento.';
      }

      // Si hay archivo seleccionado, subirlo
      if (this.archivoSeleccionado) {
        setTimeout(() => this.uploadFile(), 1000);
      } else {
        this.loading = false;
        setTimeout(() => this.router.navigate(['/tareas']), 3000);
      }
    },
    error: (err) => {
      console.error('❌ Error completo:', err);
      this.error = err.error?.error || 'Error al crear la entrega. Inténtelo de nuevo.';
      this.loading = false;
    }
  });
}
 // ✅ MÉTODO SOBRESCRIBIR: Upload mejorado
uploadFile(): void {
  if (this.entregaID && this.archivoSeleccionado) {
    this.loading = true;

    this.entregaService.uploadDocumento(this.entregaID, this.archivoSeleccionado).subscribe({
      next: (entrega) => {
        this.entrega = entrega;
        this.nombreArchivoActual = entrega.nombreDocumento || null;

        // ✅ NUEVA LÓGICA: Actualizar estado tras subir documento
        if (entrega.estado === 'FUERA_PLAZO') {
          this.successMessage = '📄 Documento subido. Entrega marcada como FUERA DE PLAZO (Nota: 0).';
        } else {
          this.successMessage = '📄 Documento subido correctamente. Entrega completada.';
        }

        this.loading = false;
        this.archivoSeleccionado = null;

        // Limpiar input file
        const fileInput = document.getElementById('documento') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

        setTimeout(() => this.router.navigate(['/tareas']), 2000);
      },
      error: (err) => {
        this.error = 'Error al subir el documento. Inténtelo de nuevo.';
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

    // ✅ DECIDIR QUÉ MÉTODO USAR SEGÚN SI HAY DOCUMENTO
    if (this.archivoProfesorSeleccionado) {
      // Con documento - usar FormData
      this.entregaService.calificarEntregaConDocumento(
        this.entregaID,
        calificacionData,
        this.archivoProfesorSeleccionado
      ).subscribe({
        next: (entrega) => {
          this.entrega = entrega;
          this.nombreArchivoProfesor = entrega.nombreDocumentoProfesor || null;
          this.successMessage = 'Entrega calificada correctamente con documento adjunto';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/entregas']), 2000);
        },
        error: (err) => {
          console.error('❌ Error al calificar con documento:', err);
          this.error = err.error?.error || 'Error al calificar la entrega. Inténtelo de nuevo más tarde.';
          this.loading = false;
        }
      });
    } else {
      // Sin documento - usar JSON
      this.entregaService.calificarEntrega(this.entregaID, calificacionData).subscribe({
        next: (entrega) => {
          this.entrega = entrega;
          this.successMessage = 'Entrega calificada correctamente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/entregas']), 2000);
        },
        error: (err) => {
          console.error('❌ Error al calificar:', err);
          this.error = err.error?.error || 'Error al calificar la entrega. Inténtelo de nuevo más tarde.';
          this.loading = false;
        }
      });
    }
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
    } else if (this.mode === 'edit') {
      this.actualizarEntrega();
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
    return this.mode === 'crear' ||
          this.mode === 'edit' ||
          (this.mode === 'view' && this.esAlumno());
  }

  mostrarFormularioCalificacion(): boolean {
    return this.mode === 'calificar' || (this.mode === 'view' && this.entrega?.nota !== undefined);
  }

  // ✅ MÉTODO NUEVO: Verificar advertencias de tarea vencida
mostrarAdvertenciaVencimiento(): boolean {
  return this.mode === 'crear' && this.isTareaVencida();
}

// ✅ MÉTODO NUEVO: Obtener mensaje de estado
getMensajeEstado(): string {
  if (!this.tarea) return '';

  if (this.isTareaVencida()) {
    return '⚠️ Esta tarea está VENCIDA. La entrega será penalizada automáticamente con nota 0.';
  } else if (this.tarea.fechaLimite) {
    const ahora = new Date();
    const fechaLimite = new Date(this.tarea.fechaLimite);
    const horasRestantes = Math.ceil((fechaLimite.getTime() - ahora.getTime()) / (1000 * 60 * 60));

    if (horasRestantes <= 24) {
      return `⏰ ¡Atención! Quedan menos de ${horasRestantes} horas para la fecha límite.`;
    }
  }

  return '✅ Puedes realizar tu entrega normalmente.';
}

// ✅ NUEVO MÉTODO: Actualizar entrega existente
  actualizarEntrega(): void {
    if (this.entregaForm.invalid || !this.entregaID) {
      this.entregaForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const entregaData: EntregaCreateDTO = {
      tareaId: this.entrega?.tarea?.id || this.tareaID!,
      comentarios: this.entregaForm.get('comentarios')?.value || ''
    };

    console.log('🔄 Actualizando entrega con datos:', entregaData);

    this.entregaService.updateEntrega(this.entregaID, entregaData).subscribe({
      next: (entrega) => {
        this.entrega = entrega;
        this.successMessage = '✅ Entrega actualizada correctamente.';
        this.loading = false;

        // Si hay archivo seleccionado, subirlo
        if (this.archivoSeleccionado) {
          setTimeout(() => this.uploadFile(), 1000);
        } else {
          setTimeout(() => this.router.navigate(['/entregas']), 2000);
        }
      },
      error: (err) => {
        console.error('❌ Error al actualizar:', err);
        this.error = err.error?.error || 'Error al actualizar la entrega. Inténtelo de nuevo.';
        this.loading = false;
      }
    });
  }

  puedeEditar(): boolean {
    if (!this.entrega || !this.esAlumno()) return false;
    return this.entregaService.puedeEditarEntrega(this.entrega, this.tarea);
  }

  // ✅ NUEVO MÉTODO: Verificar si mostrar botón editar
  mostrarBotonEditar(): boolean {
    return this.mode === 'view' && this.puedeEditar();
  }

  // ✅ NUEVO MÉTODO: Cambiar a modo edición
  cambiarAModoEdicion(): void {
    this.mode = 'edit';
    this.tipoMode(); // Habilitar formularios
  }

  descargarDocumentoProfesor(): void {
    if (this.entregaID) {
      this.entregaService.downloadDocumentoProfesor(this.entregaID).subscribe({
        next: (blob) => {
          if (this.nombreArchivoProfesor) {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = this.nombreArchivoProfesor;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
          }
        },
        error: (err) => {
          this.error = 'Error al descargar el documento del profesor. Inténtelo de nuevo más tarde.';
          console.error('Error:', err);
        }
      });
    }
  }



}
