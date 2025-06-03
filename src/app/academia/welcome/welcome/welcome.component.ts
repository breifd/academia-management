import { Component, OnDestroy, OnInit } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TareaService } from '../../../services/tarea.service';
import { CursoService } from '../../../services/curso.service';
import { ProfesorService } from '../../../services/profesor.service';
import { AlumnoService } from '../../../services/alumno.service';
import { EntregaService } from '../../../services/entrega.service';
import { LoginResponse, RolUsuario } from '../../../interfaces/usuario';


interface EstadisticasData {
  totalProfesores: number;
  totalAlumnos: number;
  totalCursos: number;
  totalEspecialidades: number;
  totalTareas: number;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss'
})
// Componente de bienvenida que se muestra al usuario después de iniciar sesión
// Este componente se encarga de mostrar la información del usuario actual y permitir el cierre de sesión
export class WelcomeComponent implements OnInit, OnDestroy {

  //Estadísticas Academia
   estadisticas: EstadisticasData = {
    totalProfesores: 0,
    totalAlumnos: 0,
    totalCursos: 0,
    totalTareas: 0,
    totalEspecialidades: 0,
    loading: true,
    error: null as string | null
  };

  usuario: LoginResponse | null = null;
  private userSubscription: Subscription | undefined; // Subscription para el usuario actual que se obtiene del servicio de autenticación

  constructor(private router : Router,
                private authService: AuthService,
                private alumnoService: AlumnoService,
                private profesorService: ProfesorService,
                private cursoService: CursoService,
                private tareaService: TareaService){}

  // Método que se ejecuta al inicializar el componente
  // Se suscribe al observable de usuario actual del servicio de autenticación para poder obtener el usuario actual
  // Si no hay usuario, redirige a la página de inicio de sesión
  // Se almacena la suscripción en una variable para poder cancelarla al destruir el componente
  ngOnInit(): void {
    // Se suscribe al observable de usuario actual del servicio de autenticación para poder obtener el usuario actual
    this.userSubscription = this.authService.currentUser.subscribe(user =>{
      this.usuario = user; // Asigna el usuario actual al componente
      if(!this.usuario){ // Si no hay usuario, redirige a la página de inicio de sesión
        this.router.navigate(['/login']);
      }
    });
    this.cargarEstadisticas(); // Llama al método para cargar las estadísticas de la academia
  }

  ngOnDestroy(): void {
    // Cancela la suscripcion para evitar fugas de memoria, y no seguir escuchando cambios en el usuario actual al destruir el componente
    // Se verifica si la suscripción existe antes de cancelarla
    // Esto es importante porque si la suscripción no existe, se lanzará un error al intentar cancelarla
    // Una vez se cierra la pestaña o se navega a otra página, se cancela la suscripción, perdiendo la referencia al usuario
    // Para poder ir acceder otra vez a la pagina welcome es obligatorio volver a iniciar sesión
    if(this.userSubscription){
      this.userSubscription.unsubscribe();
    }
  }

  // ================================
  // MÉTODOS PARA SALUDO PERSONALIZADO
  // ================================

  /**
   * Obtiene un saludo personalizado según la hora del día
   */
  getSaludo(): string {
    if (!this.usuario) return 'Bienvenido';

    const hora = new Date().getHours();
    const nombre = this.usuario.nombre || 'Usuario';

    if (hora >= 5 && hora < 12) {
      return `¡Buenos días, ${nombre}!`;
    } else if (hora >= 12 && hora < 18) {
      return `¡Buenas tardes, ${nombre}!`;
    } else if (hora >= 18 && hora < 22) {
      return `¡Buenas noches, ${nombre}!`;
    } else {
      return `¡Hola, ${nombre}!`;
    }
  }

  /**
   * Obtiene las iniciales del usuario para mostrar en el avatar
   */
  getInitials(): string {
    if (!this.usuario) return 'U';

    const nombre = this.usuario.nombre || '';
    const apellido = this.usuario.apellido || '';

    const inicialNombre = nombre.charAt(0).toUpperCase();
    const inicialApellido = apellido.charAt(0).toUpperCase();

    return `${inicialNombre}${inicialApellido}` || 'U';
  }

  /**
   * Obtiene el nombre del rol en español para mostrar al usuario
   */
  getRoleDisplayName(): string {
    if (!this.usuario?.rol) return 'Usuario';

    switch (this.usuario.rol) {
      case RolUsuario.ADMIN:
        return 'Administrador';
      case RolUsuario.PROFESOR:
        return 'Profesor';
      case RolUsuario.ALUMNO:
        return 'Estudiante';
      default:
        return 'Usuario';
    }
  }

  /**
   * Obtiene el icono correspondiente al rol del usuario
   */
  getRoleIcon(): string {
    if (!this.usuario?.rol) return '👤';

    switch (this.usuario.rol) {
      case RolUsuario.ADMIN:
        return '⚡'; // Rayo para administrador
      case RolUsuario.PROFESOR:
        return '🎓'; // Birrete para profesor
      case RolUsuario.ALUMNO:
        return '📚'; // Libros para estudiante
      default:
        return '👤'; // Usuario genérico
    }
  }

  /**
   * Obtiene un mensaje de bienvenida contextual según el rol
   */
  getMensajeContextual(): string {
    if (!this.usuario?.rol) return '';

    switch (this.usuario.rol) {
      case RolUsuario.ADMIN:
        return 'Gestiona y supervisa toda la academia desde aquí';
      case RolUsuario.PROFESOR:
        return 'Crea y gestiona tus cursos y tareas';
      case RolUsuario.ALUMNO:
        return 'Accede a tus cursos y realiza tus tareas';
      default:
        return 'Bienvenido a la plataforma';
    }
  }

   private cargarEstadisticas(): void {
    // Inicializa las estadísticas
    this.estadisticas.loading = true;
    this.estadisticas.error = null;

    // Usar forkJoin para ejecutar todas las peticiones en paralelo
    // forkJoin espera a que todas las peticiones se completen y luego devuelve un array con los resultados
    forkJoin({
      profesores: this.profesorService.getProfesoresLista(),
      alumnos: this.alumnoService.getAlumnos(0, 1000), // Obtener una página grande para contar todos
      cursos: this.cursoService.getCursosLista(),
      tareas: this.tareaService.getTareasLista(),
      especialidades: this.profesorService.getEspecialidades()
    }).subscribe({
      next: (resultados) => {
        this.estadisticas = {
          totalProfesores: resultados.profesores.length,
          totalAlumnos: resultados.alumnos.totalElements, // Usar totalElements de la paginación
          totalCursos: resultados.cursos.length,
          totalTareas:resultados.tareas.length,
          totalEspecialidades: resultados.especialidades.length,
          loading: false,
          error: null
        };
      },
      error: (error) => {
        console.error('Error al cargar estadísticas:', error);
        this.estadisticas.loading = false;
        this.estadisticas.error = 'Error al cargar las estadísticas';

        // Valores por defecto en caso de error
        this.estadisticas.totalProfesores = 0;
        this.estadisticas.totalAlumnos = 0;
        this.estadisticas.totalCursos = 0;
        this.estadisticas.totalTareas = 0;
        this.estadisticas.totalEspecialidades = 0;
      }
    });
  }

  logout(): void {
    this.authService.logout(); // Llama al método de cierre de sesión del servicio de autenticación
    this.router.navigate(['/login']); // Redirige a la página de inicio de sesión
  }

   recargarEstadisticas(): void {
    this.cargarEstadisticas();
  }

}
