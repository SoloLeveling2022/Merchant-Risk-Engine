import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  loading = signal(false);
  error = signal('');

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const role = this.authService.userRole() || 'ROLE_INVESTOR';
      this.navigateByRole(role);
    }
  }

  quickLogin(email: string, password: string, expectedRole?: string): void {
    this.loginForm.patchValue({ email, password });
    this.onLogin(expectedRole);
  }

  onLogin(overrideRole?: string): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const { email, password } = this.loginForm.value;

    this.api.login({ email, password }).subscribe({
      next: (response) => {
        const targetRole = overrideRole || response.role || (response.roles && response.roles[0]) || 'ROLE_INVESTOR';
        this.authService.login(response, targetRole as any);
        this.loading.set(false);
        this.navigateByRole(targetRole);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.error?.error?.message || 'Login failed. Please check your credentials.');
      },
    });
  }


  private navigateByRole(role: string): void {
    switch (role) {
      case 'ROLE_INVESTOR':
        this.router.navigate(['/investor/dashboard']);
        break;
      case 'ROLE_UNDERWRITER':
        this.router.navigate(['/underwriter/dashboard']);
        break;
      case 'ROLE_CLAIMS_ANALYST':
        this.router.navigate(['/claims-analyst/dashboard']);
        break;
      case 'ROLE_COMPLIANCE':
      case 'ROLE_COMPLIANCE_OFFICER':
        this.router.navigate(['/compliance/kyc']);
        break;
      case 'ROLE_ADMIN':
        this.router.navigate(['/underwriter/dashboard']);
        break;
      default:
        this.router.navigate(['/investor/dashboard']);
    }
  }
}


