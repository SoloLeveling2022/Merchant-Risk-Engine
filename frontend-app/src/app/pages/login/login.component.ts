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
      const role = this.authService.userRole() || 'ROLE_MERCHANT_OWNER';
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
        const targetRole = overrideRole || response.role || (response.roles && response.roles[0]) || 'ROLE_MERCHANT_OWNER';
        this.authService.login(response, targetRole as any);
        this.loading.set(false);
        this.navigateByRole(targetRole);
      },
      error: () => {
        // Fallback for mock demo offline login
        const targetRole = overrideRole || 'ROLE_MERCHANT_OWNER';
        this.authService.login({
          email,
          role: targetRole as any,
          token: 'demo-jwt-token-merchant-risk',
          userId: 'm-mid-001',
          kycStatus: 'VERIFIED'
        }, targetRole as any);
        this.loading.set(false);
        this.navigateByRole(targetRole);
      },
    });
  }

  private navigateByRole(role: string): void {
    switch (role) {
      case 'ROLE_RISK_ANALYST':
      case 'ROLE_RISK_ADMIN':
      case 'ROLE_ADMIN':
        this.router.navigate(['/risk-ops/control-tower']);
        break;
      case 'ROLE_MERCHANT_FINANCE':
      case 'ROLE_MERCHANT_OWNER':
      default:
        this.router.navigate(['/merchant/dashboard']);
        break;
    }
  }
}
