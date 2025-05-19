import { ProfesorEntity } from './../../../interfaces/profesor-entity';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfesorService } from '../../../services/profesor.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Usuario } from '../../../interfaces/usuario';
import { AuthService } from '../../../services/auth.service';
import { UsuarioService } from '../../../services/usuario.service';
import { RolUsuario } from '../../../enum/rol-usuario';
import { UsuarioDTO } from '../../../interfaces/usuarioDTO';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

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
  crearUsuario: boolean = true; // Siempre true, obligatorio
  usuarioExistente: Usuario | null = null;
  mode: FormMode = "crear";
  profesorID: number | null = null;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  usernameValidated: boolean = false;
  usernameExists: boolean = false;
  verificandoUsername: boolean = false;

  // Para manejar subscriptions
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private pService: ProfesorService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
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

  toggleCrearUsuario(): void {
    this.crearUsuario = true; // Siempre true
    if (this.crearUsuario) {
      this.usuarioForm.reset();
      this.usuarioForm.patchValue({ usarMismoNombre: true });
      this.usernameValidated = false;
    }
  }

  // 🚀 NUEVA FUNCIONALIDAD: Validación automática
  private setupUsernameValidation(): void {
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

  // Mantener el método manual por si alguien quiere usarlo
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
            // Si el modo es 'edit', verificar si el profesor tiene un usuario asociado
            this.usuarioService.getUsuarioByProfesorId(this.profesorID).subscribe({
              next: (usuario) => {
                console.log('✅ Usuario encontrado:', usuario);
                this.usuarioExistente = usuario;
                this.crearUsuario = false; // Solo en edit, si ya existe usuario
              },
              error: (err) => {
                if (err.status === 404) {
                  console.log('ℹ️ Profesor sin usuario asociado (normal)');
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

    // 🚀 SETUP: Configurar validación automática
    this.setupUsernameValidation();
  }

  ngOnDestroy(): void {
    // Limpiar subscriptions para evitar memory leaks
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
    // Validar el formulario de profesor
    if (this.profesorForm.invalid) {
      this.profesorForm.markAllAsTouched();
      return false;
    }

    // Siempre validar usuario (quité el if(this.crearUsuario))
    if (this.mode === 'crear' || (this.mode === 'edit' && this.crearUsuario && !this.usuarioExistente)) {
      if (this.usuarioForm.invalid) {
        this.usuarioForm.markAllAsTouched();
        return false;
      }

      // 🚀 CAMBIO: Ya no es necesario verificar manualmente
      // La validación se hace automáticamente
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

    // Siempre validar todo (incluído usuario)
    if (!this.validarFormularioCompleto()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const profesorData: ProfesorEntity = {
      ...this.profesorForm.value
    };

    // Siempre crear con usuario
    if (this.mode === 'crear') {
      const usuarioData: Usuario = {
        username: this.usuarioForm.get('username')?.value,
        password: this.usuarioForm.get('password')?.value,
        nombre: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.nombre : '',
        apellido: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.apellido : '',
        rol: RolUsuario.PROFESOR
      };
      this.pService.createProfesorWithUser(profesorData, usuarioData).subscribe({
        next: () => {
          this.successMessage = 'Profesor creado correctamente';
          this.loading = false;
          setTimeout(() => this.router.navigate(['/profesores']), 2000);
        },
        error: (err) => {
          this.error = 'Error al crear el profesor. Inténtelo de nuevo más tarde.';
          this.loading = false;
          console.error('Error al crear el profesor:', err);
        }
      });
    } else if (this.mode === 'edit' && this.profesorID) {
      if (this.usuarioExistente) {
        console.log('⚠️ Modo edit con usuario existente:', this.usuarioExistente);
        const syncUsuario = this.usuarioExistente && this.usuarioForm.get('usarMismoNombre')?.value;

        this.pService.updateProfesorWithSync(this.profesorID, profesorData, syncUsuario).subscribe({
          next: () => {
            this.successMessage = 'Profesor actualizado correctamente';
            this.loading = false;
            setTimeout(() => this.router.navigate(['/profesores']), 2000);
          },
          error: (err) => {
            this.error = 'Error al actualizar el profesor. Inténtelo de nuevo más tarde.';
            this.loading = false;
            console.error('Error al actualizar el profesor:', err);
          }
        });
      } else if (this.crearUsuario) {
        // CASO 2: Profesor sin usuario - crear usuario también
        console.log('🔄 Actualizar profesor Y crear usuario nuevo');
        if (!this.profesorID) {
          this.error = 'Error: ID del profesor no válido';
          this.loading = false;
          return;
        }

        this.pService.updateProfesor(this.profesorID, profesorData).subscribe({
          next: () => {
            // Luego crear el usuario
            const usuarioDTO: UsuarioDTO = {
              username: this.usuarioForm.get('username')?.value || '',
              password: this.usuarioForm.get('password')?.value || '',
              nombre: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.nombre : (this.usuarioForm.get('nombre')?.value || ''),
              apellido: this.usuarioForm.get('usarMismoNombre')?.value ? profesorData.apellido : (this.usuarioForm.get('apellido')?.value || ''),
              rol: RolUsuario.PROFESOR,
              profesorId: this.profesorID!
            };

            console.log('👤 Creando usuario con DTO:', usuarioDTO);

            this.usuarioService.createUsuario(usuarioDTO).subscribe({
              next: () => {
                this.successMessage = 'Profesor y usuario creados correctamente';
                this.loading = false;
                setTimeout(() => this.router.navigate(['/profesores']), 2000);
              },
              error: (err) => {
                this.error = 'Profesor actualizado pero error al crear usuario';
                this.loading = false;
                console.error('Error al crear usuario:', err);
              }
            });
          },
          error: (err) => {
            this.error = 'Error al actualizar el profesor';
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
      if (this.crearUsuario || this.mode === 'crear') {
        this.usuarioForm.enable();
      }
    }
  }

  cancelar(): void {
    this.router.navigate(['/profesores']);
  }

  getMode(): string {
    return this.mode === 'view' ? 'Ver' : this.mode === 'edit' ? 'Editar' : 'Crear';
  }
}
