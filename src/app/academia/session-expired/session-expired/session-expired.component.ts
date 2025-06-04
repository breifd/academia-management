import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-session-expired',
  imports: [],
  templateUrl: './session-expired.component.html',
  styleUrl: './session-expired.component.scss'
})
export class SessionExpiredComponent {
   countdown = 10;
  private countdownInterval: any;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Asegurar que el usuario esté deslogueado
    this.authService.logout();

    // Iniciar countdown
    this.startCountdown();
  }

  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  private startCountdown(): void {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.redirectToLogin();
      }
    }, 1000);
  }

  redirectToLogin(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/login']);
  }

}
