import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

import { AlumnoService } from '../../../services/alumno.service';
import { UsuarioService } from '../../../services/usuario.service';

import { debounceTime, distinctUntilChanged, of, Subject, switchMap, takeUntil } from 'rxjs';
import { LoginResponse, RolUsuario, UsuarioCreateDTO, UsuarioDTO, UsuarioResponseDTO } from '../../../interfaces/usuario';
import { AlumnoResponseDTO } from '../../../interfaces/alumno-entity';

export type FormMode = 'view' | 'edit' | 'crear';

@Component({
  selector: 'app-form-alumnos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './form-alumnos.component.html',
  styleUrl: './form-alumnos.component.scss'
})
export class FormAlumnosComponent implements OnInit {

  alumnoForm: FormGroup;
  usuarioForm: FormGroup;
  crearUsuario: boolean = true; // Siempre true, obligatorio
  usuarioExistente: UsuarioResponseDTO | null = null;
  mode: FormMode = "crear";
  alumnoID: number | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  usernameValidated: boolean = false;
  usernameExists: boolean = false;
  verificandoUsername: boolean = false;
  //manejamos el estado de la verificación del nombre de usuario
  // para evitar múltiples llamadas al servidor
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private alumnoService: AlumnoService,
    private route: ActivatedRoute,
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    this.alumnoForm = this.createForm();
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

  toggleCrearUsuario(): void {
    this.crearUsuario = !this.crearUsuario;
    if (this.crearUsuario) {
      this.usuarioForm.reset();
      this.usuarioForm.patchValue({ usarMismoNombre: true });
      this.usernameValidated = false;
    }
  }
  setupUsernameValidation(): void {
    const usernameControl = this.usuarioForm.get('username');
    if (usernameControl) {
      usernameControl.valueChanges.pipe(
        debounceTime(500), // Esperar 500ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Solo si el valor cambió realmente
        switchMap(username => {
          // Reset del estado anterior
          this.usernameValidated = false;
          this.usernameExists = false;

          // Si el username es válido (mínimo 4 caracteres)
          if (username && username.length >= 4) {
            this.verificandoUsername = true;
            return this.usuarioService.checkUsernameExists(username);
          } else {
            this.verificandoUsername = false;
            return of(null); // No hacer petición si es muy corto
          }
        }),
        takeUntil(this.destroy$) // Cancelar al destruir el componente
      ).subscribe({
        next: (exists) => {
          if (exists !== null) {
            this.usernameExists = exists;
            this.usernameValidated = true;
            this.verificandoUsername = false;

            // Actualizar errores del formulario
            const usernameControl = this.usuarioForm.get('username');
            if (exists && usernameControl) {
              usernameControl.setErrors({ 'usernameTaken': true });
            } else if (usernameControl?.errors?.['usernameTaken']) {
              // Limpiar solo el error de username tomado, mantener otros errores
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
          this.alumnoID = +id;
          if (this.alumnoID) {
            this.cargarAlumno(this.alumnoID);
            // Verificar si el alumno tiene un usuario asociado
            this.usuarioService.getUsuarioByAlumnoId(this.alumnoID).subscribe({
              next: (usuario) => {
                console.log('✅ Usuario encontrado:', usuario);
                this.usuarioExistente = usuario;
                this.crearUsuario = false; // Solo en edit, si ya existe usuario
              },
              error: (err) => {
                if (err.status === 404) {
                  console.log('ℹ️ Alumno sin usuario asociado (normal)');
                  this.usuarioExistente = null;
                  if (this.mode === 'edit') {
                    this.crearUsuario = true; // OBLIGAR crear usuario
                    console.log('⚠️ Modo edit sin usuario: creación obligatoria activada');
                  } else {
                    this.crearUsuario = false; // En view no mostrar usuario
                  }
                } else {
                  console.error('❌ Error real al buscar usuario:', err);
                  this.error = 'Error al verificar usuario asociado';
                }
              }
            });
          }
        } else if (this.mode === 'crear') {
          this.crearUsuario = true; // Siempre obligatorio crear usuario
        }
        this.tipoForm();
      });
    });

      this.setupUsernameValidation();

  }

  ngOnDestroy(): void {
    // Limpiar suscripciones al destruir el componente
    this.destroy$.next();
    this.destroy$.complete();
  }

  createForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(100)]],
      fechaNacimiento: [null],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', [Validators.maxLength(20)]],
      direccion: ['', [Validators.maxLength(200)]]
    });
  }

  cargarAlumno(id: number): void {
    this.loading = true;

    this.alumnoService.getAlumnoByID(id).subscribe({
      next: (alumno) => {
        // Convertir fecha si existe
        if (alumno.fechaNacimiento) {
          const fecha = new Date(alumno.fechaNacimiento);
          alumno.fechaNacimiento = fecha.toISOString().split('T')[0];
        }

        this.alumnoForm.patchValue(alumno);
        this.tipoForm();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar el alumno. Inténtelo de nuevo más tarde.';
        this.loading = false;
        console.error('Error al cargar el alumno:', err);
      }
    });
  }

  validarFormularioCompleto(): boolean {
    // Validar el formulario de alumno
    if (this.alumnoForm.invalid) {
      this.alumnoForm.markAllAsTouched();
      return false;
    }

    // Siempre validar usuario en crear y edit sin usuario
    if (this.mode === 'crear' || (this.mode === 'edit' && this.crearUsuario && !this.usuarioExistente)) {
      if (this.usuarioForm.invalid) {
        this.usuarioForm.markAllAsTouched();
        return false;
      }

      if (!this.usernameValidated) {
        this.error = 'Por favor, verifique la disponibilidad del nombre de usuario antes de continuar.';
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
    if (this.alumnoForm.invalid || this.mode === 'view') {
      return;
    }

    // Siempre validar todo (incluído usuario cuando corresponda)
    if (!this.validarFormularioCompleto()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const alumnoData: AlumnoResponseDTO = {
      ...this.alumnoForm.value
    };

    // Siempre crear con usuario en modo crear
    if (this.mode === 'crear') {
      const usuarioData: UsuarioCreateDTO = {
        username: this.usuarioForm.get('username')?.value,
        password: this.usuarioForm.get('password')?.value,
        nombre: this.usuarioForm.get('usarMismoNombre')?.value ? alumnoData.nombre : '',
        apellido: this.usuarioForm.get('usarMismoNombre')?.value ? alumnoData.apellido : '',
        rol: RolUsuario.ALUMNO
      };

      this.alumnoService.createAlumnoWithUser(alumnoData).subscribe({
        next: () => {
          this.successMessage = 'Alumno creado correctamente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/alumnos']), 2000);
        },
        error: (err) => {
          this.error = 'Error al crear el alumno. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al crear el alumno:', err);
        }
      });
    } else if (this.mode === 'edit' && this.alumnoID) {
      if (this.usuarioExistente) {
        // Caso 1: Alumno con usuario existente - permitir sincronización
        console.log('⚠️ Modo edit con usuario existente:', this.usuarioExistente);
        const syncUsuario = this.usuarioExistente && this.usuarioForm.get('usarMismoNombre')?.value;

        this.alumnoService.updateAlumnoWithSync(this.alumnoID, alumnoData, syncUsuario).subscribe({
          next: () => {
            this.successMessage = 'Alumno actualizado correctamente';
            this.loading = false;
            setTimeout(() => this.router.navigate(['/alumnos']), 2000);
          },
          error: (err) => {
            this.error = 'Error al actualizar el alumno. Inténtelo de nuevo más tarde.';
            this.loading = false;
            console.error('Error al actualizar el alumno:', err);
          }
        });
      } else if (this.crearUsuario) {
        // Caso 2: Alumno sin usuario - crear usuario también
        console.log('🔄 Actualizar alumno Y crear usuario nuevo');

        if (!this.alumnoID) {
          this.error = 'Error: ID del alumno no válido';
          this.loading = false;
          return;
        }

        // Primero actualizar el alumno
        this.alumnoService.updateAlumno(this.alumnoID, alumnoData).subscribe({
          next: () => {
            // Luego crear el usuario
            const usuarioDTO: UsuarioCreateDTO = {
              username: this.usuarioForm.get('username')?.value || '',
              password: this.usuarioForm.get('password')?.value || '',
              nombre: this.usuarioForm.get('usarMismoNombre')?.value ? alumnoData.nombre : (this.usuarioForm.get('nombre')?.value || ''),
              apellido: this.usuarioForm.get('usarMismoNombre')?.value ? alumnoData.apellido : (this.usuarioForm.get('apellido')?.value || ''),
              rol: RolUsuario.ALUMNO,
              alumnoId: this.alumnoID!
            };

            console.log('👤 Creando usuario con DTO:', usuarioDTO);

            this.usuarioService.createUsuario(usuarioDTO).subscribe({
              next: () => {
                this.successMessage = 'Alumno y usuario creados correctamente';
                this.loading = false;
                setTimeout(() => this.router.navigate(['/alumnos']), 2000);
              },
              error: (err) => {
                this.error = 'Alumno actualizado pero error al crear usuario';
                this.loading = false;
                console.error('Error al crear usuario:', err);
              }
            });
          },
          error: (err) => {
            this.error = 'Error al actualizar el alumno';
            this.loading = false;
            console.error('Error:', err);
          }
        });
      } else {
        // Caso 3: Solo actualizar alumno (no crear usuario)
        this.alumnoService.updateAlumno(this.alumnoID, alumnoData).subscribe({
          next: () => {
            this.successMessage = 'Alumno actualizado correctamente';
            this.loading = false;
            setTimeout(() => this.router.navigate(['/alumnos']), 2000);
          },
          error: (err) => {
            this.error = 'Error al actualizar el alumno. Inténtelo de nuevo más tarde.';
            this.loading = false;
            console.error('Error al actualizar el alumno:', err);
          }
        });
      }
    }
  }

  tipoForm(): void {
    if (this.mode === 'view') {
      this.alumnoForm.disable();
      this.usuarioForm.disable();
    } else {
      this.alumnoForm.enable();
      if (this.crearUsuario || this.mode === 'crear') {
        this.usuarioForm.enable();
      }
    }
  }

  cancelar(): void {
    this.router.navigate(['/alumnos']);
  }

  getMode(): string {
    return this.mode === 'view' ? 'Ver' : this.mode === 'edit' ? 'Editar' : 'Crear';
  }
}
