import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginResponse, RolUsuario } from '../../interfaces/usuario';
import { AlumnoCreateDTO, AlumnoResponseDTO } from '../../interfaces/alumno-entity';
import { ProfesorCreateDTO, ProfesorResponseDTO } from '../../interfaces/profesor-entity';
import { CursoResponseDTO } from '../../interfaces/curso-entity';
import { TareaResponseDTO } from '../../interfaces/tarea-entity';
import { EntregaResponseDTO, EstadoEntrega } from '../../interfaces/entregas-entity';
import { AuthService } from '../../services/auth.service';
import { ProfesorService } from '../../services/profesor.service';
import { AlumnoService } from '../../services/alumno.service';
import { CursoService } from '../../services/curso.service';
import { TareaService } from '../../services/tarea.service';
import { UsuarioService } from '../../services/usuario.service';
import { EntregaService } from '../../services/entrega.service';

// Importar servicios

type TabType = 'perfil' | 'cursos' | 'tareas' | 'entregas' | 'estadisticas';

interface EstadisticasPersonales {
  totalCursos: number;
  totalTareas: number;
  totalEntregas: number;
  tareasActivas: number;
  tareasVencidas: number;
  entregasPendientes: number;
  entregasCalificadas: number;
  promedioNotas?: number;
  entregasPendientesCalificacion?: number;
  porcentajeCalificado?: number;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss']
})
export class MiPerfilComponent implements OnInit {

  usuario: LoginResponse | null = null;
  activeTab: TabType = 'perfil';
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Formularios
  perfilForm: FormGroup;
  passwordForm: FormGroup;

  // Datos del perfil según rol
  datosAlumno: AlumnoResponseDTO | null = null;
  datosProfesor: ProfesorResponseDTO | null = null;

  // Datos de las pestañas
  cursos: CursoResponseDTO[] = [];
  tareas: TareaResponseDTO[] = [];
  entregas: EntregaResponseDTO[] = [];

  // Estadísticas personales
  estadisticas: EstadisticasPersonales = {
    totalCursos: 0,
    totalTareas: 0,
    totalEntregas: 0,
    tareasActivas: 0,
    tareasVencidas: 0,
    entregasPendientes: 0,
    entregasCalificadas: 0

  };

  // Flags de carga por pestaña
  loadingPerfil = false;
  loadingCursos = false;
  loadingTareas = false;
  loadingEntregas = false;

  filtroEstadoEntregas: EstadoEntrega | 'todos' = 'todos';
  filtroBusquedaEntregas: string = '';
  entregasOriginales: EntregaResponseDTO[] = [];
  mostrarSoloMisAlumnos: boolean = true;
  entregasMostradas: EntregaResponseDTO[] = [];
  entregasPorEstadoMostradas: {
    pendientes: EntregaResponseDTO[];
    entregadas: EntregaResponseDTO[];
    calificadas: EntregaResponseDTO[];
    fueraPlazo: EntregaResponseDTO[];
  } = {
    pendientes: [],
    entregadas: [],
    calificadas: [],
    fueraPlazo: []
  };

   entregasPorEstado: {
    pendientes: EntregaResponseDTO[];
    entregadas: EntregaResponseDTO[];
    calificadas: EntregaResponseDTO[];
    fueraPlazo: EntregaResponseDTO[];
  } = {
    pendientes: [],
    entregadas: [],
    calificadas: [],
    fueraPlazo: []
  };
  // Tipos y enums para el template
  rolUsuario = RolUsuario;
  estadoEntrega = EstadoEntrega;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private alumnoService: AlumnoService,
    private profesorService: ProfesorService,
    private cursoService: CursoService,
    private tareaService: TareaService,
    private entregaService: EntregaService,
    private usuarioService: UsuarioService,
    public router: Router
  ) {
    this.perfilForm = this.createPerfilForm();
    this.passwordForm = this.createPasswordForm();
  }

  ngOnInit(): void {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.usuario = user;
        this.loadDatosPerfil();
        this.loadActiveTabData();
      } else {
        this.router.navigate(['/login']);
      }
    });
  }

  // ================================
  // CREACIÓN DE FORMULARIOS
  // ================================

  createPerfilForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', [Validators.maxLength(20)]],
      direccion: ['', [Validators.maxLength(200)]],
      // Campos específicos para profesor
      especialidad: ['', [Validators.maxLength(100)]],
      anhosExperiencia: [0, [Validators.min(0)]],
      // Campo específico para alumno
      fechaNacimiento: ['']
    });
  }

  createPasswordForm(): FormGroup {
    return this.fb.group({
      passwordActual: ['', [Validators.required]],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
      confirmarPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get('passwordNueva');
    const confirmPassword = group.get('confirmarPassword');

    if (password && confirmPassword) {
      return password.value === confirmPassword.value ? null : { passwordMismatch: true };
    }
    return null;
  }

  // ================================
  // CARGA DE DATOS DEL PERFIL
  // ================================

  loadDatosPerfil(): void {
    if (!this.usuario) return;

    this.loadingPerfil = true;
    this.error = null;

    if (this.esAlumno() && this.usuario.alumnoId) {
      this.loadDatosAlumno(this.usuario.alumnoId);
    } else if (this.esProfesor() && this.usuario.profesorId) {
      this.loadDatosProfesor(this.usuario.profesorId);
    } else {
      // Para admin, solo mostrar datos básicos del usuario
      this.perfilForm.patchValue({
        nombre: this.usuario.nombre,
        apellido: this.usuario.apellido
      });
      this.loadingPerfil = false;
    }
  }

  loadDatosAlumno(alumnoId: number): void {
    this.alumnoService.getAlumnoByID(alumnoId).subscribe({
      next: (alumno) => {
        this.datosAlumno = alumno;
        this.perfilForm.patchValue({
          nombre: alumno.nombre,
          apellido: alumno.apellido,
          email: alumno.email,
          telefono: alumno.telefono,
          direccion: alumno.direccion,
          fechaNacimiento: alumno.fechaNacimiento
        });
        this.loadingPerfil = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos del perfil';
        this.loadingPerfil = false;
        console.error('Error:', err);
      }
    });
  }

  loadDatosProfesor(profesorId: number): void {
    this.profesorService.getProfesorById(profesorId).subscribe({
      next: (profesor) => {
        this.datosProfesor = profesor;
        this.perfilForm.patchValue({
          nombre: profesor.nombre,
          apellido: profesor.apellido,
          email: profesor.email,
          telefono: profesor.telefono,
          especialidad: profesor.especialidad,
          anhosExperiencia: profesor.anhosExperiencia
        });
        this.loadingPerfil = false;
      },
      error: (err) => {
        this.error = 'Error al cargar los datos del perfil';
        this.loadingPerfil = false;
        console.error('Error:', err);
      }
    });
  }

  // ================================
  // MANEJO DE PESTAÑAS
  // ================================

 changeTab(tab: TabType): void {
    this.activeTab = tab;
    this.error = null;
    this.successMessage = null;
    this.loadActiveTabData();

    // ✅ NUEVO: Verificación especial para pestaña de entregas y profesores
    if (tab === 'entregas' && this.esProfesor()) {
      setTimeout(() => {
        this.verificarEntregasDelProfesor();
        this.mostrarResumenEntregasProfesor();
      }, 1000); // Esperar a que carguen los datos
    }
  }

  loadActiveTabData(): void {
    switch (this.activeTab) {
      case 'cursos':
        this.loadCursos();
        break;
      case 'tareas':
        this.loadTareas();
        break;
      case 'entregas':
        this.loadEntregas();
        break;
      case 'estadisticas':
        this.calculateEstadisticas();
        break;
    }
  }

  // ================================
  // CARGA DE DATOS POR PESTAÑA
  // ================================

  loadCursos(): void {
    if (!this.usuario) return;

    this.loadingCursos = true;
    this.cursos = [];

    if (this.esAlumno() && this.usuario.alumnoId) {
      this.cursoService.getCursosByAlumno(this.usuario.alumnoId, 0, 100).subscribe({
        next: (page) => {
          this.cursos = page.content;
          this.loadingCursos = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los cursos';
          this.loadingCursos = false;
          console.error('Error:', err);
        }
      });
    } else if (this.esProfesor() && this.usuario.profesorId) {
      this.cursoService.getCursosByProfesor(this.usuario.profesorId, 0, 100).subscribe({
        next: (page) => {
          this.cursos = page.content;
          this.loadingCursos = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los cursos';
          this.loadingCursos = false;
          console.error('Error:', err);
        }
      });
    } else {
      // Admin: mostrar todos los cursos
      this.cursoService.getCursos(0, 100).subscribe({
        next: (page) => {
          this.cursos = page.content;
          this.loadingCursos = false;
        },
        error: (err) => {
          this.error = 'Error al cargar los cursos';
          this.loadingCursos = false;
          console.error('Error:', err);
        }
      });
    }
  }

  loadTareas(): void {
    if (!this.usuario) return;

    this.loadingTareas = true;
    this.tareas = [];

    if (this.esAlumno() && this.usuario.alumnoId) {
      this.tareaService.getTareasByAlumno(this.usuario.alumnoId, 0, 100).subscribe({
        next: (page) => {
          this.tareas = page.content;
          this.loadingTareas = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las tareas';
          this.loadingTareas = false;
          console.error('Error:', err);
        }
      });
    } else if (this.esProfesor() && this.usuario.profesorId) {
      this.tareaService.getTareasByProfesor(this.usuario.profesorId, 0, 100).subscribe({
        next: (page) => {
          this.tareas = page.content;
          this.loadingTareas = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las tareas';
          this.loadingTareas = false;
          console.error('Error:', err);
        }
      });
    } else {
      // Admin: mostrar todas las tareas
      this.tareaService.getTareas(0, 100).subscribe({
        next: (page) => {
          this.tareas = page.content;
          this.loadingTareas = false;
        },
        error: (err) => {
          this.error = 'Error al cargar las tareas';
          this.loadingTareas = false;
          console.error('Error:', err);
        }
      });
    }
  }

// REEMPLAZAR COMPLETAMENTE el método loadEntregas():
  // ✅ MÉTODO MEJORADO: loadEntregas()
  loadEntregas(): void {
    if (!this.usuario) return;

    this.loadingEntregas = true;
    this.entregas = [];
    this.entregasOriginales = [];
    this.entregasMostradas = [];
    this.error = null;

    console.log('🔍 === CARGANDO ENTREGAS EN MI-PERFIL ===');
    console.log('Usuario:', {
      username: this.usuario.username,
      rol: this.usuario.rol,
      profesorId: this.usuario.profesorId,
      alumnoId: this.usuario.alumnoId
    });

    // ✅ CARGAR TODAS LAS ENTREGAS
    this.entregaService.getEntregas(0, 1000, 'fechaEntrega', 'desc').subscribe({
      next: (page) => {
        console.log(`📊 Total entregas obtenidas: ${page.content.length}`);
        this.entregasOriginales = page.content;

        // ✅ APLICAR FILTRO SEGÚN ROL
        this.filtrarEntregasSegunRol();
        this.loadingEntregas = false;

        // ✅ MOSTRAR MENSAJE SI ES PROFESOR Y NO HAY ENTREGAS
        if (this.esProfesor() && this.entregas.length === 0) {
          this.successMessage = 'Aún no hay entregas para revisar en tus tareas.';
          setTimeout(() => this.successMessage = null, 5000);
        }
      },
      error: (err) => {
        this.error = "Error al cargar las entregas";
        this.loadingEntregas = false;
        console.error("❌ Error: ", err);
      }
    });
  }

  filtrarEntregasSegunRol(): void {
    if (!this.usuario) return;

    let entregasFiltradas = [...this.entregasOriginales];

    console.log('🔍 Filtrando entregas según rol:', this.usuario.rol);
    console.log('🔍 Entregas antes del filtro:', entregasFiltradas.length);

    switch (this.usuario.rol) {
      case RolUsuario.PROFESOR:
        if (this.usuario.profesorId) {
          console.log('🎓 Filtrando para profesor ID:', this.usuario.profesorId);

          // ✅ FILTRAR ENTREGAS DE TAREAS CREADAS POR ESTE PROFESOR
          entregasFiltradas = this.entregasOriginales.filter(entrega => {
            const profesorDeLaTarea = entrega.tarea?.profesor?.id;
            const esDelProfesor = profesorDeLaTarea === this.usuario!.profesorId;

            // Debug detallado para las primeras entregas
            if (entregasFiltradas.length < 5) {
              console.log(`🔍 Entrega ${entrega.id}:`, {
                tareaId: entrega.tarea?.id,
                tareaNombre: entrega.tarea?.nombre,
                alumno: `${entrega.alumno?.nombre} ${entrega.alumno?.apellido}`,
                profesorDeLaTarea: profesorDeLaTarea,
                profesorActual: this.usuario!.profesorId,
                esDelProfesor: esDelProfesor,
                estado: entrega.estado
              });
            }

            return esDelProfesor;
          });

          console.log(`✅ Entregas del profesor filtradas: ${entregasFiltradas.length}`);
        }
        break;

      case RolUsuario.ALUMNO:
        if (this.usuario.alumnoId) {
          console.log('👤 Filtrando para alumno ID:', this.usuario.alumnoId);
          entregasFiltradas = this.entregasOriginales.filter(entrega =>
            entrega.alumno?.id === this.usuario!.alumnoId
          );
        }
        break;

      case RolUsuario.ADMIN:
        console.log('👑 Admin - sin filtrado');
        entregasFiltradas = [...this.entregasOriginales];
        break;

      default:
        entregasFiltradas = [];
        break;
    }

    console.log('✅ Entregas después del filtro:', entregasFiltradas.length);

    // ✅ ACTUALIZAR TODAS LAS LISTAS
    this.entregas = entregasFiltradas;
    this.entregasMostradas = [...entregasFiltradas]; // ✅ IMPORTANTE: Inicializar entregasMostradas

    // ✅ SI ES PROFESOR, AGRUPAR POR ESTADO Y APLICAR FILTROS INICIALES
    if (this.esProfesor()) {
      this.agruparEntregasPorEstado();
      this.agruparEntregasPorEstadoMostradas();

      // ✅ MOSTRAR ESTADÍSTICAS EN CONSOLA
      this.debugEntregasProfesor();
    }

    console.log('=====================================');
  }
   agruparEntregasPorEstado(): void {
    this.entregasPorEstado = {
      pendientes: this.entregas.filter(e => e.estado === EstadoEntrega.PENDIENTE),
      entregadas: this.entregas.filter(e => e.estado === EstadoEntrega.ENTREGADA),
      calificadas: this.entregas.filter(e => e.estado === EstadoEntrega.CALIFICADA),
      fueraPlazo: this.entregas.filter(e => e.estado === EstadoEntrega.FUERA_PLAZO)
    };
  }


  debugEntregasProfesor(): void {
    if (!this.usuario?.profesorId) return;

    console.log('🔍 === DEBUG ENTREGAS PROFESOR ===');
    console.log('Profesor ID:', this.usuario.profesorId);
    console.log('Total entregas originales:', this.entregasOriginales.length);
    console.log('Total entregas filtradas:', this.entregas.length);

    // Mostrar distribución por estado
    const distribucion = {
      PENDIENTE: this.entregas.filter(e => e.estado === EstadoEntrega.PENDIENTE).length,
      ENTREGADA: this.entregas.filter(e => e.estado === EstadoEntrega.ENTREGADA).length,
      CALIFICADA: this.entregas.filter(e => e.estado === EstadoEntrega.CALIFICADA).length,
      FUERA_PLAZO: this.entregas.filter(e => e.estado === EstadoEntrega.FUERA_PLAZO).length
    };

    console.log('Distribución por estado:', distribucion);

    // ✅ MOSTRAR TAREAS CON ENTREGAS
    const tareasConEntregas = this.getTareasConEntregas();
    console.log('Tareas con entregas:', tareasConEntregas.slice(0, 3));

    // ✅ MOSTRAR ALUMNOS ÚNICOS
    const alumnosUnicos = this.getAlumnosUnicos();
    console.log('Alumnos únicos:', alumnosUnicos.slice(0, 3));

    console.log('================================');
  }
   verificarEntregasDelProfesor(): void {
    if (!this.esProfesor() || !this.usuario?.profesorId) return;

    console.log('🎓 === VERIFICACIÓN ENTREGAS PROFESOR ===');

    // Verificar si el profesor tiene tareas creadas
    const tareasDelProfesor = this.tareas.filter(t => t.profesor?.id === this.usuario!.profesorId);
    console.log(`📝 Tareas creadas por el profesor: ${tareasDelProfesor.length}`);

    if (tareasDelProfesor.length === 0) {
      this.successMessage = 'Aún no has creado tareas. Las entregas aparecerán cuando los alumnos respondan a tus tareas.';
      setTimeout(() => this.successMessage = null, 8000);
      return;
    }

    // Verificar entregas por tarea
    tareasDelProfesor.forEach(tarea => {
      const entregasDeTarea = this.entregas.filter(e => e.tarea?.id === tarea.id);
      console.log(`📋 Tarea "${tarea.nombre}": ${entregasDeTarea.length} entregas`);
    });

    console.log('==========================================');
  }


  // ================================
  // CÁLCULO DE ESTADÍSTICAS
  // ================================

  calculateEstadisticas(): void {
    this.estadisticas.totalCursos = this.cursos.length;
    this.estadisticas.totalTareas = this.tareas.length;
    this.estadisticas.totalEntregas = this.entregas.length;

    // Calcular tareas activas y vencidas
    const ahora = new Date();
    this.estadisticas.tareasActivas = this.tareas.filter(t =>
      !t.fechaLimite || new Date(t.fechaLimite) >= ahora
    ).length;

    this.estadisticas.tareasVencidas = this.tareas.filter(t =>
      t.fechaLimite && new Date(t.fechaLimite) < ahora
    ).length;

    // Calcular entregas por estado
    this.estadisticas.entregasPendientes = this.entregas.filter(e =>
      e.estado === EstadoEntrega.PENDIENTE || e.estado === EstadoEntrega.ENTREGADA
    ).length;

    this.estadisticas.entregasCalificadas = this.entregas.filter(e =>
      e.estado === EstadoEntrega.CALIFICADA
    ).length;

    // Calcular promedio de notas (solo para alumnos)
    if (this.esAlumno()) {
      const entregasConNota = this.entregas.filter(e => e.nota !== undefined && e.nota !== null);
      if (entregasConNota.length > 0) {
        const sumaNotas = entregasConNota.reduce((suma, e) => suma + (e.nota || 0), 0);
        this.estadisticas.promedioNotas = sumaNotas / entregasConNota.length;
      }
    }
    if (this.esProfesor()) {
      this.calcularEstadisticasProfesor();
    }
  }

  calcularEstadisticasProfesor(): void {
    if (!this.esProfesor()) return;

    const stats = this.getEstadisticasEntregasDetalladas();

    // Actualizar estadísticas adicionales para profesor
    this.estadisticas = {
      ...this.estadisticas,
      entregasPendientesCalificacion: stats.entregadas,
      porcentajeCalificado: stats.porcentajeCalificado
    };

    console.log('📊 Estadísticas del profesor calculadas:', {
      totalEntregas: stats.total,
      pendientesCalificacion: stats.entregadas,
      promedio: stats.promedioNotas.toFixed(2)
    });
  }

  // ✅ MÉTODO NUEVO: mostrarResumenEntregasProfesor()
  mostrarResumenEntregasProfesor(): void {
    if (!this.esProfesor()) return;

    const stats = this.getEstadisticasEntregasDetalladas();

    if (stats.entregadas > 0) {
      this.successMessage = `📋 Tienes ${stats.entregadas} entregas pendientes de calificar.`;
      setTimeout(() => this.successMessage = null, 5000);
    } else if (stats.total > 0) {
      this.successMessage = `✅ ¡Excelente! Todas las entregas están al día.`;
      setTimeout(() => this.successMessage = null, 5000);
    }
  }

  // ================================
  // ACCIONES DEL PERFIL
  // ================================

actualizarPerfil(): void {
  if (this.perfilForm.invalid) {
    this.perfilForm.markAllAsTouched();
    this.error = 'Por favor, complete todos los campos obligatorios correctamente.';
    return;
  }

  this.loading = true;
  this.error = null;
  this.successMessage = null;

  const formData = this.perfilForm.value;

  if (this.esAlumno() && this.usuario?.alumnoId) {
    const alumnoData: AlumnoCreateDTO = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email || '',
      telefono: formData.telefono || '',
      direccion: formData.direccion || '',
      fechaNacimiento: formData.fechaNacimiento || undefined
    };

    this.alumnoService.updateAlumnoWithSync(this.usuario.alumnoId, alumnoData, true).subscribe({
      next: (response) => {
        this.successMessage = 'Perfil actualizado correctamente';
        this.loading = false;
        this.datosAlumno = response;

        // Actualizar datos del usuario actual
        if (this.usuario) {
          this.usuario.nombre = response.nombre;
          this.usuario.apellido = response.apellido;
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al actualizar el perfil';
        this.loading = false;
      }
    });

  } else if (this.esProfesor() && this.usuario?.profesorId) {
    const profesorData: ProfesorCreateDTO = {
      nombre: formData.nombre,
      apellido: formData.apellido,
      email: formData.email || '',
      telefono: formData.telefono || '',
      especialidad: formData.especialidad || '',
      anhosExperiencia: formData.anhosExperiencia || 0
    };

    this.profesorService.updateProfesorWithSync(this.usuario.profesorId, profesorData, true).subscribe({
      next: (response) => {
        this.successMessage = 'Perfil actualizado correctamente';
        this.loading = false;
        this.datosProfesor = response;

        // Actualizar datos del usuario actual
        if (this.usuario) {
          this.usuario.nombre = response.nombre;
          this.usuario.apellido = response.apellido;
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al actualizar el perfil';
        this.loading = false;
      }
    });
  }
}

  cambiarPassword(): void {
  if (this.passwordForm.invalid) {
    this.passwordForm.markAllAsTouched();
    this.error = 'Por favor, complete todos los campos de contraseña correctamente.';
    return;
  }

  if (!this.usuario?.username) {
    this.error = 'No se puede cambiar la contraseña: usuario no identificado';
    return;
  }

  this.loading = true;
  this.error = null;
  this.successMessage = null;

  const passwordData = this.passwordForm.value;

  this.usuarioService.cambiarPasswordSimple(
    this.usuario.username,
    passwordData.passwordActual,
    passwordData.passwordNueva
  ).subscribe({
    next: (response) => {
      this.successMessage = response.message || 'Contraseña actualizada correctamente';
      this.loading = false;
      this.passwordForm.reset();
    },
    error: (err) => {
      this.error = err.error?.error || 'Error al cambiar la contraseña';
      this.loading = false;

      if (this.error && this.error.includes('contraseña actual')) {
        this.passwordForm.get('passwordActual')?.setErrors({ 'incorrect': true });
      }
    }
  });
}

  refreshUserInfo(): void {
    this.authService.refreshUserInfo().subscribe({
      next: (userInfo) => {
        console.log('Información de usuario actualizada:', userInfo);
      },
      error: (err) => {
        console.error('Error al actualizar la información del usuario:', err);
      }
    });
  }

  // ================================
  // MÉTODOS DE UTILIDAD
  // ================================

  esAlumno(): boolean {
    return this.usuario?.rol === RolUsuario.ALUMNO;
  }

  esProfesor(): boolean {
    return this.usuario?.rol === RolUsuario.PROFESOR;
  }

  esAdmin(): boolean {
    return this.usuario?.rol === RolUsuario.ADMIN;
  }

  formatFecha(fecha?: string): string {
    if (!fecha) return 'No definida';
    try {
      return new Date(fecha).toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  }

  getEstadoColor(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoColor(estado);
  }

  getEstadoTexto(estado: EstadoEntrega): string {
    return this.entregaService.getEstadoTexto(estado);
  }

  isTareaVencida(tarea: TareaResponseDTO): boolean {
    if (!tarea.fechaLimite) return false;
    return new Date(tarea.fechaLimite) < new Date();
  }

  // ================================
  // NAVEGACIÓN
  // ================================

 irACurso(cursoId: number): void {
    // Admin puede editar, otros solo ver
    const modo = this.esAdmin() ? 'edit' : 'view';
    this.router.navigate(['/cursos', cursoId], {
      queryParams: { modo: modo }
    });
  }

  irAEntrega(entregaId: number): void {
    // Profesores pueden calificar/editar, alumnos solo ver
    const modo = this.esProfesor() ? 'edit' : 'view';
    this.router.navigate(['/entregas', entregaId], {
      queryParams: { modo: modo }
    });
  }

  irATarea(tareaId: number): void {
    const modo = this.esProfesor() ? 'edit' : 'view';
    this.router.navigate(['/tareas', tareaId], {
      queryParams: { modo: modo }
    });
  }

  crearTarea(): void {
    this.router.navigate(['/tareas/nuevo']);
  }

  hacerEntrega(tareaId: number): void {
    this.router.navigate(['/tareas', tareaId, 'entrega']);
  }

  calificarEntrega(entregaId: number): void {
    this.router.navigate(['/entregas', entregaId], { queryParams: { modo: 'calificar' } });
  }

  getRoleDisplayName(): string {
    if (!this.usuario?.rol) return 'Usuario';

    switch (this.usuario.rol) {
      case RolUsuario.ALUMNO:
        return 'Estudiante';
      case RolUsuario.PROFESOR:
        return 'Profesor';
      case RolUsuario.ADMIN:
        return 'Administrador';
      default:
        return 'Usuario';
    }
  }

  getWelcomeMessage(): string {
    const hora = new Date().getHours();
    let saludo = '';

    if (hora < 12) {
      saludo = 'Buenos días';
    } else if (hora < 18) {
      saludo = 'Buenas tardes';
    } else {
      saludo = 'Buenas noches';
    }

    return `${saludo}, ${this.usuario?.nombre || 'Usuario'}`;
  }

  getTabs(): { key: TabType; label: string; icon: string }[] {
    const baseTabs = [
      { key: 'perfil' as TabType, label: 'Mi Perfil', icon: '👤' }
    ];

    if (this.esAlumno()) {
      return [
        ...baseTabs,
        { key: 'cursos' as TabType, label: 'Mis Cursos', icon: '📚' },
        { key: 'tareas' as TabType, label: 'Mis Tareas', icon: '📝' },
        { key: 'entregas' as TabType, label: 'Mis Entregas', icon: '📤' },
        { key: 'estadisticas' as TabType, label: 'Estadísticas', icon: '📊' }
      ];
    } else if (this.esProfesor()) {
      return [
        ...baseTabs,
        { key: 'cursos' as TabType, label: 'Cursos que Imparto', icon: '🎓' },
        { key: 'tareas' as TabType, label: 'Mis Tareas Creadas', icon: '📋' },
        { key: 'entregas' as TabType, label: 'Entregas Pendientes', icon: '⏰' },
        { key: 'estadisticas' as TabType, label: 'Estadísticas', icon: '📊' }
      ];
    } else {
      return [
        ...baseTabs,
        { key: 'cursos' as TabType, label: 'Todos los Cursos', icon: '🏫' },
        { key: 'tareas' as TabType, label: 'Todas las Tareas', icon: '📚' },
        { key: 'entregas' as TabType, label: 'Todas las Entregas', icon: '📦' },
        { key: 'estadisticas' as TabType, label: 'Estadísticas Generales', icon: '📈' }
      ];
    }
  }
  getEstadoColorDetallado(entrega: EntregaResponseDTO): string {
    switch (entrega.estado) {
      case EstadoEntrega.PENDIENTE:
        return '#ff9800'; // Naranja
      case EstadoEntrega.ENTREGADA:
        return '#2196f3'; // Azul
      case EstadoEntrega.CALIFICADA:
        return '#4caf50'; // Verde
      case EstadoEntrega.FUERA_PLAZO:
        // ✅ NUEVO: Color diferente para entregas automáticas
        if (this.entregaService.esEntregaAutomaticaPorVencimiento(entrega)) {
          return '#9e9e9e'; // Gris para automáticas
        }
        return '#f44336'; // Rojo para entregas tardías normales
      default:
        return '#666';
    }
  }

  // ELIMINAR el método loadEntregasProfesor() ya que no lo necesitamos

  // MODIFICAR el método aplicarFiltrosEntregas():
  aplicarFiltrosEntregas(): void {
    if (!this.usuario) return;

    console.log('🔍 === APLICANDO FILTROS ENTREGAS ===');
    console.log('Filtro estado:', this.filtroEstadoEntregas);
    console.log('Filtro búsqueda:', this.filtroBusquedaEntregas);

    // ✅ PARTIR DE LAS ENTREGAS YA FILTRADAS POR ROL
    let entregasFiltradas = [...this.entregas];

    // Aplicar filtro por estado si no es "todos"
    if (this.filtroEstadoEntregas !== 'todos') {
      entregasFiltradas = entregasFiltradas.filter(entrega =>
        entrega.estado === this.filtroEstadoEntregas
      );
      console.log(`📊 Después de filtro por estado: ${entregasFiltradas.length}`);
    }

    // Aplicar filtro de búsqueda por nombre de alumno o tarea
    if (this.filtroBusquedaEntregas.trim()) {
      const busqueda = this.filtroBusquedaEntregas.toLowerCase().trim();
      entregasFiltradas = entregasFiltradas.filter(entrega =>
        entrega.alumno?.nombre?.toLowerCase().includes(busqueda) ||
        entrega.alumno?.apellido?.toLowerCase().includes(busqueda) ||
        entrega.tarea?.nombre?.toLowerCase().includes(busqueda)
      );
      console.log(`🔍 Después de filtro por búsqueda: ${entregasFiltradas.length}`);
    }

    // ✅ ACTUALIZAR LA LISTA MOSTRADA
    this.entregasMostradas = entregasFiltradas;

    // Si es profesor, agrupar por estado
    if (this.esProfesor()) {
      this.agruparEntregasPorEstadoMostradas();
    }

    console.log(`📋 Total entregas mostradas: ${this.entregasMostradas.length}`);
    console.log('=====================================');
  }

  agruparEntregasPorEstadoMostradas(): void {
    this.entregasPorEstadoMostradas = {
      pendientes: this.entregasMostradas.filter(e => e.estado === EstadoEntrega.PENDIENTE),
      entregadas: this.entregasMostradas.filter(e => e.estado === EstadoEntrega.ENTREGADA),
      calificadas: this.entregasMostradas.filter(e => e.estado === EstadoEntrega.CALIFICADA),
      fueraPlazo: this.entregasMostradas.filter(e => e.estado === EstadoEntrega.FUERA_PLAZO)
    };
  }

  onFiltroEstadoChange(): void {
    this.aplicarFiltrosEntregas();
  }

  onBusquedaChange(): void {
    // Aplicar filtro con un pequeño delay para mejor UX
    setTimeout(() => {
      this.aplicarFiltrosEntregas();
    }, 300);
  }


  limpiarFiltrosEntregas(): void {
    this.filtroEstadoEntregas = 'todos';
    this.filtroBusquedaEntregas = '';
    this.entregasMostradas = [...this.entregas]; // Restaurar entregas sin filtros adicionales

    if (this.esProfesor()) {
      this.agruparEntregasPorEstadoMostradas();
    }
  }

// 5. AGREGAR métodos para acciones rápidas:

calificarRapidamente(entregaId: number, nota: number): void {
  if (!this.esProfesor()) return;

  const calificacion = {
    nota: nota,
    comentarios: `Calificación rápida: ${nota}/10`
  };

  this.entregaService.calificarEntrega(entregaId, calificacion).subscribe({
    next: (entrega) => {
      this.successMessage = `Entrega calificada con ${nota}/10`;
      this.loadEntregas(); // Recargar lista
      setTimeout(() => this.successMessage = null, 3000);
    },
    error: (err) => {
      this.error = 'Error al calificar la entrega';
      console.error('Error:', err);
    }
  });
}

verEntregasDeAlumno(alumnoId: number): void {
  this.router.navigate(['/entregas'], {
    queryParams: { alumnoId: alumnoId }
  });
}

verEntregasDeTarea(tareaId: number): void {
  this.router.navigate(['/entregas'], {
    queryParams: { tareaId: tareaId }
  });
}

// 6. AGREGAR métodos para estadísticas mejoradas:

  getEstadisticasEntregasDetalladas() {
    const total = this.entregasMostradas.length;
    const pendientes = this.entregasPorEstadoMostradas.pendientes.length;
    const entregadas = this.entregasPorEstadoMostradas.entregadas.length;
    const calificadas = this.entregasPorEstadoMostradas.calificadas.length;
    const fueraPlazo = this.entregasPorEstadoMostradas.fueraPlazo.length;

    // Calcular promedio de notas de entregas calificadas
    const entregasConNota = this.entregasPorEstadoMostradas.calificadas.filter(e => e.nota !== undefined);
    const promedioNotas = entregasConNota.length > 0
      ? entregasConNota.reduce((sum, e) => sum + (e.nota || 0), 0) / entregasConNota.length
      : 0;

    return {
      total,
      pendientes,
      entregadas,
      calificadas,
      fueraPlazo,
      promedioNotas,
      porcentajeEntregado: total > 0 ? Math.round(((entregadas + calificadas + fueraPlazo) / total) * 100) : 0,
      porcentajeCalificado: total > 0 ? Math.round((calificadas / total) * 100) : 0
    };
  }
// 7. AGREGAR método para obtener alumnos únicos:

getAlumnosUnicos(): {id: number, nombre: string, apellido: string, totalEntregas: number}[] {
  const alumnosMap = new Map();

  this.entregas.forEach(entrega => {
    if (entrega.alumno) {
      const alumnoId = entrega.alumno.id;
      if (alumnosMap.has(alumnoId)) {
        alumnosMap.get(alumnoId).totalEntregas++;
      } else {
        alumnosMap.set(alumnoId, {
          id: alumnoId,
          nombre: entrega.alumno.nombre || '',
          apellido: entrega.alumno.apellido || '',
          totalEntregas: 1
        });
      }
    }
  });

  return Array.from(alumnosMap.values()).sort((a, b) =>
    `${a.apellido} ${a.nombre}`.localeCompare(`${b.apellido} ${b.nombre}`)
  );
}

// 8. AGREGAR método para obtener tareas con entregas:

getTareasConEntregas(): {id: number, nombre: string, totalEntregas: number, pendientesCalificacion: number}[] {
    const tareasMap = new Map();

    this.entregas.forEach(entrega => {
      if (entrega.tarea) {
        const tareaId = entrega.tarea.id;
        const esPendienteCalificacion = entrega.estado === EstadoEntrega.ENTREGADA;

        if (tareasMap.has(tareaId)) {
          tareasMap.get(tareaId).totalEntregas++;
          if (esPendienteCalificacion) {
            tareasMap.get(tareaId).pendientesCalificacion++;
          }
        } else {
          tareasMap.set(tareaId, {
            id: tareaId,
            nombre: entrega.tarea.nombre || '',
            totalEntregas: 1,
            pendientesCalificacion: esPendienteCalificacion ? 1 : 0
          });
        }
      }
    });

    return Array.from(tareasMap.values()).sort((a, b) =>
      b.pendientesCalificacion - a.pendientesCalificacion
    );
  }

  verTodasMisEntregas(): void {
    if (!this.esAlumno() || !this.usuario?.alumnoId) {
      this.error = 'No se puede acceder a las entregas: usuario no identificado como alumno';
      return;
    }

    // Navegar a la ruta de entregas con filtro por alumno
    this.router.navigate(['/entregas'], {
      queryParams: {
        alumnoId: this.usuario.alumnoId,
        vista: 'mis-entregas',
        origen: 'perfil'
      }
    });
  }

  /**
   * Obtiene el número de entregas calificadas del alumno
   */
  getEntregasCalificadasAlumno(): number {
    if (!this.esAlumno()) return 0;

    return this.entregasMostradas.filter(entrega =>
      entrega.estado === EstadoEntrega.CALIFICADA ||
      (entrega.estado === EstadoEntrega.FUERA_PLAZO && entrega.nota !== undefined)
    ).length;
  }

  /**
   * Obtiene el número de entregas pendientes del alumno
   */
  getEntregasPendientesAlumno(): number {
    if (!this.esAlumno()) return 0;

    return this.entregasMostradas.filter(entrega =>
      entrega.estado === EstadoEntrega.PENDIENTE ||
      entrega.estado === EstadoEntrega.ENTREGADA
    ).length;
  }

  /**
   * Calcula el promedio de notas del alumno
   */
  getPromedioNotasAlumno(): number {
    if (!this.esAlumno()) return 0;

    const entregasConNota = this.entregasMostradas.filter(entrega =>
      entrega.nota !== undefined && entrega.nota !== null
    );

    if (entregasConNota.length === 0) return 0;

    const sumaNotas = entregasConNota.reduce((suma, entrega) => suma + (entrega.nota || 0), 0);
    return sumaNotas / entregasConNota.length;
  }

  /**
   * Genera un mensaje motivacional basado en el rendimiento del alumno
   */
  getMensajeMotiacional(): {icon: string, texto: string} | null {
    if (!this.esAlumno()) return null;

    const totalEntregas = this.entregasMostradas.length;
    const calificadas = this.getEntregasCalificadasAlumno();
    const pendientes = this.getEntregasPendientesAlumno();
    const promedio = this.getPromedioNotasAlumno();

    // Sin entregas
    if (totalEntregas === 0) {
      return {
        icon: '🚀',
        texto: '¡Empezarás a ver tus entregas aquí cuando completes tus primeras tareas!'
      };
    }

    // Excelente rendimiento
    if (promedio >= 8.5 && pendientes === 0) {
      return {
        icon: '🌟',
        texto: '¡Excelente trabajo! Mantienes un promedio sobresaliente y estás al día.'
      };
    }

    // Buen rendimiento pero con pendientes
    if (promedio >= 7 && pendientes > 0) {
      return {
        icon: '💪',
        texto: `¡Buen promedio! Tienes ${pendientes} entregas pendientes por completar.`
      };
    }

    // Rendimiento que necesita mejora
    if (promedio < 6 && promedio > 0) {
      return {
        icon: '📈',
        texto: '¡Ánimo! Cada entrega es una oportunidad para mejorar tu promedio.'
      };
    }

    // Muchas pendientes
    if (pendientes > 3) {
      return {
        icon: '⏰',
        texto: `Tienes ${pendientes} entregas pendientes. ¡Es momento de ponerte al día!`
      };
    }

    // Todo al día
    if (pendientes === 0 && calificadas > 0) {
      return {
        icon: '✨',
        texto: '¡Perfecto! Estás al día con todas tus entregas.'
      };
    }

    return null;
  }

  /**
   * Navega directamente a hacer una entrega específica (método de utilidad)
   */
  hacerEntregaRapida(tareaId: number): void {
    if (!this.esAlumno()) return;

    this.router.navigate(['/tareas', tareaId, 'entrega'], {
      queryParams: {
        origen: 'perfil-entregas',
        redirigir: 'perfil'
      }
    });
  }
}
