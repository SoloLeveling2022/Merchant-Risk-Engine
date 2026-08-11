import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { PolicyDTO, UnderwritingApplicationDTO } from '@frontend/shared-models';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [CommonModule, RouterModule, PaymentModalComponent],
  templateUrl: './policies.component.html',
  styleUrl: './policies.component.css'
})
export class PoliciesComponent implements OnInit, OnDestroy {
  rawBackendPolicies = signal<PolicyDTO[]>([]);
  selectedPolicyForInspect = signal<PolicyDTO | null>(null);
  
  showPaymentModal = signal(false);
  paymentAmount = 0;
  selectedPolicyId = '';
  selectedAppId = '';
  activePaymentType: 'INITIAL_PREMIUM' | 'RENEWAL_PREMIUM' = 'RENEWAL_PREMIUM';
  overdueMocks = new Set<string>();

  private eventSub?: Subscription;
  private heartbeatTimer?: any;

  myPendingApplications = computed(() => {
    const uid = (this.authService.userId() || '').toLowerCase().trim();
    const email = (this.authService.email() || '').toLowerCase().trim();
    return this.underwritingQueue.applications().filter(a => {
      const aUid = (a.userId || '').toLowerCase().trim();
      const aEmail = (a.userEmail || '').toLowerCase().trim();
      const match = (uid && aUid === uid) || (email && aEmail === email);
      return match && a.status === 'PENDING_REVIEW';
    });
  });

  myApprovedApplications = computed(() => {
    const uid = (this.authService.userId() || '').toLowerCase().trim();
    const email = (this.authService.email() || '').toLowerCase().trim();
    return this.underwritingQueue.applications().filter(a => {
      const aUid = (a.userId || '').toLowerCase().trim();
      const aEmail = (a.userEmail || '').toLowerCase().trim();
      const match = (uid && aUid === uid) || (email && aEmail === email);
      return match && (a.status === 'APPROVED' || a.status === 'PENDING_REVIEW' || a.status === 'APPROVED_PENDING_PAYMENT');
    });
  });

  allPolicies = computed(() => {
    const backend = this.rawBackendPolicies();
    const approved = this.myApprovedApplications();

    const fromUnderwriting: PolicyDTO[] = approved.map(a => {
      const tenure = a.tenureYears || 5;
      const waitingYears = a.waitingPeriodYears || Math.ceil(tenure * 0.4);
      const startMs = a.reviewedAt ? new Date(a.reviewedAt).getTime() : Date.now();
      const endMs = startMs + tenure * 365.25 * 24 * 3600 * 1000;
      const protectMs = startMs + waitingYears * 365.25 * 24 * 3600 * 1000;

      return {
        id: a.policyId || a.policyNumber || a.applicationId,
        policyId: a.policyId || a.policyNumber || a.applicationId,
        policyNumber: a.policyNumber || `POL-UW-${a.applicationId}`,
        quoteId: a.quoteId,
        userId: a.userId,
        portfolioId: a.portfolioId,
        status: a.status === 'APPROVED' ? 'COVERAGE_ACTIVE' : a.status as any,
        policyStatus: a.status === 'APPROVED' ? 'COVERAGE_ACTIVE' : a.status as any,
        insuredValue: a.insuredValue,
        coverageAmount: a.coverageAmount,
        annualPremium: a.annualPremium,
        riskScore: a.riskScore,
        tenureYears: tenure,
        waitingPeriodYears: waitingYears,
        policyStartDate: new Date(startMs).toISOString().split('T')[0],
        policyEndDate: new Date(endMs).toISOString().split('T')[0],
        protectionStartDate: new Date(protectMs).toISOString().split('T')[0],
        waitingPeriodEndDate: new Date(protectMs).toISOString().split('T')[0],
        nextPremiumDueDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
        premiumStatus: 'PAID',
        createdAt: a.reviewedAt || a.createdAt
      };
    });

    const existingIds = new Set(backend.map(p => p.policyId || p.id));
    const uniqueFromUnderwriting = fromUnderwriting.filter(p => !existingIds.has(p.policyId) && !existingIds.has(p.id));

    return [...uniqueFromUnderwriting, ...backend];
  });

  constructor(
    private api: ApiService, 
    private authService: AuthService, 
    private notificationService: NotificationService,
    private underwritingQueue: UnderwritingQueueService
  ) {}

  ngOnInit(): void {
    this.loadPolicies();

    // Listen to real-time events across tabs/windows
    this.eventSub = this.underwritingQueue.events$.subscribe((event) => {
      if (event.type === 'APPLICATION_APPROVED') {
        this.loadPolicies();
        this.notificationService.addToast(
          'Policy Authorized & Bound',
          'Your high-risk policy has been approved by the underwriting desk! Coverage is now active.',
          'SUCCESS'
        );
      } else if (event.type === 'APPLICATION_REJECTED') {
        this.loadPolicies();
        this.notificationService.addToast(
          'Application Update',
          'Your policy application was declined by the underwriting desk.',
          'INFO'
        );
      } else {
        this.loadPolicies();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.eventSub) this.eventSub.unsubscribe();
  }

  loadPolicies(): void {
    const userId = this.authService.userId();
    if (userId) {
      this.api.getPoliciesByUser(userId).subscribe({ 
        next: (p) => {
          this.rawBackendPolicies.set(p || []);
          this.underwritingQueue.syncEndorsementsFromBackend(p || []);
          this.checkUpcomingPremiums(this.allPolicies());
        }
      });
    }
  }

  checkUpcomingPremiums(policies: PolicyDTO[]): void {
    const now = new Date().getTime();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    
    policies.forEach(policy => {
      const dueDate = this.getComputedDueDate(policy);
      if (dueDate) {
        const diff = dueDate.getTime() - now;
        const status = this.getPremiumStatus(policy);
        
        if (diff > 0 && diff <= thirtyDaysMs && status !== 'PAID') {
          this.notificationService.addToast(
            '<span class="material-symbols-outlined align-middle">warning</span> Upcoming Premium Due',
            `Warning: Premium of ₹${this.formatCurrency(policy.annualPremium || policy.premiumAmount)} for Policy #${policy.policyNumber || policy.policyId?.substring(0,8)} is due on ${dueDate.toLocaleDateString()}.`,
            'WARNING'
          );
        } else if (diff < 0 && status !== 'PAID') {
          const delayDays = Math.floor(Math.abs(diff) / (24 * 60 * 60 * 1000));
          if (delayDays >= 29 && delayDays < 30) {
            this.notificationService.addToast(
              '<span class="material-symbols-outlined align-middle">crisis_alert</span> CRITICAL: Policy Cancellation Warning',
              `Your premium for Policy #${policy.policyNumber || policy.policyId?.substring(0,8)} is 29 days overdue! It will be automatically CANCELLED and REJECTED tomorrow.`,
              'ERROR'
            );
          } else if (delayDays >= 3) {
            this.notificationService.addToast(
              '<span class="material-symbols-outlined align-middle">warning</span> Overdue Premium Penalty',
              `Premium for Policy #${policy.policyNumber || policy.policyId?.substring(0,8)} is overdue by ${delayDays} days. A 3% daily penalty is actively applying.`,
              'ERROR'
            );
          }
        }
      }
    });
  }

  getComputedDueDate(policy: PolicyDTO): Date {
    const startStr = policy.startDate || policy.policyStartDate || policy.coverageStartDate || policy.createdAt;
    if (!startStr) return new Date();
    
    const startDate = new Date(startStr);
    
    // We add years based on the number of active tranches / vesting progress.
    // Assuming 1 active tranche = 1 year paid, the next due is start + 1.
    // If they have 2 active tranches, next due is start + 2, etc.
    const activeTranches = (policy.tranches || []).filter(t => t.trancheStatus === 'ACTIVE' || t.trancheStatus === 'SUPERSEDED').length;
    const yearsPaid = Math.max(1, activeTranches); 
    
    const nextDue = new Date(startDate);
    nextDue.setFullYear(nextDue.getFullYear() + yearsPaid);
    return nextDue;
  }

  getComputedDeadline(policy: PolicyDTO): Date {
    const dueDate = this.getComputedDueDate(policy);
    const deadline = new Date(dueDate);
    deadline.setDate(deadline.getDate() + 5); // 5-day deadline before rejection
    
    // Developer test mock
    if (this.overdueMocks.has(policy.id || policy.policyId || '')) {
      deadline.setFullYear(deadline.getFullYear() - 1); // Mock 1 year in the past
    }
    return deadline;
  }

  forceOverdue(policy: PolicyDTO): void {
    const id = policy.id || policy.policyId;
    if (id) {
      this.overdueMocks.add(id);
      this.checkUpcomingPremiums(this.allPolicies());
    }
  }

  getPremiumStatus(policy: PolicyDTO): string {
    const dueDate = this.getComputedDueDate(policy);
    const now = new Date();

    // Developer test mock
    if (this.overdueMocks.has(policy.id || policy.policyId || '')) {
      dueDate.setFullYear(dueDate.getFullYear() - 1); // Mock 1 year in the past
    }
    
    if (now > dueDate) {
      const delayDays = Math.floor((now.getTime() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
      if (delayDays > 5) {
        return 'CANCELLED';
      }
      return 'DUE';
    }
    
    return 'PAID';
  }

  initiatePremiumPayment(policy: PolicyDTO): void {
    this.selectedPolicyId = policy.policyId || policy.id || '';
    this.activePaymentType = 'RENEWAL_PREMIUM';
    this.paymentAmount = policy.annualPremium || policy.premiumAmount || 0;
    this.showPaymentModal.set(true);
  }

  initiateAppPaymentByPolicy(policy: PolicyDTO): void {
    // policy.id in this case is actually the applicationId
    this.selectedAppId = policy.id || ''; 
    // We pass quoteId to the payment gateway so it can record it properly
    this.selectedPolicyId = policy.quoteId || ''; 
    this.activePaymentType = 'INITIAL_PREMIUM';
    if (!this.selectedPolicyId) return;
    this.paymentAmount = policy.annualPremium || policy.premiumAmount || 0;
    this.showPaymentModal.set(true);
  }

  onPaymentSuccess(event: any): void {
    this.showPaymentModal.set(false);
    
    if (this.activePaymentType === 'INITIAL_PREMIUM' || (event.mock && event.targetId?.startsWith('APP-UW-'))) {
      const appIdToPay = this.selectedAppId || event.targetId;
      this.underwritingQueue.payApplication(appIdToPay).subscribe({
        next: () => {
          this.loadPolicies();
          this.notificationService.addToast('Payment Successful', 'Initial premium processed. Policy bound.', 'SUCCESS');
        }
      });
      return;
    }

    this.notificationService.addToast('<span class="material-symbols-outlined align-middle">credit_card</span> Premium Paid', 'Your annual premium has been successfully processed.', 'SUCCESS');
    if (this.selectedPolicyId) {
      this.overdueMocks.delete(this.selectedPolicyId);
    }
    this.ngOnInit(); // Reload policies to update status and due date
  }

  onPaymentCancel(): void {
    this.showPaymentModal.set(false);
  }

  isEligible(policy: PolicyDTO): boolean {
    const endStr = policy.protectionStartDate || policy.waitingPeriodEndDate || policy.eligibilityDate;
    if (!endStr) return false;
    return new Date(endStr) <= new Date();
  }

  getWaitingProgress(policy: PolicyDTO): number {
    const startStr = policy.startDate || policy.policyStartDate || policy.coverageStartDate;
    const endStr = policy.protectionStartDate || policy.waitingPeriodEndDate || policy.eligibilityDate;
    if (!startStr || !endStr) return 20;

    const start = new Date(startStr).getTime();
    const end = new Date(endStr).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  getTimeRemaining(policy: PolicyDTO): string {
    const endStr = policy.protectionStartDate || policy.waitingPeriodEndDate || policy.eligibilityDate;
    if (!endStr) return '5 Years Remaining';

    const end = new Date(endStr);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Matured';

    const years = Math.floor(diff / (365.25 * 24 * 3600000));
    const months = Math.floor((diff % (365.25 * 24 * 3600000)) / (30 * 24 * 3600000));
    return `${years}y ${months}m remaining`;
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

  getPolicyTenureYears(policy: PolicyDTO): number {
    if (policy.tenureYears) return policy.tenureYears;
    const startStr = policy.startDate || policy.policyStartDate || policy.coverageStartDate || policy.createdAt;
    const endStr = policy.policyEndDate;
    if (startStr && endStr) {
      const diffYears = Math.round((new Date(endStr).getTime() - new Date(startStr).getTime()) / (365.25 * 24 * 3600 * 1000));
      if (diffYears > 0) return diffYears;
    }
    return 5;
  }

  getPolicyLockInYears(policy: PolicyDTO): number {
    if (policy.waitingPeriodYears) return policy.waitingPeriodYears;
    return Math.ceil(this.getPolicyTenureYears(policy) * 0.4);
  }

  getVestedCoveragePercentage(policy: PolicyDTO): number {
    if (this.getPremiumStatus(policy) === 'CANCELLED') return 0;
    return this.isEligible(policy) ? 100 : 0;
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}


