import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CursoService } from '../../../services/curso.service';

import { ProfesorService } from '../../../services/profesor.service';
import { AlumnoService } from '../../../services/alumno.service';

import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import {AbstractControl} from '@angular/forms'
import { ProfesorResponseDTO, ProfesorSimpleDTO } from '../../../interfaces/profesor-entity';
import { AlumnoResponseDTO, AlumnoSimpleDTO } from '../../../interfaces/alumno-entity';
import { CursoCreateDTO, CursoResponseDTO } from '../../../interfaces/curso-entity';

export type FormMode = 'view' | 'edit' | 'crear';

@Component({
  selector: 'app-form-cursos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './form-curso.component.html',
  styleUrl: './form-curso.component.scss'
})
export class FormCursoComponent implements OnInit {
  cursoForm: FormGroup;
  mode: FormMode = 'crear';
  cursoID: number | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  niveles: string[] = [];

  // Control de tabs
  activeTab: 'info' | 'profesores' | 'alumnos' = 'info';

  // Propiedades para profesores
  loadingProfesores: boolean = false;
  profesoresAsignados: ProfesorSimpleDTO[] = [];

  // Propiedades para el modal de profesores
  showProfesorModal: boolean = false;
  loadingProfesoresDisponibles: boolean = false;
  profesoresDisponibles: ProfesorSimpleDTO[] = [];
  selectedProfesorId: number | null = null;

  // Propiedades para alumnos
  loadingAlumnos: boolean = false;
  alumnosMatriculados: AlumnoSimpleDTO[] = [];

  // Propiedades para el modal de alumnos
  showAlumnoModal: boolean = false;
  loadingAlumnosDisponibles: boolean = false;
  alumnosDisponibles: AlumnoResponseDTO[] = [];
  selectedAlumnoId: number | null = null;

  // Estado de procesamiento
  processingAction: boolean = false;

  constructor(
    private fb: FormBuilder,
    private cursoService: CursoService,
    private router: Router,
    private route: ActivatedRoute,
    private profesorService: ProfesorService,
    private alumnoService: AlumnoService
  ) {
    this.cursoForm = this.createForm();
    this.niveles = this.cursoService.getNiveles();
  }

  ngOnInit(): void {
    console.log('🚀 Inicializando FormCursoComponent');
    this.route.params.subscribe(params => {
      const id = params['id'];
      console.log('📝 Params ID:', id);

      this.route.queryParams.subscribe(queryParams => {
        this.mode = queryParams['modo'] as FormMode;
         console.log('🎯 Modo:', this.mode);
        if (id && (this.mode === 'view' || this.mode === 'edit')) {
          this.cursoID = +id;
          console.log('🆔 Curso ID asignado:', this.cursoID);
          this.loadCurso(this.cursoID);
          this.cursoForm.get('maxAlumnos')?.disable();
        }
        this.tipoMode();
      });
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      nivel: ['',[Validators.required]],
      precio: [null, [Validators.required,Validators.min(0),
      (control: AbstractControl) => {
        const value= control.value;
        //Controlamos que los valores en el input cumplan con las condiciones de un numero decimal positivo
        if(value === null || value === undefined) return null;
        if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
          return { invalidDecimal: true };
        }
        return null;
      }
      ]],
      maxAlumnos: [{value: 30, disabled: true}]
    });
  }

  loadCurso(id: number): void {
    this.loading = true;
    this.cursoService.getCursoById(id).subscribe({
      next: (curso) => {
        console.log('✅ Curso cargado:', curso);
        this.cursoForm.patchValue({
          nombre: curso.nombre,
          descripcion: curso.descripcion,
          nivel: curso.nivel,
          precio: curso.precio,
          maxAlumnos: this.cursoService.getMaxAlumnos() // Valor por defecto
        });

        this.tipoMode();
        this.loading = false;

        // Si estamos en modo ver o editar, cargamos profesores y alumnos
        if (this.mode === 'view' || this.mode === 'edit') {
          this.cargarProfesores();
          this.cargarAlumnos();
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar curso:', err);
        this.error = 'Error al cargar los datos del curso';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }

  cargarProfesores(): void {
    if (!this.cursoID) return;

    this.loadingProfesores = true;
    this.profesoresAsignados = [];

    this.cursoService.getProfesoresByCurso(this.cursoID).subscribe({
      next: (profesores) => {
        this.profesoresAsignados = profesores;
        this.loadingProfesores = false;
      },
      error: (err) => {
        console.error('Error al cargar profesores:', err);
        this.loadingProfesores = false;
        this.error = 'Error al cargar los profesores asignados';
      }
    });
  }

  cargarAlumnos(): void {
    if (!this.cursoID) return;

    this.loadingAlumnos = true;
    this.alumnosMatriculados = [];

    this.cursoService.getAlumnosByCurso(this.cursoID).subscribe({
      next: (alumnos) => {
        this.alumnosMatriculados = alumnos;
        this.loadingAlumnos = false;
      },
      error: (err) => {
        console.error('Error al cargar alumnos:', err);
        this.loadingAlumnos = false;
        this.error = 'Error al cargar los alumnos matriculados';
      }
    });
  }

  tipoMode(): void {
    if (this.mode === 'view') {
      this.cursoForm.disable();
    } else {
      this.cursoForm.enable();
    }
  }

  guardar(): void {
    if (this.cursoForm.invalid || this.mode === 'view') {
      //marcamos todos los campos como "tocados" para que se muestren los errrores de validación
      Object.keys(this.cursoForm.controls).forEach(key => {
        this.cursoForm.get(key)?.markAsTouched();
      });
      this.error="Por favor, complete correctamente todos los campos";
      return;
    }
    //Validamos el valor del precio
    const precio = this.cursoForm.get('precio')?.value;
    if (isNaN(precio) || precio < 0) {
      this.error = 'El precio debe ser un número decimal positivo.';
      return;
    }
    //Comprobamos las validaciones necesarias para el numero máximo de alumnos
    const maxAlumnos = this.cursoForm.get('maxAlumnos')?.value;
    if (isNaN(maxAlumnos) || maxAlumnos <= 0 || !Number.isInteger(Number(maxAlumnos))) {
      this.error = 'El número máximo de alumnos debe ser un número entero positivo.';
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const cursoData: CursoCreateDTO = {
       nombre: this.cursoForm.get('nombre')?.value,
       descripcion: this.cursoForm.get('descripcion')?.value,
       nivel: this.cursoForm.get('nivel')?.value,
       precio: this.cursoForm.get('precio')?.value
    };

    if (this.mode === 'edit' && this.cursoID) {
      this.cursoService.updateCurso(this.cursoID, cursoData).subscribe({
        next: () => {
          this.successMessage = 'Curso actualizado correctamente';
          this.loading = false;
          // Redirigir después de un breve retraso
          setTimeout(() => this.router.navigate(['/cursos']), 2000);
        },
        error: (err) => {
          this.error = 'Error al actualizar el curso. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al actualizar el curso:', err);
        }
      });
    } else {
      this.cursoService.createCurso(cursoData).subscribe({
        next: (cursoCreado) => {
          this.successMessage = 'Curso creado correctamente';
          this.loading = false;

          // Asignar el ID y cambiar a modo edición
          this.cursoID = cursoCreado.id!;
          this.mode = 'edit';

          // Después de un breve retraso, cambiar a la pestaña de profesores
          setTimeout(() => {
            this.activeTab = 'profesores';
            // Ya podemos cargar los profesores
            this.cargarProfesores();
          }, 500);
        },
        error: (err) => {
          this.error = 'Error al crear el curso. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al crear el curso:', err);
        }
      });
    }
  }

  cancelar(): void {
    this.router.navigate(['/cursos']);
  }

  getModoTexto(): string {
    return this.mode === 'view' ? 'Ver' : this.mode === 'edit' ? 'Editar' : 'Crear';
  }

  // Control de tabs
  setActiveTab(tab: 'info' | 'profesores' | 'alumnos'): void {
    // Solo permitir cambiar a profesores o alumnos si hay ID de curso
    if ((tab === 'profesores' || tab === 'alumnos') && !this.cursoID) {
      return;
    }

    this.activeTab = tab;
  }

  // Métodos para modales
  abrirModalAsignarProfesor(): void {
    if (!this.cursoID) return;

    this.showProfesorModal = true;
    this.loadingProfesoresDisponibles = true;
    this.selectedProfesorId = null;

    // Obtener todos los profesores y filtrar los que ya están asignados
    forkJoin({
      todos: this.profesorService.getProfesoresLista(),
      asignados: this.cursoService.getProfesoresByCurso(this.cursoID)
    }).subscribe({
      next: (result) => {
        // Filtrar profesores que no están asignados al curso
        const profesoresAsignados = result.asignados;
        const profesoresAsignadosIds = profesoresAsignados.map(p => p.id);

        this.profesoresDisponibles = result.todos.filter(
          profesor => !profesoresAsignadosIds.includes(profesor.id)
        );

        this.loadingProfesoresDisponibles = false;
      },
      error: (err) => {
        console.error('Error al cargar profesores:', err);
        this.loadingProfesoresDisponibles = false;
        this.error = 'Error al cargar la lista de profesores';
      }
    });
  }

  abrirModalMatricularAlumno(): void {
    if (!this.cursoID || !this.hasPlazasDisponibles()) return;

    this.showAlumnoModal = true;
    this.loadingAlumnosDisponibles = true;
    this.selectedAlumnoId = null;

    // Obtener todos los alumnos y filtrar los que ya están matriculados
    forkJoin({
      todos: this.alumnoService.getAlumnos(0, 1000).pipe(
        switchMap(page => of(page.content))
      ),
      matriculados: this.cursoService.getAlumnosByCurso(this.cursoID)
    }).subscribe({
      next: (result) => {
        // Filtrar alumnos que no están matriculados en el curso
        const alumnosMatriculados = result.matriculados;
        const alumnosMatriculadosIds = alumnosMatriculados.map(a => a.id);

        this.alumnosDisponibles = result.todos.filter(
          alumno => !alumnosMatriculadosIds.includes(alumno.id)
        );

        this.loadingAlumnosDisponibles = false;
      },
      error: (err) => {
        console.error('Error al cargar alumnos:', err);
        this.loadingAlumnosDisponibles = false;
        this.error = 'Error al cargar la lista de alumnos';
      }
    });
  }

  cerrarModales(): void {
    this.showProfesorModal = false;
    this.showAlumnoModal = false;
    this.selectedProfesorId = null;
    this.selectedAlumnoId = null;
  }

  asignarProfesor(): void {
    if (!this.cursoID || !this.selectedProfesorId || this.processingAction) {
      return;
    }

    this.processingAction = true;

    this.cursoService.assignProfesorToCurso(this.cursoID, this.selectedProfesorId).subscribe({
      next: () => {
        this.processingAction = false;
        this.cerrarModales();

        // Recargar la lista de profesores
        this.cargarProfesores();

        // Mostrar mensaje de éxito
        this.successMessage = 'Profesor asignado correctamente';
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        console.error('Error al asignar profesor:', err);
        this.processingAction = false;
        this.error = 'Error al asignar el profesor al curso';
      }
    });
  }

  matricularAlumno(): void {
    if (!this.cursoID || !this.selectedAlumnoId || this.processingAction || !this.hasPlazasDisponibles()) {
      return;
    }

    this.processingAction = true;

    this.cursoService.enrollAlumnoInCurso(this.cursoID, this.selectedAlumnoId).subscribe({
      next: () => {
        this.processingAction = false;
        this.cerrarModales();

        // Recargar la lista de alumnos
        this.cargarAlumnos();

        // Mostrar mensaje de éxito
        this.successMessage = 'Alumno matriculado correctamente';
        setTimeout(() => {
          this.successMessage = null;
        }, 3000);
      },
      error: (err) => {
        console.error('Error al matricular alumno:', err);
        this.processingAction = false;
        this.error = 'Error al matricular al alumno en el curso';
      }
    });
  }

  eliminarProfesor(profesorId: number): void {
    // No permitir eliminar si solo queda un profesor
    if (this.profesoresAsignados.length <= 1) {
      this.error = 'No se puede eliminar el último profesor del curso';
      return;
    }

    if (!this.cursoID || !profesorId) return;

    if (confirm('¿Está seguro de que desea eliminar este profesor del curso?')) {
      this.loading = true;

      this.cursoService.removeProfesorFromCurso(this.cursoID, profesorId).subscribe({
        next: () => {
          // Recargar la lista de profesores
          this.cargarProfesores();
          this.loading = false;

          // Mostrar mensaje de éxito
          this.successMessage = 'Profesor eliminado correctamente';
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (err) => {
          console.error('Error al eliminar profesor:', err);
          this.loading = false;
          this.error = 'Error al eliminar el profesor del curso';
        }
      });
    }
  }

  eliminarAlumno(alumnoId: number): void {
    if (!this.cursoID || !alumnoId) return;

    if (confirm('¿Está seguro de que desea eliminar este alumno del curso?')) {
      this.loading = true;

      this.cursoService.unenrollAlumnoFromCurso(this.cursoID, alumnoId).subscribe({
        next: () => {
          // Recargar la lista de alumnos
          this.cargarAlumnos();
          this.loading = false;

          // Mostrar mensaje de éxito
          this.successMessage = 'Alumno eliminado correctamente';
          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (err) => {
          console.error('Error al eliminar alumno:', err);
          this.loading = false;
          this.error = 'Error al eliminar el alumno del curso';
        }
      });
    }
  }

  // Métodos de utilidad
  getMaxAlumnos(): number {
    return this.cursoForm.get('maxAlumnos')?.value || this.cursoService.getMaxAlumnos();
  }

  getPlazasDisponibles(): number {
    const maxAlumnos = this.getMaxAlumnos();
    return maxAlumnos - (this.alumnosMatriculados?.length || 0);
  }

  hasPlazasDisponibles(): boolean {
    return this.getPlazasDisponibles() > 0;
  }

  verProfesor(id: number): void {
  // Guardar el estado actual para poder volver
  // Navegar al detalle del profesor en modo visualización
  const queryParams = { modo: 'view' };
  this.router.navigate(['/profesores', id], { queryParams });
}

verAlumno(id: number): void {
  // Navegar al detalle del alumno en modo visualización
  const queryParams = { modo: 'view' };
  this.router.navigate(['/alumnos', id], { queryParams });
}
}
