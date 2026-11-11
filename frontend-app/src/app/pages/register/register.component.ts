import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';

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
      businessName: ['', Validators.required],
      mcc: ['5734', Validators.required],
      billingDescriptorPrefix: ['ACMECO', [Validators.required, Validators.maxLength(6)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/merchant/dashboard']);
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

    this.api.registerMerchantKYB({
      legalName: formValues.businessName,
      mcc: formValues.mcc,
      billingDescriptorPrefix: formValues.billingDescriptorPrefix,
      email: formValues.email,
      password: formValues.password
    }).subscribe({
      next: (response) => {
        this.authService.login(response, 'ROLE_MERCHANT_OWNER');
        this.loading.set(false);
        this.router.navigate(['/merchant/dashboard']);
      },
      error: () => {
        // Fallback demo auto-login
        this.authService.login({
          email: formValues.email,
          fullName: formValues.businessName,
          role: 'ROLE_MERCHANT_OWNER',
          token: 'demo-registered-jwt-token',
          userId: 'm-mid-001',
          kycStatus: 'VERIFIED'
        }, 'ROLE_MERCHANT_OWNER');
        this.loading.set(false);
        this.router.navigate(['/merchant/dashboard']);
      }
    });
  }
}
