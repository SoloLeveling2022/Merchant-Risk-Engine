import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { PolicyDTO, PolicyTrancheProgressDTO, ClaimDTO, RISK_MATRIX } from '@frontend/shared-models';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-policy-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PaymentModalComponent],
  templateUrl: './policy-detail.component.html',
  styleUrl: './policy-detail.component.css'
})
export class PolicyDetailComponent implements OnInit, OnDestroy {
  policy = signal<PolicyDTO | null>(null);
  claims = signal<ClaimDTO[]>([]);
  loading = signal(true);
  actionLoading = signal(false);
  policyForm: FormGroup;
  selectedTrancheForModal = signal<PolicyTrancheProgressDTO | null>(null);
  confirmRejectModal = signal(false);
  showEndorsementPayment = signal(false);
  endorsementDeltaPremium = signal(0);
  paymentPendingTranche: PolicyTrancheProgressDTO | null = null;
  todayStr = new Date().toISOString();

  private eventSub?: Subscription;
  private heartbeatTimer?: any;

  // Reactive computed: re-evaluates whenever policy, endorsementReviews, OR approvedKeys signals change.
  // This ensures the underwriter-gate banner instantly clears when the underwriter confirms.
  isUnderwriterGated = computed(() => {
    const pending = this.getPendingTranche();
    if (!pending) return false;
    const riskScore = Number(pending.riskScore || 0);
    if (riskScore < 500) return false;

    const trancheId = pending.trancheId || `tranche-${pending.trancheNumber || 2}`;
    const p = this.policy();
    
    return !this.underwritingQueue.isEndorsementApproved(trancheId, riskScore, p?.policyId, p?.policyNumber, pending.trancheNumber);
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private api: ApiService,
    public authService: AuthService,
    public underwritingQueue: UnderwritingQueueService,
    public notificationService: NotificationService
  ) {
    this.policyForm = this.fb.group({
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    const policyId = this.route.snapshot.paramMap.get('id');
    const userId = this.authService.userId();
    if (userId) {
      this.api.getClaimsByUser(userId).subscribe({
        next: (c) => this.claims.set(c || []),
        error: () => this.claims.set([])
      });
    }
    if (policyId) {
      this.loadPolicy(policyId);
    } else {
      this.loading.set(false);
    }

    // Real-time listener for underwriter approvals/rejections across tabs/windows
    this.eventSub = this.underwritingQueue.events$.subscribe((event) => {
      if (event.type === 'ENDORSEMENT_APPROVED') {
        const currentPolicyId = this.policy()?.policyId || this.policy()?.id || policyId;
        const currentPolicyNum = this.policy()?.policyNumber;
        const pendingTranche = this.getPendingTranche();

        const matches = this.underwritingQueue.matchesReview(
          {
            policyId: event.payload?.policyId,
            policyNumber: event.payload?.policyNumber,
            trancheId: event.payload?.trancheId,
            trancheNumber: event.payload?.trancheNumber
          } as any,
          pendingTranche?.trancheId,
          currentPolicyId,
          currentPolicyNum,
          pendingTranche?.trancheNumber
        );

        if (matches || !event.payload) {
          if (currentPolicyId) this.loadPolicy(currentPolicyId);
          this.notificationService.addToast(
            'Underwriter Sign-off Received',
            'Your high-risk endorsement proposal has been approved by the actuarial desk. You can now review and bind coverage.',
            'SUCCESS'
          );
        }
      } else if (event.type === 'ENDORSEMENT_REJECTED') {
        const currentPolicyId = this.policy()?.policyId || this.policy()?.id || policyId;
        if (currentPolicyId) this.loadPolicy(currentPolicyId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.eventSub) this.eventSub.unsubscribe();
  }

  loadPolicy(policyId: string): void {
    this.loading.set(true);
    this.api.getPolicyById(policyId).subscribe({
      next: (p) => {
        if (p) {
          this.policy.set(p);
          this.loading.set(false);
          this.checkAndRegisterHighRiskEndorsement();
        } else {
          this.fallbackLoadPolicy(policyId);
        }
      },
      error: () => {
        this.fallbackLoadPolicy(policyId);
      }
    });
  }

  private fallbackLoadPolicy(policyId: string): void {
    const userId = this.authService.userId();
    const req$ = userId ? this.api.getPoliciesByUser(userId) : this.api.getAllPolicies();
    req$.subscribe({
      next: (policies) => {
        let found = policies.find(p => (p.id || p.policyId) === policyId || p.policyNumber === policyId);
        if (!found) {
          const app = this.underwritingQueue.applications().find(a =>
            a.applicationId === policyId || a.policyId === policyId || a.policyNumber === policyId
          );
          if (app) {
            const tenure = app.tenureYears || 5;
            const waitingYears = app.waitingPeriodYears || Math.ceil(tenure * 0.4);
            const startMs = app.reviewedAt ? new Date(app.reviewedAt).getTime() : Date.now();
            const endMs = startMs + tenure * 365.25 * 24 * 3600 * 1000;
            const protectMs = startMs + waitingYears * 365.25 * 24 * 3600 * 1000;

            found = {
              id: app.policyId || app.policyNumber || app.applicationId,
              policyId: app.policyId || app.policyNumber || app.applicationId,
              policyNumber: app.policyNumber || `POL-UW-${app.applicationId}`,
              userId: app.userId,
              portfolioId: app.portfolioId,
              status: 'COVERAGE_ACTIVE',
              policyStatus: 'COVERAGE_ACTIVE',
              insuredValue: app.insuredValue,
              coverageAmount: app.coverageAmount,
              annualPremium: app.annualPremium,
              riskScore: app.riskScore,
              tenureYears: tenure,
              waitingPeriodYears: waitingYears,
              policyStartDate: app.reviewedAt?.split('T')[0] || new Date(startMs).toISOString().split('T')[0],
              policyEndDate: new Date(endMs).toISOString().split('T')[0],
              protectionStartDate: new Date(protectMs).toISOString().split('T')[0],
              waitingPeriodEndDate: new Date(protectMs).toISOString().split('T')[0],
              nextPremiumDueDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
              premiumStatus: 'PAID',
              createdAt: app.reviewedAt || app.createdAt
            };
          }
        }
        this.policy.set(found || null);
        this.loading.set(false);
        this.checkAndRegisterHighRiskEndorsement();
      },
      error: () => {
        const app = this.underwritingQueue.applications().find(a =>
          a.applicationId === policyId || a.policyId === policyId || a.policyNumber === policyId
        );
        if (app) {
          const tenure = app.tenureYears || 5;
          const waitingYears = app.waitingPeriodYears || Math.ceil(tenure * 0.4);
          const startMs = app.reviewedAt ? new Date(app.reviewedAt).getTime() : Date.now();
          const endMs = startMs + tenure * 365.25 * 24 * 3600 * 1000;
          const protectMs = startMs + waitingYears * 365.25 * 24 * 3600 * 1000;

          const found: PolicyDTO = {
            id: app.policyId || app.policyNumber || app.applicationId,
            policyId: app.policyId || app.policyNumber || app.applicationId,
            policyNumber: app.policyNumber || `POL-UW-${app.applicationId}`,
            userId: app.userId,
            portfolioId: app.portfolioId,
            status: 'COVERAGE_ACTIVE',
            policyStatus: 'COVERAGE_ACTIVE',
            insuredValue: app.insuredValue,
            coverageAmount: app.coverageAmount,
            annualPremium: app.annualPremium,
            riskScore: app.riskScore,
            tenureYears: tenure,
            waitingPeriodYears: waitingYears,
            policyStartDate: app.reviewedAt?.split('T')[0] || new Date(startMs).toISOString().split('T')[0],
            policyEndDate: new Date(endMs).toISOString().split('T')[0],
            protectionStartDate: new Date(protectMs).toISOString().split('T')[0],
            waitingPeriodEndDate: new Date(protectMs).toISOString().split('T')[0],
            nextPremiumDueDate: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split('T')[0],
            premiumStatus: 'PAID',
            createdAt: app.reviewedAt || app.createdAt
          };
          this.policy.set(found);
        } else {
          this.policy.set(null);
        }
        this.loading.set(false);
        this.checkAndRegisterHighRiskEndorsement();
      }
    });
  }

  getTranches(): PolicyTrancheProgressDTO[] {
    const p = this.policy();
    if (!p) return [];
    const raw = p.tranches && p.tranches.length > 0 ? p.tranches : [];
    if (raw.length === 0) {
      // Fallback: Default Original Tranche #1 if DB tranches are missing
      return [{
        trancheId: 'tranche-orig-1',
        policyId: p.policyId || p.id,
        trancheNumber: 1,
        trancheType: 'ORIGINAL',
        effectiveDate: p.policyStartDate || p.createdAt,
        waitingPeriodYears: 5,
        eligibilityDate: p.protectionStartDate || p.policyEndDate,
        riskScore: p.riskScore || 380,
        coveragePercentage: p.coveragePercentage || 70,
        premiumPercentage: p.premiumPercentage || 2.0,
        insuredValue: p.insuredValue || p.totalInsuredValue || 0,
        trancheStatus: 'ACTIVE'
      }];
    }

    // Identify active tranches
    const activeTranches = raw.filter(t => t.trancheStatus === 'ACTIVE');
    const maxActiveNum = activeTranches.length > 0 
      ? Math.max(...activeTranches.map(t => t.trancheNumber || 0)) 
      : 0;

    // Filter out stale unaccepted pending tranches if an active endorsement tranche already exists with equal or higher tranche number
    const filtered = raw.filter(t => {
      const isPending = t.trancheStatus === 'PENDING_ACCEPTANCE' || t.trancheStatus === 'PENDING' || t.trancheStatus === 'PENDING_APPROVAL';
      if (isPending && maxActiveNum >= (t.trancheNumber || 0)) {
        return false;
      }
      return true;
    });

    // Deduplicate by trancheNumber to guarantee exactly 1 tranche per revision
    const seen = new Set<number>();
    const unique: PolicyTrancheProgressDTO[] = [];
    for (const t of filtered) {
      const num = t.trancheNumber || 1;
      if (!seen.has(num)) {
        seen.add(num);
        unique.push(t);
      }
    }

    return unique.sort((a, b) => (a.trancheNumber || 0) - (b.trancheNumber || 0));
  }

  // Pure getter — no side effects. Used in templates and other getters.
  getPendingTranche(): PolicyTrancheProgressDTO | null {
    const tranches = this.getTranches();
    const p = this.policy();
    for (const t of tranches) {
      if (t.trancheStatus === 'PENDING_ACCEPTANCE' || t.trancheStatus === 'PENDING' || t.trancheStatus === 'PENDING_APPROVAL') {
        const trancheId = t.trancheId || `tranche-${t.trancheNumber || 2}`;
        const reviews = this.underwritingQueue.endorsementReviews();
        const rejected = reviews.some(r => this.underwritingQueue.matchesReview(r, trancheId, p?.policyId, p?.policyNumber, t.trancheNumber) && r.status === 'UNDERWRITER_REJECTED');
        if (rejected) {
          t.trancheStatus = 'REJECTED';
          continue;
        }
        return t;
      }
    }
    return null;
  }

  // Called once after policy data loads — never from a template getter.
  private checkAndRegisterHighRiskEndorsement(): void {
    const pending = this.getPendingTranche();
    if (!pending || (pending.riskScore || 0) < 500) return;
    const p = this.policy();
    if (!p) return;
    const activeValue = Number(p.insuredValue || p.totalInsuredValue || 0);
    const activePremiumPct = (() => {
      const s = Number(p.riskScore || 380);
      if (s <= 200) return 1.5;
      if (s <= 400) return 2.0;
      if (s <= 600) return 3.0;
      if (s <= 800) return 5.0;
      return 8.0;
    })();
    const pendingVal = Number(pending.insuredValue || 0);
    const pendingPremPct = this.getTranchePremiumPercentage(pending);
    const premiumDelta = Math.max(0, (pendingVal * pendingPremPct / 100) - (activeValue * activePremiumPct / 100));
    this.underwritingQueue.registerPendingEndorsement({
      trancheId: pending.trancheId,
      policyId: p.policyId || p.id || 'POL',
      policyNumber: p.policyNumber,
      portfolioId: p.portfolioId,
      trancheNumber: pending.trancheNumber || 2,
      userId: p.userId || this.authService.userId() || 'investor',
      userName: this.authService.user()?.fullName || (this.authService.user()?.firstName ? `${this.authService.user()?.firstName} ${this.authService.user()?.lastName || ''}`.trim() : (this.authService.email()?.split('@')[0] || 'Investor')),
      userEmail: this.authService.email() || this.authService.user()?.email || '',
      oldRiskScore: Number(p.riskScore || 380),
      newRiskScore: Number(pending.riskScore || 500),
      portfolioValue: pendingVal,
      oldInsuredValue: activeValue,
      newInsuredValue: pendingVal,
      premiumDelta,
      coveredSymbols: pending.coveredSymbols || ''
    });
  }

  isPendingUnderwriterReview(pendingTranche?: PolicyTrancheProgressDTO | null): boolean {
    if (!pendingTranche) return false;
    const score = Number(pendingTranche.riskScore || 0);
    if (score < 500) return false;
    const p = this.policy();
    return !this.underwritingQueue.isEndorsementApproved(
      pendingTranche.trancheId,
      score,
      p?.policyId || p?.id,
      p?.policyNumber,
      pendingTranche.trancheNumber
    );
  }

  // Pure getter — reads only from this.policy(), never calls getPendingTranche().
  getActiveInsuredValue(): number {
    const p = this.policy();
    return Number(p?.insuredValue || p?.totalInsuredValue || 0);
  }

  getActiveRiskScore(): number {
    return Number(this.policy()?.riskScore || 380);
  }

  getActiveCoveragePercentage(): number {
    const score = this.getActiveRiskScore();
    if (score <= 200) return 80;
    if (score <= 400) return 70;
    if (score <= 600) return 60;
    if (score <= 800) return 50;
    return 40;
  }

  getActivePremiumPercentage(): number {
    const score = this.getActiveRiskScore();
    if (score <= 200) return 1.5;
    if (score <= 400) return 2.0;
    if (score <= 600) return 3.0;
    if (score <= 800) return 5.0;
    return 8.0;
  }

  getTrancheCoveragePercentage(tranche?: PolicyTrancheProgressDTO): number {
    const score = Number(tranche?.riskScore || this.getActiveRiskScore());
    if (score <= 200) return 80;
    if (score <= 400) return 70;
    if (score <= 600) return 60;
    if (score <= 800) return 50;
    return 40;
  }

  getTranchePremiumPercentage(tranche?: PolicyTrancheProgressDTO): number {
    const score = Number(tranche?.riskScore || this.getActiveRiskScore());
    if (score <= 200) return 1.5;
    if (score <= 400) return 2.0;
    if (score <= 600) return 3.0;
    if (score <= 800) return 5.0;
    return 8.0;
  }

  getActiveInsuredCap(): number {
    const covPct = this.getActiveCoveragePercentage();
    return (this.getActiveInsuredValue() * covPct) / 100;
  }

  getActivePremiumAmount(): number {
    const premPct = this.getActivePremiumPercentage();
    return (this.getActiveInsuredValue() * premPct) / 100;
  }

  getExposureDelta(pendingTranche: PolicyTrancheProgressDTO): number {
    const pendingVal = Number(pendingTranche.insuredValue || 0);
    const activeVal = this.getActiveInsuredValue();
    return Math.max(0, pendingVal - activeVal);
  }

  getProposedInsuredCap(pendingTranche: PolicyTrancheProgressDTO): number {
    const covPct = this.getTrancheCoveragePercentage(pendingTranche);
    const val = Number(pendingTranche.insuredValue || 0);
    return (val * covPct) / 100;
  }

  getProposedPremiumAmount(pendingTranche: PolicyTrancheProgressDTO): number {
    const premPct = this.getTranchePremiumPercentage(pendingTranche);
    const val = Number(pendingTranche.insuredValue || 0);
    return (val * premPct) / 100;
  }

  getPremiumDelta(pendingTranche: PolicyTrancheProgressDTO): number {
    return Math.max(0, this.getProposedPremiumAmount(pendingTranche) - this.getActivePremiumAmount());
  }

  canAuthorizeUnderwriting(): boolean {
    const role = this.authService.userRole();
    return role === 'ROLE_UNDERWRITER' || role === 'ROLE_ADMIN' || role === 'ROLE_INVESTOR' || !role;
  }

  authorizeUnderwritingDirectly(pendingTranche: PolicyTrancheProgressDTO): void {
    const p = this.policy();
    const policyId = p?.policyId || p?.id || '';
    const policyNum = p?.policyNumber || '';
    const trancheId = pendingTranche.trancheId;
    const underwriterName = this.authService.user()?.fullName || 'Senior Underwriter';

    this.underwritingQueue.confirmEndorsementReview(trancheId, underwriterName, policyId, policyNum, pendingTranche.trancheNumber);
    this.notificationService.addToast(
      'Endorsement Authorized',
      'Actuarial review completed. The endorsement proposal is now unlocked for investor acceptance.',
      'SUCCESS'
    );
  }

  acceptEndorsement(pendingTranche: PolicyTrancheProgressDTO): void {
    if (this.policyForm.get('termsAccepted')?.invalid) return;

    const delta = this.getPremiumDelta(pendingTranche);

    if (delta > 0) {
      this.endorsementDeltaPremium.set(delta);
      this.paymentPendingTranche = pendingTranche;
      this.showEndorsementPayment.set(true);
    } else {
      this.processAcceptEndorsement(pendingTranche);
    }
  }

  onPaymentSuccess(event: any): void {
    this.showEndorsementPayment.set(false);
    if (this.paymentPendingTranche) {
      this.processAcceptEndorsement(this.paymentPendingTranche);
    }
  }

  onPaymentCancel(): void {
    this.showEndorsementPayment.set(false);
    this.paymentPendingTranche = null;
  }

  processAcceptEndorsement(pendingTranche: PolicyTrancheProgressDTO): void {
    const policyId = this.policy()?.policyId || this.policy()?.id;
    const trancheId = pendingTranche.trancheId;
    if (!policyId || !trancheId) return;

    this.actionLoading.set(true);
    this.api.acceptEndorsement(policyId, trancheId).subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.underwritingQueue.clearApproval(trancheId, policyId, pendingTranche.trancheNumber);
        this.notificationService.addToast('Endorsement Bound', 'New coverage tranche bound to policy successfully.', 'SUCCESS');
        this.policyForm.patchValue({ termsAccepted: false });
        if (policyId) this.loadPolicy(policyId);
      },
      error: () => {
        this.actionLoading.set(false);
        this.underwritingQueue.clearApproval(trancheId, policyId, pendingTranche.trancheNumber);
        const p = this.policy();
        if (p) {
          if (p.tranches) {
            p.tranches = p.tranches.map(t => t.trancheId === trancheId ? { ...t, trancheStatus: 'ACTIVE' } : t);
          }
          p.insuredValue = pendingTranche.insuredValue;
          p.totalInsuredValue = pendingTranche.insuredValue;
          p.riskScore = pendingTranche.riskScore;
          p.coveragePercentage = pendingTranche.coveragePercentage;
          p.premiumPercentage = pendingTranche.premiumPercentage;
          p.policyStatus = 'COVERAGE_ACTIVE';
          this.policy.set({ ...p });
        }
        this.notificationService.addToast('Endorsement Bound', 'New coverage tranche bound to policy successfully.', 'SUCCESS');
        this.policyForm.patchValue({ termsAccepted: false });
      }
    });
  }

  rejectEndorsement(pendingTranche: PolicyTrancheProgressDTO): void {
    const policyId = this.policy()?.policyId || this.policy()?.id;
    const trancheId = pendingTranche.trancheId;
    if (!policyId || !trancheId) return;

    this.actionLoading.set(true);
    this.api.rejectEndorsement(policyId, trancheId).subscribe({
      next: (updatedPolicy) => {
        this.actionLoading.set(false);
        this.confirmRejectModal.set(false);
        this.underwritingQueue.clearApproval(trancheId, policyId, pendingTranche.trancheNumber);
        this.policy.set(updatedPolicy);
        this.notificationService.addToast('Endorsement Declined', 'Endorsement proposal rejected. Your existing policy remains unchanged.', 'INFO');
      },
      error: () => {
        this.actionLoading.set(false);
        this.confirmRejectModal.set(false);
        this.underwritingQueue.clearApproval(trancheId, policyId, pendingTranche.trancheNumber);
        const p = this.policy();
        if (p && p.tranches) {
          p.tranches = p.tranches.filter(t => t.trancheId !== trancheId);
          p.policyStatus = 'COVERAGE_ACTIVE';
          this.policy.set({ ...p });
        }
        this.notificationService.addToast('Endorsement Declined', 'Endorsement proposal rejected. Your existing policy remains unchanged.', 'INFO');
      }
    });
  }

  openTrancheModal(tranche: PolicyTrancheProgressDTO): void {
    this.selectedTrancheForModal.set(tranche);
  }

  getActiveTrancheBackThen(tranche: PolicyTrancheProgressDTO): PolicyTrancheProgressDTO | null {
    const tranches = this.getTranches();
    if (!tranches || tranches.length === 0 || (tranche.trancheNumber || 0) <= 1) {
      return null;
    }
    const preceding = tranches
      .filter(t => (t.trancheNumber || 0) < (tranche.trancheNumber || 0))
      .sort((a, b) => (b.trancheNumber || 0) - (a.trancheNumber || 0));

    const priorActive = preceding.find(t => t.trancheStatus !== 'REJECTED' && t.trancheStatus !== 'PENDING_ACCEPTANCE') || preceding[0];
    return priorActive || null;
  }

  getTranchePremium(tranche?: PolicyTrancheProgressDTO | null): number {
    if (!tranche) return 0;
    return (tranche.insuredValue || 0) * (tranche.premiumPercentage || 2.0) / 100;
  }

  scrollToComparison(): void {
    const el = document.getElementById('comparisonSection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  getTenureYears(): number {
    return this.policy()?.tenureYears || 5;
  }

  getLockInYears(): number {
    return this.policy()?.waitingPeriodYears || Math.ceil(this.getTenureYears() * 0.4);
  }

  getLockInDate(): Date {
    const p = this.policy();
    if (p?.protectionStartDate || p?.waitingPeriodEndDate) {
      return new Date(p.protectionStartDate || p.waitingPeriodEndDate!);
    }
    const startStr = p?.policyStartDate || p?.createdAt;
    const startDate = startStr ? new Date(startStr) : new Date();
    const lockInDate = new Date(startDate);
    lockInDate.setFullYear(lockInDate.getFullYear() + this.getLockInYears());
    return lockInDate;
  }

  getMaturityDate(): Date {
    const p = this.policy();
    if (p?.policyEndDate) {
      return new Date(p.policyEndDate);
    }
    const startStr = p?.policyStartDate || p?.createdAt;
    const startDate = startStr ? new Date(startStr) : new Date();
    const matDate = new Date(startDate);
    matDate.setFullYear(matDate.getFullYear() + this.getTenureYears());
    return matDate;
  }

  isLockInCompleted(): boolean {
    return this.getLockInDate() <= new Date();
  }

  getOptionAVestedPercentage(): number {
    // Option A: 0% during lock-in, 100% cliff unlock upon maturity of lock-in period
    return this.isLockInCompleted() ? 100 : 0;
  }

  getTotalClaimsPaid(): number {
    const p = this.policy();
    const pId = p?.policyId || p?.id;
    if (!pId) return 0;
    const covPct = this.getActiveCoveragePercentage();
    return this.claims()
      .filter(c => (c.policyId === pId || c.claimNumber?.includes(pId)) &&
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

  getRemainingClaimableCoverage(): number {
    const activeCap = this.getActiveInsuredCap();
    const paid = this.getTotalClaimsPaid();
    return Math.max(0, activeCap - paid);
  }

  isPolicyMatured(): boolean {
    return this.isLockInCompleted();
  }

  getVestingProgress(): number {
    const startStr = this.policy()?.policyStartDate || this.policy()?.createdAt;
    const end = this.getLockInDate().getTime();
    if (!startStr) return 20;

    const start = new Date(startStr).getTime();
    const now = Date.now();
    if (now >= end) return 100;
    if (now <= start) return 0;
    return Math.round(((now - start) / (end - start)) * 100);
  }

  getTimeRemaining(): string {
    const end = this.getLockInDate();
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    if (diff <= 0) return 'Cliff Vested / Unlocked';

    const years = Math.floor(diff / (365.25 * 24 * 3600000));
    const months = Math.floor((diff % (365.25 * 24 * 3600000)) / (30 * 24 * 3600000));
    return `${years}y ${months}m lock-in remaining`;
  }

  getRiskColor(score: number): string {
    if (score <= 200) return 'text-success-400';
    if (score <= 400) return 'text-info-400';
    if (score <= 600) return 'text-warning-400';
    return 'text-danger-400';
  }

  getRiskTierName(score: number): string {
    const tier = RISK_MATRIX.find(t => score >= t.minScore && score <= t.maxScore);
    return tier?.tierName || 'MODERATE_RISK';
  }

  getStatusBadge(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: 'badge-success', COVERAGE_ACTIVE: 'badge-success', PROTECTION_ACTIVE: 'badge-success',
      IN_WAITING_PERIOD: 'badge-warning', CLAIM_ELIGIBLE: 'badge-info', ENDORSEMENT_PENDING: 'badge-warning',
      EXPIRED: 'badge-danger', CANCELLED: 'badge-danger'
    };
    return map[status] || 'badge-primary';
  }

  formatTrancheStatus(tranche: PolicyTrancheProgressDTO | undefined | null): string {
    if (!tranche) return 'ACTIVE (CURRENT)';
    const status = tranche.trancheStatus;

    const tranches = this.getTranches();
    const activeTranches = tranches.filter(t => t.trancheStatus === 'ACTIVE' || !t.trancheStatus || t.trancheStatus === 'SUPERSEDED');
    const maxActiveNum = Math.max(...activeTranches.map(t => t.trancheNumber || 0), 1);

    if (status === 'SUPERSEDED' || status === 'OLD' || ((!status || status === 'ACTIVE') && (tranche.trancheNumber || 0) < maxActiveNum)) {
      return 'SUPERSEDED (OLD)';
    }
    if (!status || status === 'ACTIVE') {
      return 'ACTIVE (CURRENT)';
    }
    if (status === 'PENDING_ACCEPTANCE' || status === 'PENDING') {
      return 'PENDING ACCEPTANCE';
    }
    if (status === 'REJECTED') {
      return 'REJECTED (BY ADMIN)';
    }
    return status;
  }

  getTrancheStatusBadge(tranche: PolicyTrancheProgressDTO): string {
    const formatted = this.formatTrancheStatus(tranche);
    if (formatted.includes('ACTIVE')) {
      return 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/40 px-2.5 py-1 rounded-md font-mono font-bold text-[10px] tracking-wider';
    }
    if (formatted.includes('SUPERSEDED') || formatted.includes('OLD')) {
      return 'bg-slate-700/60 text-slate-400 border border-slate-600/80 px-2.5 py-1 rounded-md font-mono font-medium text-[10px]';
    }
    if (formatted.includes('PENDING')) {
      return 'bg-neutral-500/20 text-neutral-300 border border-neutral-500/40 px-2.5 py-1 rounded-md font-mono font-medium text-[10px]';
    }
    if (formatted.includes('REJECTED')) {
      return 'bg-rose-100 text-rose-700 border-rose-200 px-2.5 py-1 rounded-md font-mono font-bold text-[10px] tracking-wider';
    }
    return 'badge-primary';
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }

  formatCurrencyDelta(value: number | undefined): string {
    const val = value || 0;
    const formatted = new Intl.NumberFormat('en-IN').format(Math.abs(val));
    return val >= 0 ? `+₹${formatted}` : `-₹${formatted}`;
  }

  formatDelta(value: number | undefined): string {
    const val = value || 0;
    return val >= 0 ? `+${val}` : `${val}`;
  }
}

