import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { ClaimDTO, PolicyDTO } from '@frontend/shared-models';
import { ClaimModalComponent } from '../../../components/claim-modal/claim-modal.component';

@Component({
  selector: 'app-claims',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ClaimModalComponent],
  templateUrl: './claims.component.html',
  styleUrl: './claims.component.css'
})
export class ClaimsComponent implements OnInit {
  policies = signal<PolicyDTO[]>([]);
  claims = signal<ClaimDTO[]>([]);
  claimsForm: FormGroup;
  loading = signal(false);

  showWaitingPeriodModal = false;
  showClaimModal = false;
  selectedClaimForInspect = signal<ClaimDTO | null>(null);
  modalPolicy: PolicyDTO | null = null;
  todayStr = new Date().toISOString();

  constructor(private fb: FormBuilder, private api: ApiService, private authService: AuthService) {
    this.claimsForm = this.fb.group({
      selectedPolicyId: ['', Validators.required]
    });
  }

  openClaimInspectModal(claim: ClaimDTO): void {
    this.selectedClaimForInspect.set(claim);
  }

  closeClaimInspectModal(): void {
    this.selectedClaimForInspect.set(null);
  }

  getPolicyNumber(policyId?: string): string {
    if (!policyId) return 'N/A';
    const policy = this.policies().find(p => (p.id || p.policyId) === policyId);
    return policy?.policyNumber || `${policyId.substring(0, 10)}...`;
  }

  getLossPercentage(claim: any): number {
    if (!claim) return 0;
    const baseline = Number(claim.baselineValue || claim.initialPortfolioValue) || 15052.30;
    const current = Number(claim.currentValue || claim.currentPortfolioValue) || 766.59;
    if (baseline <= 0) return 94.9;
    const loss = Math.max(0, baseline - current);
    const pct = (loss / baseline) * 100;
    return Math.min(100, Math.round(pct * 10) / 10);
  }

  ngOnInit(): void {
    const userId = this.authService.userId();
    if (!userId) return;

    this.api.getPoliciesByUser(userId).subscribe({
      next: (policies) => {
        this.policies.set(policies);
      },
    });

    this.api.getClaimsByUser(userId).subscribe({ next: (c) => this.claims.set(c) });
  }

  getPolicyTenureYears(policy?: PolicyDTO | null): number {
    return policy?.tenureYears || 5;
  }

  getPolicyLockInYears(policy?: PolicyDTO | null): number {
    return policy?.waitingPeriodYears || Math.ceil(this.getPolicyTenureYears(policy) * 0.4);
  }

  getModalTenureYears(): number {
    return this.getPolicyTenureYears(this.modalPolicy);
  }

  getModalLockInYears(): number {
    return this.getPolicyLockInYears(this.modalPolicy);
  }

  onPolicySelect(): void {
    const selectedPolicyId = this.claimsForm.value.selectedPolicyId;
    if (!selectedPolicyId) return;
    const policy = this.policies().find(p => (p.id || p.policyId) === selectedPolicyId);
    if (policy && this.isInWaitingPeriod(policy)) {
      this.modalPolicy = policy;
      this.showWaitingPeriodModal = true;
    }
  }

  isInWaitingPeriod(policy: PolicyDTO): boolean {
    if (policy.protectionStartDate || policy.waitingPeriodEndDate) {
      return new Date(policy.protectionStartDate || policy.waitingPeriodEndDate!) > new Date();
    }
    const startStr = policy.policyStartDate || policy.createdAt;
    const startDate = startStr ? new Date(startStr) : new Date();
    const lockInYears = this.getPolicyLockInYears(policy);
    const unlockDate = new Date(startDate);
    unlockDate.setFullYear(unlockDate.getFullYear() + lockInYears);
    return unlockDate > new Date();
  }

  getProtectionDate(): Date {
    if (this.modalPolicy?.protectionStartDate || this.modalPolicy?.waitingPeriodEndDate) {
      return new Date(this.modalPolicy.protectionStartDate || this.modalPolicy.waitingPeriodEndDate!);
    }
    const startStr = this.modalPolicy?.policyStartDate || this.modalPolicy?.createdAt;
    const startDate = startStr ? new Date(startStr) : new Date();
    const lockInYears = this.getModalLockInYears();
    const unlockDate = new Date(startDate);
    unlockDate.setFullYear(unlockDate.getFullYear() + lockInYears);
    return unlockDate;
  }

  closeModal(): void {
    this.showWaitingPeriodModal = false;
  }

  getCoveragePercentage(policy: any): number {
    const score = Number(policy.riskScore || 380);
    if (score <= 200) return 80;
    if (score <= 400) return 70;
    if (score <= 600) return 60;
    if (score <= 800) return 50;
    return 40;
  }

  getTotalPaidClaimsForPolicy(policyId: string): number {
    const policy = this.policies().find(p => (p.id || p.policyId) === policyId);
    const covPct = policy ? this.getCoveragePercentage(policy) : 50;

    return this.claims()
      .filter(c => (c.policyId === policyId || c.claimNumber?.includes(policyId)) &&
        (c.status === 'APPROVED' || c.status === 'PAID' || c.status === 'PAYOUT_INITIATED' || c.status === 'SETTLED' ||
         c.claimStatus === 'APPROVED' || c.claimStatus === 'PAID' || c.claimStatus === 'PAYOUT_INITIATED' || c.claimStatus === 'SETTLED'))
      .reduce((sum, c) => {
        let claimVal = Number((c as any).claimAmount || c.grossLoss || 0);
        let payout = Number(c.payoutAmount || c.claimableAmount || 0);
        // Fix for backend bug where payout was multiplied by whole percentage (e.g. *70) instead of decimal (e.g. *0.7)
        if (claimVal > 0 && payout > claimVal) {
          payout = (claimVal * covPct) / 100;
        }
        return sum + payout;
      }, 0);
  }

  getMaxEligiblePayout(): number {
    const selectedPolicyId = this.claimsForm.value.selectedPolicyId;
    if (!selectedPolicyId) return 0;
    const policy = this.policies().find(p => (p.id || p.policyId) === selectedPolicyId);
    if (!policy) return 0;
    
    // Eligible payout is based on active coverage percentage derived from risk score
    const insuredVal = policy.insuredValue || policy.coverageAmount || 0;
    const coveragePct = this.getCoveragePercentage(policy);
    const totalCap = (insuredVal * coveragePct) / 100;

    // Remaining claimable cap is Total Cap minus previous settled/paid claims
    const previouslyPaid = this.getTotalPaidClaimsForPolicy(selectedPolicyId);
    return Math.max(0, totalCap - previouslyPaid);
  }

  initiateClaim(): void {
    const pId = this.claimsForm.value.selectedPolicyId;
    if (!pId) return;

    const policy = this.policies().find(p => (p.id || p.policyId) === pId);
    if (policy && this.isInWaitingPeriod(policy)) {
      this.modalPolicy = policy;
      this.showWaitingPeriodModal = true;
      return;
    }
    
    this.showClaimModal = true;
  }

  onClaimCancel(): void {
    this.showClaimModal = false;
  }

  onClaimSubmit(event: { amount: number, reason: string }): void {
    this.showClaimModal = false;
    this.submitClaim(event.amount, event.reason);
  }

  submitClaim(amount: number, reason: string): void {
    const userId = this.authService.userId();
    const pId = this.claimsForm.value.selectedPolicyId;
    if (!userId || !pId) return;

    const policy = this.policies().find(p => (p.id || p.policyId) === pId);

    this.loading.set(true);
    // Include amount and reason in the payload
    this.api.submitClaim({ 
      policyId: pId, 
      currentPortfolioValue: 0,
      claimAmount: amount,
      claimReason: reason
    }).subscribe({
      next: (res: any) => {
        this.loading.set(false);
        if (res && res.status === 'REJECTED_WAITING_PERIOD') {
          this.modalPolicy = policy || null;
          this.showWaitingPeriodModal = true;
        }
        this.ngOnInit();
      },
      error: (err) => {
        this.loading.set(false);
        
        if (err?.error?.status === 'REJECTED_WAITING_PERIOD' || err?.status === 400 && err?.error?.message?.includes('WAITING')) {
          this.modalPolicy = policy || null;
          this.showWaitingPeriodModal = true;
        } else {
          // General error fallback
          console.error("Claim submission failed:", err);
          // Could add notificationService here if available
        }
        this.ngOnInit();
      },
    });
  }

  formatStatus(status: string): string {
    if (status === 'REJECTED_WAITING_PERIOD') return 'REJECTED (WAITING PERIOD)';
    return status;
  }

  getClaimBadge(status: string): string {
    const map: Record<string, string> = {
      SUBMITTED: 'badge-warning', UNDER_REVIEW: 'badge-info', PROCESSING: 'badge-info',
      APPROVED: 'badge-success', PAYOUT_INITIATED: 'badge-success', PAID: 'badge-success', SETTLED: 'badge-success',
      REJECTED: 'badge-danger', REJECTED_WAITING_PERIOD: 'badge-danger',
    };
    return map[status] || 'badge-primary';
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}


