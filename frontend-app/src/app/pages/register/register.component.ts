import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { UserRole } from '@frontend/shared-models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = signal(false);
  error = signal('');

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      const userRole = this.authService.userRole() || 'ROLE_INVESTOR';
      switch (userRole) {
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
        case 'ROLE_INVESTOR':
        default:
          this.router.navigate(['/investor/dashboard']);
      }
    }
  }

  onRegister(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const formValues = this.registerForm.value;
    const nameParts = formValues.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    this.api.register({
      email: formValues.email,
      password: formValues.password,
      fullName: formValues.fullName,
      firstName,
      lastName,
      role: 'ROLE_INVESTOR'
    }).subscribe({
      next: (response) => {
        this.authService.login(response);
        this.loading.set(false);
        this.router.navigate(['/kyc']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.error?.error?.message || 'Registration failed.');
      },
    });
  }
}



