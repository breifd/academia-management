import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfesorService } from '../../../services/profesor.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { UsuarioService } from '../../../services/usuario.service';

import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { RolUsuario, UsuarioCreateDTO, UsuarioResponseDTO } from '../../../interfaces/usuario';
import { ProfesorCreateDTO, ProfesorResponseDTO } from '../../../interfaces/profesor-entity';

export type FormMode = 'view' | 'edit' | 'crear';

@Component({
  selector: 'app-form-profesores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-profesores.component.html',
  styleUrl: './form-profesores.component.scss'
})
export class FormProfesoresComponent implements OnInit, OnDestroy {

  profesorForm: FormGroup;
  usuarioForm: FormGroup;
  usuarioExistente: UsuarioResponseDTO | null = null;
  mode: FormMode = "crear";
  profesorID: number | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  usernameValidated: boolean = false;
  usernameExists: boolean = false;
  verificandoUsername: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private pService: ProfesorService,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService,
  ) {
    this.profesorForm = this.createForm();
    this.usuarioForm = this.createUsuarioForm();
  }

  createUsuarioForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
      confirmarPassword: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(50)]],
      usarMismoNombre: [true],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const confirmarPassword = formGroup.get('confirmarPassword')?.value;
    return password === confirmarPassword ? null : { passwordMismatch: true };
  }

  private setupUsernameValidation(): void {
    const usernameControl = this.usuarioForm.get('username');
    if (usernameControl) {
      usernameControl.valueChanges.pipe(
        debounceTime(500),
        distinctUntilChanged(),
        switchMap(username => {
          this.usernameValidated = false;
          this.usernameExists = false;

          if (username && username.length >= 4) {
            this.verificandoUsername = true;
            return this.usuarioService.checkUsernameExists(username);
          } else {
            this.verificandoUsername = false;
            return of(null);
          }
        }),
        takeUntil(this.destroy$)
      ).subscribe({
        next: (exists) => {
          if (exists !== null) {
            this.usernameExists = exists;
            this.usernameValidated = true;
            this.verificandoUsername = false;

            const usernameControl = this.usuarioForm.get('username');
            if (exists && usernameControl) {
              usernameControl.setErrors({ 'usernameTaken': true });
            } else if (usernameControl?.errors?.['usernameTaken']) {
              const errors = { ...usernameControl.errors };
              delete errors['usernameTaken'];
              const hasErrors = Object.keys(errors).length > 0;
              usernameControl.setErrors(hasErrors ? errors : null);
            }
          }
        },
        error: (err) => {
          console.error('Error al verificar username automáticamente:', err);
          this.verificandoUsername = false;
        }
      });
    }
  }

  verificarUsername(): void {
    const username = this.usuarioForm.get('username')?.value;
    if (!username || username.length < 4) {
      this.usuarioForm.get('username')?.markAsTouched();
      return;
    }

    this.verificandoUsername = true;
    this.usernameValidated = false;

    this.usuarioService.checkUsernameExists(username).subscribe({
      next: (exists: boolean) => {
        this.usernameExists = exists;
        this.usernameValidated = true;
        this.verificandoUsername = false;

        if (exists) {
          this.usuarioForm.get('username')?.setErrors({ 'usernameTaken': true });
        }
      },
      error: (err) => {
        console.error('Error al verificar el nombre de usuario:', err);
        this.verificandoUsername = false;
        this.error = 'Error al verificar el nombre de usuario. Inténtelo de nuevo.';
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];

      this.route.queryParams.subscribe(queryParams => {
        this.mode = queryParams['modo'] as FormMode;

        if (this.mode === 'edit' || this.mode === 'view') {
          this.profesorID = +id;
          if (this.profesorID) {
            this.cargarProfesor(this.profesorID);

            this.usuarioService.getUsuarioByProfesorId(this.profesorID).subscribe({
              next: (usuario) => {
                console.log('✅ Usuario encontrado:', usuario);
                this.usuarioExistente = usuario;
              },
              error: (err) => {
                if (err.status === 404) {
                  console.log('ℹ️ Profesor sin usuario asociado');
                  this.usuarioExistente = null;
                } else {
                  console.error('❌ Error al buscar usuario:', err);
                  this.error = 'Error al verificar usuario asociado';
                }
              }
            });
          }
        }
        this.tipoForm();
      });
    });

    this.setupUsernameValidation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(50)]],
      apellido: ['', [Validators.required, Validators.maxLength(50)]],
      especialidad: ['', [Validators.required, Validators.maxLength(50)]],
      anhosExperiencia: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
      email: ['', [Validators.email, Validators.maxLength(50)]],
      telefono: ['', [Validators.maxLength(15)]],
    });
  }

  cargarProfesor(id: number): void {
    this.loading = true;

    this.pService.getProfesorById(id).subscribe({
      next: (profesor) => {
        this.profesorForm.patchValue(profesor);
        this.tipoForm();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el profesor. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error al cargar el profesor:', err);
      }
    });
  }

  validarFormularioCompleto(): boolean {
    if (this.profesorForm.invalid) {
      this.profesorForm.markAllAsTouched();
      return false;
    }

    // CAMBIO: Siempre validar usuario en crear, solo en edit si no existe usuario
    if (this.mode === 'crear' || (this.mode === 'edit' && !this.usuarioExistente)) {
      if (this.usuarioForm.invalid) {
        this.usuarioForm.markAllAsTouched();
        return false;
      }

      if (this.usernameExists) {
        this.error = 'El nombre de usuario ya existe. Por favor, elija otro.';
        return false;
      }
    }

    return true;
  }

  guardar(): void {
    if (this.profesorForm.invalid || this.mode === 'view') {
      return;
    }

    if (!this.validarFormularioCompleto()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const profesorData: ProfesorCreateDTO = {
      ...this.profesorForm.value
    };

    if (this.mode === 'crear') {
      // OBLIGATORIO: Siempre crear con usuario
      const usuarioData: UsuarioCreateDTO = {
        username: this.usuarioForm.get('username')?.value,
        password: this.usuarioForm.get('password')?.value,
        nombre: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.nombre : '',
        apellido: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.apellido : '',
        rol: RolUsuario.PROFESOR
      };

      profesorData.usuario = usuarioData;

      this.pService.createProfesor(profesorData).subscribe({
        next: () => {
          this.successMessage = 'Profesor y usuario creados correctamente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/profesores']), 2000);
        },
        error: (err) => {
          this.error = err.error?.error || 'Error al crear el profesor. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al crear el profesor:', err);
        }
      });
    } else if (this.mode === 'edit' && this.profesorID) {
      if (this.usuarioExistente) {
        // Profesor con usuario existente - solo actualizar y sincronizar si se solicita
        const syncUsuario = this.usuarioForm.get('usarMismoNombre')?.value || false;

        this.pService.updateProfesorWithSync(this.profesorID, profesorData, syncUsuario).subscribe({
          next: () => {
            this.successMessage = 'Profesor actualizado correctamente';
            this.loading = false;
            setTimeout(() => this.router.navigate(['/profesores']), 2000);
          },
          error: (err) => {
            this.error = err.error?.error || 'Error al actualizar el profesor. Inténtelo de nuevo más tarde.';
            this.loading = false;
            console.error('Error al actualizar el profesor:', err);
          }
        });
      } else {
        // Profesor sin usuario - OBLIGATORIO crear usuario también
        console.log('🚨 OBLIGATORIO: Creando usuario para profesor existente');

        // Primero actualizar el profesor
        this.pService.updateProfesor(this.profesorID, profesorData).subscribe({
          next: () => {
            // Luego crear el usuario obligatoriamente
            const usuarioDTO: UsuarioCreateDTO = {
              username: this.usuarioForm.get('username')?.value || '',
              password: this.usuarioForm.get('password')?.value || '',
              nombre: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.nombre : '',
              apellido: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.apellido : '',
              rol: RolUsuario.PROFESOR,
              profesorId: this.profesorID!
            };

            this.usuarioService.createUsuario(usuarioDTO).subscribe({
              next: () => {
                this.successMessage = 'Profesor actualizado y usuario creado correctamente';
                this.loading = false;
                setTimeout(() => this.router.navigate(['/profesores']), 2000);
              },
              error: (err) => {
                this.error = 'Profesor actualizado pero error al crear usuario: ' + (err.error?.error || err.message);
                this.loading = false;
                console.error('Error al crear usuario:', err);
              }
            });
          },
          error: (err) => {
            this.error = err.error?.error || 'Error al actualizar el profesor';
            this.loading = false;
            console.error('Error:', err);
          }
        });
      }
    }
  }

  tipoForm(): void {
    if (this.mode === 'view') {
      this.profesorForm.disable();
      this.usuarioForm.disable();
    } else {
      this.profesorForm.enable();
      // CAMBIO: Siempre habilitar usuario form en crear, y en edit si no existe usuario
      if (this.mode === 'crear' || !this.usuarioExistente) {
        this.usuarioForm.enable();
      } else {
        // En edit con usuario existente, solo habilitar la opción de sincronización
        this.usuarioForm.get('usarMismoNombre')?.enable();
        this.usuarioForm.get('username')?.disable();
        this.usuarioForm.get('password')?.disable();
        this.usuarioForm.get('confirmarPassword')?.disable();
      }
    }
  }

  cancelar(): void {
    this.router.navigate(['/profesores']);
  }

  getMode(): string {
    return this.mode === 'view' ? 'Ver' : this.mode === 'edit' ? 'Editar' : 'Crear';
  }

  // HELPER: Determinar si debe mostrar campos de usuario
  shouldShowUsuarioFields(): boolean {
    return this.mode === 'crear' || (this.mode === 'edit' && !this.usuarioExistente);
  }

  // HELPER: Determinar si debe mostrar solo sincronización
  shouldShowSyncOnly(): boolean {
    return this.mode === 'edit' && this.usuarioExistente !== null;
  }
}
