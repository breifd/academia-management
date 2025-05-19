import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TareaService } from '../../../services/tarea.service';
import { TareaEntity } from '../../../interfaces/tarea-entity';

export type FormMode = 'view' | 'edit' | 'crear';

@Component({
  selector: 'app-form-tareas',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-tareas.component.html',
  styleUrls: ['./form-tareas.component.scss']
})
export class FormTareasComponent implements OnInit {
  tareaForm: FormGroup;
  mode: FormMode = 'crear';
  tareaID: number | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  today = new Date().toISOString().split('T')[0]; // Para validación de fechas

  // Para la gestión del archivo
  archivoSeleccionado: File | null = null;
  nombreArchivoActual: string | null = null;

  constructor( private fb: FormBuilder, private tareaService: TareaService, private router: Router, private route: ActivatedRoute
  ) {
    this.tareaForm = this.createForm(); // Inicializamos el formulario
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];

      this.route.queryParams.subscribe(queryParams => {
        this.mode = queryParams['modo'] as FormMode; // establecemos el modo desde los parámetros de la ruta
        if (id && (this.mode === 'view' || this.mode === 'edit')) {
          this.tareaID = +id;
          this.loadTarea(this.tareaID);
        } else if (this.mode === 'crear') {
          // Si es crear, inicializar con la fecha de hoy
          this.tareaForm.patchValue({
            fechaPublicacion: this.today
          });
        }
        this.tipoMode();
      });
    });
    this.tareaForm.get('fechaPublicacion')?.valueChanges.subscribe(() => {
      this.tareaForm.updateValueAndValidity();
    });

    this.tareaForm.get('fechaLimite')?.valueChanges.subscribe(() => {
      this.tareaForm.updateValueAndValidity();
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      fechaPublicacion: [null],
      fechaLimite: [null],
      nota: [null, [Validators.min(0), Validators.max(10)]]
      // No incluimos el documento en el formulario, se maneja por separado
    });
  }

  fechasValidator(): void {
    const fechaPublicacion = this.tareaForm.get('fechaPublicacion')?.value;
    const fechaLimite = this.tareaForm.get('fechaLimite')?.value;

    if (fechaPublicacion && fechaLimite && new Date(fechaPublicacion) > new Date(fechaLimite)) {
     this.error = 'La fecha límite no puede ser anterior a la fecha de publicación';
    }else{
       if (this.error && this.error.includes('fecha límite')) {
        this.error = null;
      }
    }
  }

  loadTarea(id: number): void {
    this.loading = true;
    this.tareaService.getTareaById(id).subscribe({
      next: (tarea) => {
        // Convertir fechas a formato yyyy-MM-dd para el input date
        if (tarea.fechaPublicacion) {
          tarea.fechaPublicacion = new Date(tarea.fechaPublicacion).toISOString().split('T')[0];
        }
        if (tarea.fechaLimite) {
          tarea.fechaLimite = new Date(tarea.fechaLimite).toISOString().split('T')[0];
        }

        this.tareaForm.patchValue({
          nombre: tarea.nombre,
          descripcion: tarea.descripcion,
          fechaPublicacion: tarea.fechaPublicacion,
          fechaLimite: tarea.fechaLimite,
          nota: tarea.nota
        });

        // Guardamos el nombre del archivo actual
        this.nombreArchivoActual = tarea.nombreDocumento || null;

        this.tipoMode();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos de la tarea';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  tipoMode(): void {
    if (this.mode === 'view') {
      this.tareaForm.disable();
    } else {
      this.tareaForm.enable();
    }
  }

  // Método para manejar el evento de selección de archivo
  onFileSelected(event: Event): void {
    const element = event.target as HTMLInputElement;
    // Verificamos si hay un archivo seleccionado
    // y lo asignamos a la propiedad archivoSeleccionado
    if (element.files && element.files.length > 0) {
      this.archivoSeleccionado = element.files[0];
    } else {
      this.archivoSeleccionado = null;
    }
  }

  // Método para subir el archivo
  uploadFile(): void {
    if (this.tareaID && this.archivoSeleccionado) {
      this.loading = true;
      this.error = null;

      this.tareaService.uploadDocumento(this.tareaID, this.archivoSeleccionado).subscribe({
        next: (tarea) => {
          this.nombreArchivoActual = tarea.nombreDocumento || null;
          this.successMessage = 'Documento cargado correctamente';
          this.loading = false;
          this.archivoSeleccionado = null;
        },
        error: (err) => {
          this.error = 'Error al cargar el documento. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al cargar el documento:', err);
        }
      });
    }
  }

  // Método para descargar el archivo
  downloadFile(): void {
    if (this.tareaID) {
      this.tareaService.downloadDocumento(this.tareaID).subscribe({
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
    if (this.tareaForm.invalid || this.mode === 'view') {
      return;
    }

    // Validar fechas
    const fechaPublicacion = this.tareaForm.get('fechaPublicacion')?.value;
    const fechaLimite = this.tareaForm.get('fechaLimite')?.value;

    if(fechaPublicacion && fechaLimite){
      const fechaPublicacionDate = new Date(fechaPublicacion);
      const fechaLimiteDate = new Date(fechaLimite);

      if (fechaPublicacionDate > fechaLimiteDate) {
        this.error = 'La fecha de publicación no puede ser posterior a la fecha límite.';
        return;
      }
    }
    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const tareaData: TareaEntity = {
      ...this.tareaForm.value
    };

    if (this.mode === 'edit' && this.tareaID) {
      this.tareaService.updateTarea(this.tareaID, tareaData).subscribe({
        next: () => {
          this.successMessage = 'Tarea actualizada correctamente';
          this.loading = false;

          // Si hay un archivo seleccionado, lo subimos después de guardar
          if (this.archivoSeleccionado) {
            this.uploadFile();
          } else {
            setTimeout(() => this.router.navigate(['/tareas']), 2000);
          }
        },
        error: (err) => {
          this.error = 'Error al actualizar la tarea. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al actualizar la tarea:', err);
        }
      });
    } else {
      this.tareaService.createTarea(tareaData).subscribe({
        next: (tarea) => {
          this.successMessage = 'Tarea creada correctamente';
          this.tareaID = tarea.id || null;
          this.loading = false;

          // Si hay un archivo seleccionado y se creó la tarea correctamente, lo subimos
          if (this.archivoSeleccionado && this.tareaID) {
            this.uploadFile();
          } else {
            setTimeout(() => this.router.navigate(['/tareas']), 2000);
          }
        },
        error: (err) => {
          this.error = 'Error al crear la tarea. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al crear la tarea:', err);
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/tareas']);
  }

  getModoTexto(): string {
    return this.mode === 'view' ? 'Ver' : this.mode === 'edit' ? 'Editar' : 'Crear';
  }
}
