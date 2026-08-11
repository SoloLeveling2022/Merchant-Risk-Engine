import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';

@Component({
  selector: 'app-kyc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './kyc.component.html',
  styleUrl: './kyc.component.css'
})
export class KycComponent implements OnInit {
  panNumber = ''; // Kept for display in the template
  kycForm: FormGroup;

  kycStatus = signal<string>('NOT_SUBMITTED');
  showKycGuidelinesModal = signal(false);
  loading = signal(false);
  checkingStatus = signal(false);
  error = signal('');

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.kycForm = this.fb.group({
      panNumber: ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i)]]
    });
  }

  ngOnInit(): void {
    const currentKyc = this.authService.user()?.kycStatus || 'NOT_SUBMITTED';
    this.kycStatus.set(currentKyc);
    this.checkStatus();
  }

  checkStatus(): void {
    const userId = this.authService.userId();
    if (!userId) return;

    this.checkingStatus.set(true);
    this.api.getKycStatus(userId).subscribe({
      next: (res: any) => {
        this.checkingStatus.set(false);
        const record = res?.data || res;
        if (record && record.kycStatus) {
          this.kycStatus.set(record.kycStatus);
          this.authService.updateKycStatus(record.kycStatus);
          if (record.panNumber) {
            this.panNumber = record.panNumber;
            this.kycForm.patchValue({ panNumber: record.panNumber });
          }
        }
      },
      error: () => this.checkingStatus.set(false),
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/investor/dashboard']);
  }

  onSubmit(): void {
    if (this.kycForm.invalid) {
      this.kycForm.markAllAsTouched();
      return;
    }

    const userId = this.authService.userId();
    if (!userId) return;

    this.loading.set(true);
    this.error.set('');

    const formValues = this.kycForm.value;

    this.api.submitKyc({
      userId,
      panNumber: formValues.panNumber.toUpperCase()
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        const status = 'PENDING';
        this.kycStatus.set(status);
        this.authService.updateKycStatus('PENDING');
        this.notificationService.addToast('KYC Application Submitted', 'Your identity details are under manual compliance review.', 'WARNING');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.error?.message || 'KYC submission failed. Please try again.');
      },
    });
  }

  formatStatus(status: string): string {
    if (status === 'PENDING' || status === 'SUBMITTED' || status === 'MANUAL_REVIEW' || status === 'PENDING_VERIFICATION') {
      return '<span class="material-symbols-outlined align-middle">hourglass_empty</span> PENDING COMPLIANCE APPROVAL';
    }
    if (status === 'APPROVED' || status === 'VERIFIED') return '<span class="material-symbols-outlined align-middle">check_circle</span> VERIFIED';
    if (status === 'REJECTED') return '<span class="material-symbols-outlined align-middle">cancel</span> REJECTED';
    return '<span class="material-symbols-outlined align-middle">warning</span> NOT SUBMITTED';
  }

  getBadgeClass(status: string): string {
    if (status === 'PENDING' || status === 'SUBMITTED' || status === 'MANUAL_REVIEW' || status === 'PENDING_VERIFICATION') {
      return 'badge bg-neutral-500/20 text-neutral-300 border border-neutral-500/30 px-3 py-1 rounded-full text-xs font-semibold';
    }
    if (status === 'APPROVED' || status === 'VERIFIED') {
      return 'badge bg-success-500/20 text-success-400 border border-success-500/30 px-3 py-1 rounded-full text-xs font-semibold';
    }
    if (status === 'REJECTED') {
      return 'badge bg-danger-500/20 text-danger-400 border border-danger-500/30 px-3 py-1 rounded-full text-xs font-semibold';
    }
    return 'badge bg-surface-800 text-surface-200 px-3 py-1 rounded-full text-xs';
  }

  maskPan(pan: string): string {
    if (!pan || pan.length < 10) return pan;
    return pan.substring(0, 3) + '****' + pan.substring(7);
  }
}
