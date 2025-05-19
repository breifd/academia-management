import { Component, OnDestroy, OnInit } from '@angular/core';
import { Usuario } from '../../../interfaces/usuario';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { forkJoin, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { TareaService } from '../../../services/tarea.service';
import { CursoService } from '../../../services/curso.service';
import { ProfesorService } from '../../../services/profesor.service';
import { AlumnoService } from '../../../services/alumno.service';


interface EstadisticasData {
  totalProfesores: number;
  totalAlumnos: number;
  totalCursos: number;
  totalEspecialidades: number;
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
    totalEspecialidades: 0,
    loading: true,
    error: null
  };

  usuario: Usuario | null = null;
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
      especialidades: this.profesorService.getEspecialidades()
    }).subscribe({
      next: (resultados) => {
        this.estadisticas = {
          totalProfesores: resultados.profesores.length,
          totalAlumnos: resultados.alumnos.totalElements, // Usar totalElements de la paginación
          totalCursos: resultados.cursos.length,
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
