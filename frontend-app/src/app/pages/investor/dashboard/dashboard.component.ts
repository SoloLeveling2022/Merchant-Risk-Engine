import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { PortfolioDTO, PolicyDTO, ClaimDTO, RISK_MATRIX } from '@frontend/shared-models';

@Component({
  selector: 'app-investor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class InvestorDashboardComponent implements OnInit {
  portfolios = signal<PortfolioDTO[]>([]);
  policies = signal<PolicyDTO[]>([]);
  claims = signal<ClaimDTO[]>([]);
  selectedPolicyForInspect = signal<PolicyDTO | null>(null);

  activePoliciesCount = signal(0);
  totalInsuredValue = signal(0);
  settledClaimsCount = signal(0);

  constructor(
    public authService: AuthService,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    const userId = this.authService.userId();
    if (!userId) return;

    this.api.getPortfoliosByUser(userId).subscribe({
      next: (portfolios) => this.portfolios.set(portfolios),
    });

    this.api.getPoliciesByUser(userId).subscribe({
      next: (policies) => {
        this.policies.set(policies);
        this.activePoliciesCount.set(
          policies.filter(p => ['ACTIVE', 'COVERAGE_ACTIVE', 'PROTECTION_ACTIVE', 'IN_WAITING_PERIOD', 'CLAIM_ELIGIBLE'].includes(p.status || p.policyStatus || '')).length
        );
        this.totalInsuredValue.set(
          policies.reduce((sum, p) => sum + (p.insuredValue || p.coverageAmount || 0), 0)
        );
      },
    });

    this.api.getClaimsByUser(userId).subscribe({
      next: (claims) => {
        this.claims.set(claims);
        this.settledClaimsCount.set(
          claims.filter(c => ['APPROVED', 'SETTLED', 'PAID', 'PAYOUT_INITIATED'].includes(c.status || c.claimStatus || '')).length
        );
      },
    });
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'badge-success', COVERAGE_ACTIVE: 'badge-success', PROTECTION_ACTIVE: 'badge-success',
      IN_WAITING_PERIOD: 'badge-warning', CLAIM_ELIGIBLE: 'badge-info',
      EXPIRED: 'badge-danger', CANCELLED: 'badge-danger'
    };
    return map[status] || 'badge-primary';
  }

  openPolicyInspect(policy: PolicyDTO): void {
    this.selectedPolicyForInspect.set(policy);
  }

  closePolicyInspect(): void {
    this.selectedPolicyForInspect.set(null);
  }

  getPolicyLockInYears(policy: PolicyDTO): number {
    const tenure = policy.tenureYears || 5;
    return policy.waitingPeriodYears || Math.ceil(tenure * 0.4);
  }

  isLockInCompleted(policy: PolicyDTO): boolean {
    if (policy.protectionStartDate || policy.waitingPeriodEndDate) {
      return new Date(policy.protectionStartDate || policy.waitingPeriodEndDate!) <= new Date();
    }
    const startStr = policy.startDate || policy.policyStartDate || policy.coverageStartDate || policy.createdAt;
    const startDate = startStr ? new Date(startStr) : new Date();
    const lockInYears = this.getPolicyLockInYears(policy);
    const unlockDate = new Date(startDate);
    unlockDate.setFullYear(unlockDate.getFullYear() + lockInYears);
    return unlockDate <= new Date();
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}

