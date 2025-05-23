import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

import { CommonModule } from '@angular/common';
import { LoginRequest } from '../../../interfaces/usuario';

@Component({
  selector: 'app-login',
  // Este componente se encarga de manejar el inicio de sesión del usuario
  standalone: true,
  imports: [ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  // FormGroup para el formulario de inicio de sesión
  // Se utiliza para agrupar los controles del formulario y manejar su validación
  loginForm: FormGroup;
  // Propiedades para manejar el estado de carga y errores
  loading = false;
  // Mensaje de error que se muestra al usuario en caso de que el inicio de sesión falle
  error = '';
  // Propiedades para manejar el nombre de usuario y la contraseña
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Inicializa el formulario de inicio de sesión utilizando FormBuilder
    // Se definen los controles del formulario y sus validaciones
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Si el usuario ya está autenticado, redirigir a la página de bienvenida
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/welcome']);
    }
  }

  onSubmit() {
    // Validar el formulario
    if (this.loginForm.invalid) {
      // Si el formulario es inválido, mostrar un mensaje de error y salir
      this.error = 'Por favor, complete todos los campos requeridos.';
      return;
    }

    this.loading = true;
    this.error = '';

    // Crear el objeto de solicitud de login
    // Se utiliza el método get del FormGroup para obtener los valores de los controles del formulario
    const loginRequest: LoginRequest = {
      username: this.loginForm.get('username')?.value,
      password: this.loginForm.get('password')?.value
    };
    console.log(loginRequest);
    // Llamar al servicio de autenticación
    this.authService.login(loginRequest).subscribe({
      next: (response) => {
        if (response.success) {
          this.router.navigate(['/welcome']);
        } else {
          this.error = response.message || 'Error en el inicio de sesión';
          this.loading = false;
          console.log(this.error);
          // Si la respuesta no es exitosa, mostrar un mensaje de error
        }
      },
      // Manejar el error de la solicitud
      // Si la solicitud falla, mostrar un mensaje de error
      error: (err) => {
        this.error = err.error?.message || 'Error en el servidor';
        this.loading = false;
        console.log("No existe el usuario en la base de datos"+this.error);
      }
    });
  }

}
