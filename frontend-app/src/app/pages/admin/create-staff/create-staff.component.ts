import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@frontend/shared-api';
import { NotificationService } from '@frontend/shared-notifications';

@Component({
  selector: 'app-create-staff',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-staff.component.html',
  styleUrl: './create-staff.component.css'
})
export class CreateStaffComponent implements OnInit {
  registerForm: FormGroup;
  loading = signal(false);
  error = signal('');
  createdStaffModal = signal<{ fullName: string; email: string; role: string; password: string } | null>(null);
  copiedCredentials = signal(false);

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private notificationService: NotificationService
  ) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['ROLE_UNDERWRITER', Validators.required]
    });
  }

  ngOnInit(): void {}

  onCreateStaff(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set('');

    const formValues = this.registerForm.value;
    const nameParts = formValues.fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Staff';
    const lastName = nameParts.slice(1).join(' ') || '';

    const role = formValues.role;
    let shortRole = 'STAFF';
    if (role === 'ROLE_UNDERWRITER') shortRole = 'UNDERWRITER';
    else if (role === 'ROLE_CLAIMS_ANALYST') shortRole = 'CLAIMS';
    else if (role === 'ROLE_COMPLIANCE') shortRole = 'COMPLIANCE';
    else if (role === 'ROLE_ADMIN') shortRole = 'ADMIN';

    const staffMarker = `STAFF:${shortRole}`;

    this.api.register({
      email: formValues.email,
      password: formValues.password,
      fullName: formValues.fullName,
      firstName,
      lastName,
      phoneNumber: staffMarker,
      role: formValues.role
    }).subscribe({
      next: () => {
        this.loading.set(false);

        // Persist to local staff registry for guaranteed client-side resolution
        try {
          const registry = JSON.parse(localStorage.getItem('platform_staff_registry') || '{}');
          registry[formValues.email.toLowerCase().trim()] = {
            email: formValues.email.toLowerCase().trim(),
            fullName: formValues.fullName,
            role: formValues.role,
            createdAt: new Date().toISOString()
          };
          localStorage.setItem('platform_staff_registry', JSON.stringify(registry));
        } catch (e) {
          console.warn('Failed to save staff registry to localStorage', e);
        }

        this.createdStaffModal.set({
          fullName: formValues.fullName,
          email: formValues.email,
          role: formValues.role,
          password: formValues.password
        });

        this.notificationService.addToast(
          '<span class="material-symbols-outlined align-middle">check_circle</span> Success',
          `Successfully created ${formValues.role} account for ${formValues.email}`,
          'SUCCESS'
        );
        this.registerForm.reset({ role: 'ROLE_UNDERWRITER' });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || err.error?.error?.message || 'Failed to create staff account.');
      },
    });
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'ROLE_UNDERWRITER': return 'bg-accent-500/20 text-accent-300 border border-accent-500/30 text-xs px-2.5 py-1 font-bold rounded-lg';
      case 'ROLE_CLAIMS_ANALYST': return 'bg-primary-500/20 text-primary-600 border border-primary-500/30 text-xs px-2.5 py-1 font-bold rounded-lg';
      case 'ROLE_COMPLIANCE': return 'bg-info-500/20 text-info-300 border border-info-500/30 text-xs px-2.5 py-1 font-bold rounded-lg';
      case 'ROLE_ADMIN': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-2.5 py-1 font-bold rounded-lg';
      default: return 'bg-surface-800 text-surface-200 text-xs px-2.5 py-1 font-bold rounded-lg';
    }
  }

  formatRoleName(role: string): string {
    switch (role) {
      case 'ROLE_UNDERWRITER': return 'Underwriter';
      case 'ROLE_CLAIMS_ANALYST': return 'Claims Analyst';
      case 'ROLE_COMPLIANCE': return 'Compliance Officer';
      case 'ROLE_ADMIN': return 'Administrator';
      default: return role;
    }
  }

  copyCredentials(staff: { email: string; password: string }): void {
    const text = `StockShield Portal Login\nEmail: ${staff.email}\nTemporary Password: ${staff.password}`;
    navigator.clipboard?.writeText(text);
    this.copiedCredentials.set(true);
    setTimeout(() => this.copiedCredentials.set(false), 3000);
  }
}



