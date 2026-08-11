import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { PortfolioDTO, QuoteDTO, PolicyDTO, RISK_MATRIX, RiskTierDTO, UnderwritingApplicationDTO } from '@frontend/shared-models';
import { PaymentModalComponent } from '../../../components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-quotes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, PaymentModalComponent],
  templateUrl: './quotes.component.html',
  styleUrl: './quotes.component.css'
})
export class QuotesComponent implements OnInit {
  portfolios = signal<PortfolioDTO[]>([]);
  quote = signal<QuoteDTO | null>(null);
  existingPolicyModal = signal<PolicyDTO | null>(null);
  showTermsModal = signal(false);
  quotesForm: FormGroup;
  loading = signal(false);
  purchasing = signal(false);
  purchaseSuccess = signal(false);
  submittedApplication = signal<UnderwritingApplicationDTO | null>(null);
  showPaymentModal = signal(false);
  riskMatrix = RISK_MATRIX;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private underwritingQueue: UnderwritingQueueService
  ) {
    this.quotesForm = this.fb.group({
      selectedPortfolioId: ['', Validators.required],
      selectedTenure: [5, Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    });
  }

  getTenureYears(): number {
    return Number(this.quotesForm?.get('selectedTenure')?.value || 5);
  }

  getWaitingPeriodYears(tenureYears?: number): number {
    const t = tenureYears ?? this.getTenureYears();
    return Math.ceil(t * 0.4);
  }

  ngOnInit(): void {
    const userId = this.authService.userId();
    if (userId) this.api.getPortfoliosByUser(userId).subscribe({ next: (p) => this.portfolios.set(p) });
  }

  isHighRiskQuote(): boolean {
    return (this.quote()?.riskScore ?? 0) > 600;
  }

  generateQuote(): void {
    const userId = this.authService.userId();
    const selectedPortfolioId = this.quotesForm.value.selectedPortfolioId;
    if (!userId || !selectedPortfolioId) return;
    this.loading.set(true);
    this.purchaseSuccess.set(false);
    this.submittedApplication.set(null);
    this.quotesForm.patchValue({ termsAccepted: false });

    // First check if an active policy already exists for this portfolio
    this.api.getPoliciesByUser(userId).subscribe({
      next: (policies) => {
        const existing = (policies || []).find(p => p.portfolioId === selectedPortfolioId);
        if (existing) {
          this.loading.set(false);
          this.existingPolicyModal.set(existing);
          return;
        }

        // Proceed to generate quote if no existing policy
        this.api.generateQuote({ userId, portfolioId: selectedPortfolioId, policyDurationYears: this.getTenureYears(), coverageType: 'COMPREHENSIVE' }).subscribe({
          next: (q) => {
            if (q) {
              q.tenureYears = this.getTenureYears();
              q.waitingPeriodYears = this.getWaitingPeriodYears();
            }
            this.quote.set(q);
            this.loading.set(false);
            this.notificationService.addToast('Quote Generated', 'Dynamic risk score, coverage limits, and legal binder terms calculated successfully.', 'INFO');
          },
          error: (err) => {
            this.loading.set(false);
            this.notificationService.addToast('Quote Error', err.error?.message || 'Failed to generate quote.', 'ERROR');
          },
        });
      },
      error: () => {
        // Fallback to generate quote
        this.api.generateQuote({ userId, portfolioId: selectedPortfolioId, policyDurationYears: this.getTenureYears(), coverageType: 'COMPREHENSIVE' }).subscribe({
          next: (q) => {
            if (q) {
              q.tenureYears = this.getTenureYears();
              q.waitingPeriodYears = this.getWaitingPeriodYears();
            }
            this.quote.set(q);
            this.loading.set(false);
          },
          error: () => this.loading.set(false),
        });
      }
    });
  }

  initiatePurchase(): void {
    if (this.quotesForm.get('termsAccepted')?.invalid) return;

    if (this.isHighRiskQuote()) {
      this.submitForUnderwriterApproval();
      return;
    }

    this.showPaymentModal.set(true);
  }

  submitForUnderwriterApproval(): void {
    const q = this.quote();
    const userId = this.authService.userId() || 'anonymous-investor';
    if (!q) return;

    const user = this.authService.user();
    const userName = user?.fullName || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (this.authService.email()?.split('@')[0] || 'Investor'));
    
    // Fix: Backend QuoteResponse might omit portfolioId, so use the form's selected value
    const formPortfolioId = this.quotesForm.value.selectedPortfolioId;
    const finalPortfolioId = q.portfolioId || formPortfolioId;
    
    const selectedPortfolio = this.portfolios().find(p => (p.id || p.portfolioId) === finalPortfolioId);

    const app = this.underwritingQueue.submitApplication({
      quoteId: q.id || q.quoteId,
      portfolioId: finalPortfolioId,
      portfolioName: selectedPortfolio?.portfolioName || 'Investor Equity Portfolio',
      userId: userId,
      userName: userName,
      userEmail: this.authService.email() || '',
      riskScore: q.riskScore || 650,
      riskTier: this.getRiskTier(q.riskScore),
      portfolioValue: q.portfolioValue || selectedPortfolio?.totalInvestmentValue || selectedPortfolio?.totalValue || 500000,
      insuredValue: this.getInsuredSumCap(q),
      coverageAmount: this.getInsuredSumCap(q),
      coveragePercentage: q.coverageCapPercentage ?? q.coveragePercentage ?? 50,
      annualPremium: this.getAnnualPremium(q),
      premiumPercentage: q.premiumPercentage ?? 5.0,
      deductible: q.deductiblePercentage ?? q.deductible ?? 500,
      tenureYears: this.getTenureYears(),
      waitingPeriodYears: this.getWaitingPeriodYears()
    });

    this.submittedApplication.set(app);
    this.quote.set(null);
    this.quotesForm.patchValue({ termsAccepted: false });
    this.notificationService.addToast(
      'Routed to Underwriting Desk',
      `High-Risk Policy (${app.riskScore}/1000 - ${app.riskTier}) submitted for underwriter sign-off (Ref: ${app.applicationId}).`,
      'INFO'
    );
  }

  onPaymentSuccess(event: any): void {
    this.showPaymentModal.set(false);
    this.purchasePolicy();
  }

  onPaymentCancel(): void {
    this.showPaymentModal.set(false);
  }

  purchasePolicy(): void {
    if (this.quotesForm.get('termsAccepted')?.invalid) return;
    const q = this.quote();
    const userId = this.authService.userId();
    const qId = q?.id || q?.quoteId;
    if (!q || !userId || !qId) return;
    this.purchasing.set(true);
    const tenureYears = this.getTenureYears();
    this.api.purchasePolicy(qId, userId, tenureYears).subscribe({
      next: () => {
        this.purchasing.set(false);
        this.purchaseSuccess.set(true);
        this.quote.set(null);
        this.quotesForm.patchValue({ termsAccepted: false });
        this.notificationService.addToast('Policy Bound & Active', `Insurance policy purchased successfully! ${this.getTenureYears()}-Year tenure period active with Option A cliff vesting.`, 'SUCCESS');
      },
      error: () => this.purchasing.set(false),
    });
  }

  isActiveTier(tier: RiskTierDTO, score: number): boolean {
    return score >= tier.minScore && score <= tier.maxScore;
  }

  getRiskTier(score: number | undefined): string {
    if (score === undefined || score === null) return 'UNKNOWN';
    const tier = RISK_MATRIX.find((t: RiskTierDTO) => score >= t.minScore && score <= t.maxScore);
    return tier ? tier.tierName : 'MODERATE_RISK';
  }

  getRiskColor(score: number): string {
    if (score <= 200) return 'text-success-400';
    if (score <= 400) return 'text-info-400';
    if (score <= 600) return 'text-warning-400';
    return 'text-danger-400';
  }

  getInsuredSumCap(q: QuoteDTO | null): number {
    if (!q) return 0;
    if (q.insuredValue && q.insuredValue > 0) return q.insuredValue;
    if (q.coverageAmount && q.coverageAmount > 0) return q.coverageAmount;
    if (q.coverageLimit && q.coverageLimit > 0) return q.coverageLimit;
    const val = q.portfolioValue || 0;
    const pct = q.coverageCapPercentage ?? q.coveragePercentage ?? 70;
    return val * (pct / 100);
  }

  getAnnualPremium(q: QuoteDTO | null): number {
    if (!q) return 0;
    if (q.annualPremium && q.annualPremium > 0) return q.annualPremium;
    if (q.premiumAmount && q.premiumAmount > 0) return q.premiumAmount;
    const val = q.portfolioValue || 0;
    const pct = q.premiumPercentage ?? 2.0;
    return val * (pct / 100);
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}



