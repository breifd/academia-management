import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TareaService } from '../../../services/tarea.service';
import { CursoService } from '../../../services/curso.service';
import { AlumnoService } from '../../../services/alumno.service';

import { AuthService } from '../../../services/auth.service';
import { LoginResponse, RolUsuario } from '../../../interfaces/usuario';
import { AlumnoResponseDTO, AlumnoSimpleDTO } from '../../../interfaces/alumno-entity';
import { CursoResponseDTO, CursoSimpleDTO } from '../../../interfaces/curso-entity';
import { TareaDTO } from '../../../interfaces/tarea-entity';

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
  usuario: LoginResponse | null = null;

  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  today = new Date().toISOString().split('T')[0]; // Para validación de fechas

  // Para la gestión del archivo
  archivoSeleccionado: File | null = null;
  nombreArchivoActual: string | null = null;

  // Datos para formulario
  cursos: CursoResponseDTO[] = [];
  alumnos: AlumnoResponseDTO[] = [];
  alumnosDelCurso: AlumnoSimpleDTO[] = [];

  // Estados y roles
  rolUsuario = RolUsuario;

  constructor(
    private fb: FormBuilder,
    private tareaService: TareaService,
    private cursoService: CursoService,
    private alumnoService: AlumnoService,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {
    this.tareaForm = this.createForm();
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      this.usuario = user;
      if (this.usuario) {
        this.handleRouteParams();
        this.loadInitialData();
      }
    });
  }

  handleRouteParams(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];

      this.route.queryParams.subscribe(queryParams => {
        this.mode = queryParams['modo'] as FormMode;
        if (id && (this.mode === 'view' || this.mode === 'edit')) {
          this.tareaID = +id;
          this.loadTarea(this.tareaID);
        } else if (this.mode === 'crear') {
          // Si es crear, inicializar con la fecha de hoy
          this.tareaForm.patchValue({
            fechaPublicacion: this.today,
            paraTodosLosAlumnos: true
          });
        }
        this.tipoMode();
      });
    });
  }

  loadInitialData(): void {
    this.loadCursos();
    this.loadAlumnos();
  }

  loadCursos(): void {
    this.error = null;
    // Pedimos la lista completa de cursos como DTOs
    this.cursoService.getCursos(0, 1000, 'id', 'asc').subscribe({
      next: page => {
        // page.content es CursoResponseDTO[]
        if (this.esProfesor() && this.usuario?.profesorId != null) {
          // Filtramos solo los cursos donde imparte
          this.cursos = page.content.filter(c =>
            c.profesores?.some(p => p.id === this.usuario!.profesorId)
          );
        } else {
          // Admin o alumno, tomamos todo
          this.cursos = page.content;
        }
      },
      error: err => {
        console.error('Error al cargar cursos:', err);
        this.error = 'No se pudieron cargar los cursos';
      }
    });
  }

  loadAlumnos(): void {
    this.alumnoService.getAlumnos(0, 1000).subscribe({
      next: (page) => {
        this.alumnos = page.content;
      },
      error: (err) => {
        console.error('Error al cargar alumnos:', err);
      }
    });
  }

  // Método mejorado para cambio de curso
  onCursoChange(): void {
    const cursoId = this.tareaForm.get('cursoId')?.value;

    // Limpiar la lista de alumnos seleccionados al cambiar de curso
    this.tareaForm.get('alumnosIds')?.setValue([]);

    if (cursoId) {
      // Buscar el curso seleccionado
      const cursoSeleccionado = this.cursos.find(c => c.id === +cursoId);

      // Verificar si el profesor imparte en ese curso (solo para rol profesor)
      if (this.esProfesor() && this.usuario?.profesorId) {
        const profesorEnCurso = cursoSeleccionado?.profesores?.some(p => p.id === this.usuario?.profesorId);

        if (!profesorEnCurso) {
          this.error = 'No puede crear tareas para un curso en el que no imparte clases.';
          // Opcional: desactivar el formulario o mostrar una advertencia
        } else {
          this.error = null;
        }
      }

      // Cargar los alumnos del curso
      if (cursoSeleccionado && cursoSeleccionado.alumnos) {
        this.alumnosDelCurso = cursoSeleccionado.alumnos;
      } else {
        this.alumnosDelCurso = [];
      }
    } else {
      this.alumnosDelCurso = [];
    }
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      fechaPublicacion: [null],
      fechaLimite: [null],
      cursoId: [null, [Validators.required]],
      paraTodosLosAlumnos: [true],
      alumnosIds: [[]],
      nota: [null, [Validators.min(0), Validators.max(10)]]
    });
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
          cursoId: tarea.curso?.id,
          paraTodosLosAlumnos: tarea.paraTodosLosAlumnos,
          alumnosIds: tarea.alumnosAsignados?.map(a => a.id) || []
        });

        // Cargar alumnos del curso
        if (tarea.curso?.id) {
          this.onCursoChange();
        }

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
      this.tareaForm.markAllAsTouched();
      // Mostrar error específico sobre campos requeridos
      this.error = 'Por favor complete todos los campos obligatorios.';
      return;
    }

    // Validar fechas
    const fechaPublicacion = this.tareaForm.get('fechaPublicacion')?.value;
    const fechaLimite = this.tareaForm.get('fechaLimite')?.value;
    const cursoId = this.tareaForm.get('cursoId')?.value;

    // Validación específica: asegurarse de que se seleccionó un curso
    if (!cursoId) {
      this.error = 'Debe seleccionar un curso para la tarea.';
      return;
    }

    // Validar que el profesor imparte en ese curso (sólo para profesores)
    if (this.esProfesor() && this.usuario?.profesorId) {
      const cursoSeleccionado = this.cursos.find(c => c.id === +cursoId);
      if (!cursoSeleccionado) {
        this.error = 'El curso seleccionado no existe.';
        return;
      }

      // Verificar si el profesor pertenece al curso seleccionado
      const profesorEnCurso = cursoSeleccionado.profesores?.some(p => p.id === this.usuario?.profesorId);
      if (!profesorEnCurso) {
        this.error = 'No puede crear tareas para un curso en el que no imparte clases.';
        return;
      }
    }

    if (fechaPublicacion && fechaLimite) {
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

    const tareaData: TareaDTO = {
      nombre: this.tareaForm.get('nombre')?.value,
      descripcion: this.tareaForm.get('descripcion')?.value,
      fechaPublicacion: this.tareaForm.get('fechaPublicacion')?.value,
      fechaLimite: this.tareaForm.get('fechaLimite')?.value,
      cursoId: +this.tareaForm.get('cursoId')?.value,
      profesorId: this.usuario?.profesorId || undefined, // ✅ AGREGADO: Enviar ID del profesor autenticado
      paraTodosLosAlumnos: this.tareaForm.get('paraTodosLosAlumnos')?.value,
      alumnosIds: this.tareaForm.get('alumnosIds')?.value || []
    };

    // Log para depuración
    console.log('Enviando datos de tarea:', JSON.stringify(tareaData));

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
          // Mostrar mensaje de error más específico si está disponible
          if (err.error && err.error.error) {
            this.error = err.error.error;
          } else {
            this.error = 'Error al actualizar la tarea. Inténtelo de nuevo más tarde.';
          }
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
          // Extraer mensaje de error del backend si está disponible
          if (err.error && err.error.error) {
            this.error = err.error.error;
          } else {
            this.error = 'Error al crear la tarea. Inténtelo de nuevo más tarde.';
          }
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

  // Verifica si un alumno está seleccionado (para el checkbox)
  esAlumnoSeleccionado(alumnoId: number): boolean {
    const alumnosIds = this.tareaForm.get('alumnosIds')?.value as number[] || [];
    return alumnosIds.includes(alumnoId);
  }

  // Maneja el cambio en la selección de un alumno
  toggleSeleccionAlumno(alumnoId: number): void {
    const alumnosIdsControl = this.tareaForm.get('alumnosIds');
    let alumnosIds = alumnosIdsControl?.value as number[] || [];

    if (this.esAlumnoSeleccionado(alumnoId)) {
      // Si ya está seleccionado, lo quitamos
      alumnosIds = alumnosIds.filter(id => id !== alumnoId);
    } else {
      // Si no está seleccionado, lo añadimos
      alumnosIds.push(alumnoId);
    }

    alumnosIdsControl?.setValue(alumnosIds);
  }

  // Verifica si un curso pertenece al profesor actual
  esCursoDelProfesor(curso: any): boolean {
    if (!curso || !curso.profesores || !this.usuario?.profesorId) {
      return false;
    }

    for (let i = 0; i < curso.profesores.length; i++) {
      if (curso.profesores[i].id === this.usuario.profesorId) {
        return true;
      }
    }

    return false;
  }

  // Verifica si el profesor actual tiene cursos asignados
  tieneProfesorCursosAsignados(): boolean {
    if (!this.cursos || !this.usuario?.profesorId) {
      return false;
    }

    for (let i = 0; i < this.cursos.length; i++) {
      if (this.esCursoDelProfesor(this.cursos[i])) {
        return true;
      }
    }

    return false;
  }

  // Mejorar el método para cuando cambia paraTodosLosAlumnos
  onParaTodosChange(): void {
    const paraTodos = this.tareaForm.get('paraTodosLosAlumnos')?.value;
    if (paraTodos) {
      // Si es para todos, limpiamos la selección individual
      this.tareaForm.get('alumnosIds')?.setValue([]);
    } else {
      // Verificar si hay alumnos en el curso
      if (this.alumnosDelCurso.length === 0) {
        // Si no hay alumnos, mostrar advertencia
        this.error = 'El curso seleccionado no tiene alumnos matriculados.';
      }
    }
  }

  // Métodos de utilidad
  esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

  esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  esAdmin(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }
}
