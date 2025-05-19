import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CursoService } from '../../../services/curso.service';
import { CursoEntity } from '../../../interfaces/curso-entity';

export type FormMode = 'view' | 'edit' | 'crear';

@Component({
  selector: 'app-form-cursos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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

  constructor(
    private fb: FormBuilder,
    private cursoService: CursoService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.cursoForm = this.createForm();
    this.niveles = this.cursoService.getNiveles();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];

      this.route.queryParams.subscribe(queryParams => {
        this.mode = queryParams['modo'] as FormMode;
        if (id && (this.mode === 'view' || this.mode === 'edit')) {
          this.cursoID = +id;
          this.loadCurso(this.cursoID);
        }
        this.tipoMode();
      });
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      descripcion: ['', [Validators.maxLength(500)]],
      nivel: [''],
      precio: [null, [Validators.min(0)]]
    });
  }

  loadCurso(id: number): void {
    this.loading = true;
    this.cursoService.getCursoById(id).subscribe({
      next: (curso) => {
        this.cursoForm.patchValue(curso);
        this.tipoMode();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos del curso';
        this.loading = false;
        console.error('Error:', err);
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
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const cursoData: CursoEntity = {
      ...this.cursoForm.value
    };

    if (this.mode === 'edit' && this.cursoID) {
      this.cursoService.updateCurso(this.cursoID, cursoData).subscribe({
        next: () => {
          this.successMessage = 'Curso actualizado correctamente';
          this.loading = false;
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
        next: () => {
          this.successMessage = 'Curso creado correctamente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/cursos']), 2000);
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
}
