import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { PolicyDTO, PolicyTrancheProgressDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.css'})
export class DocumentsComponent implements OnInit {
  activeTab = signal<'POLICIES' | 'TRANSACTIONS'>('POLICIES');
  rawBackendPolicies = signal<PolicyDTO[]>([]);
  policies = computed(() => {
    const backend = this.rawBackendPolicies();
    
    // Get approved applications for this user
    const uid = (this.authService.userId() || '').toLowerCase().trim();
    const email = (this.authService.email() || '').toLowerCase().trim();
    const approved = this.underwritingQueue.applications().filter(a => {
      const aUid = (a.userId || '').toLowerCase().trim();
      const aEmail = (a.userEmail || '').toLowerCase().trim();
      const match = (uid && aUid === uid) || (email && aEmail === email);
      return match && a.status === 'APPROVED';
    });

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
        userId: a.userId,
        portfolioId: a.portfolioId,
        status: 'COVERAGE_ACTIVE',
        policyStatus: 'COVERAGE_ACTIVE',
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
  transactions = signal<any[]>([]);
  selectedPolicyDoc = signal<PolicyDTO | null>(null);
  selectedTransaction = signal<any | null>(null);

  selectedTrancheCert = signal<{
    policy: PolicyDTO;
    tranche: PolicyTrancheProgressDTO;
    priorTranche: PolicyTrancheProgressDTO | null;
  } | null>(null);

  constructor(private api: ApiService, public authService: AuthService, private underwritingQueue: UnderwritingQueueService) {}

  ngOnInit(): void {
    const userId = this.authService.userId();
    if (userId) {
      this.api.getPoliciesByUser(userId).subscribe({
        next: (res) => this.rawBackendPolicies.set(res || [])
      });
      this.api.getUserTransactions(userId).subscribe({
        next: (res) => {
          const sorted = (res || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.transactions.set(sorted);
        }
      });
    }
  }

  getTranchesForPolicy(policy: PolicyDTO): PolicyTrancheProgressDTO[] {
    if (policy.tranches && policy.tranches.length > 0) {
      return [...policy.tranches].sort((a, b) => (a.trancheNumber || 0) - (b.trancheNumber || 0));
    }
    return [{
      trancheId: 'tranche-orig-1',
      policyId: policy.policyId || policy.id,
      trancheNumber: 1,
      trancheType: 'ORIGINAL',
      effectiveDate: policy.policyStartDate || policy.createdAt,
      waitingPeriodYears: 5,
      eligibilityDate: policy.protectionStartDate || policy.policyEndDate,
      riskScore: policy.riskScore || 380,
      coveragePercentage: policy.coveragePercentage || 70,
      premiumPercentage: policy.premiumPercentage || 2.0,
      insuredValue: policy.totalInsuredValue || policy.insuredValue || 0,
      trancheStatus: 'ACTIVE'
    }];
  }

  getActiveTrancheBackThen(tranches: PolicyTrancheProgressDTO[], tranche: PolicyTrancheProgressDTO): PolicyTrancheProgressDTO | null {
    if (!tranches || tranches.length === 0 || (tranche.trancheNumber || 0) <= 1) {
      return null;
    }
    const preceding = tranches
      .filter(t => (t.trancheNumber || 0) < (tranche.trancheNumber || 0))
      .sort((a, b) => (b.trancheNumber || 0) - (a.trancheNumber || 0));
    
    const priorActive = preceding.find(t => t.trancheStatus !== 'REJECTED' && t.trancheStatus !== 'PENDING_ACCEPTANCE') || preceding[0];
    return priorActive || null;
  }

  openTrancheCertificate(policy: PolicyDTO, tranche: PolicyTrancheProgressDTO): void {
    const tranches = this.getTranchesForPolicy(policy);
    const priorTranche = this.getActiveTrancheBackThen(tranches, tranche);
    this.selectedTrancheCert.set({ policy, tranche, priorTranche });
  }

  closeTrancheCert(): void {
    this.selectedTrancheCert.set(null);
  }

  printCertificate(): void {
    window.print();
  }

  getCertificateRef(policy: PolicyDTO, tranche: PolicyTrancheProgressDTO): string {
    const polNum = policy.policyNumber || policy.policyId || 'POL';
    const cleanPol = polNum.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
    return `CERT-${cleanPol}-TR${String(tranche.trancheNumber).padStart(2, '0')}`;
  }

  getDeltaValuation(tranche: PolicyTrancheProgressDTO, prior: PolicyTrancheProgressDTO | null): number {
    return (tranche.insuredValue || 0) - (prior ? (prior.insuredValue || 0) : 0);
  }

  getDeltaRisk(tranche: PolicyTrancheProgressDTO, prior: PolicyTrancheProgressDTO | null): number {
    return (tranche.riskScore || 380) - (prior ? (prior.riskScore || 380) : 0);
  }

  getTranchePremium(tranche?: PolicyTrancheProgressDTO | null): number {
    if (!tranche) return 0;
    return (tranche.insuredValue || 0) * (tranche.premiumPercentage || 2.0) / 100;
  }

  getDeltaPremium(tranche: PolicyTrancheProgressDTO, prior: PolicyTrancheProgressDTO | null): number {
    return this.getTranchePremium(tranche) - this.getTranchePremium(prior);
  }

  getTrancheCoverageCap(tranche?: PolicyTrancheProgressDTO | null): number {
    if (!tranche) return 0;
    return (tranche.insuredValue || 0) * (tranche.coveragePercentage || 70) / 100;
  }

  getTrancheStatusBadge(status?: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
      case 'SUPERSEDED': return 'bg-white text-surface-200 border border-surface-700 shadow-sm';
      case 'REJECTED': return 'bg-rose-100 text-rose-700 border border-rose-200';
      case 'PENDING_ACCEPTANCE': return 'bg-orange-100 text-orange-700 border border-orange-200';
      default: return 'bg-white text-surface-200 border border-surface-700';
    }
  }

  openPolicyModal(p: PolicyDTO): void {
    const tranches = this.getTranchesForPolicy(p);
    const latestTranche = tranches[tranches.length - 1];
    this.openTrancheCertificate(p, latestTranche);
  }

  openTransactionModal(tx: any): void {
    this.selectedTransaction.set(tx);
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value || 0);
  }
}




