import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService, UnderwritingQueueService, EndorsementHoldingDiffItem } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { PolicyDTO, PortfolioDTO, UserDTO, UnderwritingApplicationDTO, PortfolioHoldingDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-underwriter-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './underwriter-dashboard.component.html',
  styleUrl: './underwriter-dashboard.component.css'
})
export class UnderwriterDashboardComponent implements OnInit, OnDestroy {
  activeTab = signal<'high-risk' | 'endorsements' | 'directory'>('high-risk');
  searchTerm = signal<string>('');
  loading = signal(false);

  policies = signal<PolicyDTO[]>([]);
  // Derived reactively from localStorage queue — always up to date, no manual refresh needed
  pendingEndorsements = computed(() =>
    this.underwritingQueue.endorsementReviews().filter((e: any) => e.status === 'PENDING_UNDERWRITER_REVIEW')
  );
  avgRiskScore = signal(0);
  totalPremium = signal(0);
  usersMap = signal<Record<string, UserDTO>>({});
  
  selectedEndorsement = signal<any | null>(null);
  diffPreviousHoldings = signal<EndorsementHoldingDiffItem[]>([]);
  diffProposedHoldings = signal<EndorsementHoldingDiffItem[]>([]);
  diffLoading = signal<boolean>(false);
  diffOldPremium = signal<number>(0);
  diffNewPremium = signal<number>(0);
  diffPremiumDelta = signal<number>(0);
  selectedApplication = signal<UnderwritingApplicationDTO | null>(null);
  underwriterNotes = signal<string>('');
  processing = signal(false);
  
  // High-Risk Underwriting Portfolio Details
  showPortfolioDetails = signal<boolean>(false);
  activePortfolioHoldings = signal<PortfolioHoldingDTO[]>([]);
  holdingsLoading = signal<boolean>(false);

  private underwritingQueue = inject(UnderwritingQueueService);
  applications = this.underwritingQueue.applications;

  private eventSub?: Subscription;
  private heartbeatTimer?: any;

  pendingApplications = computed(() => {
    return this.applications().filter(a => a.status === 'PENDING_REVIEW');
  });

  filteredApplications = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.pendingApplications();
    return this.pendingApplications().filter(a => 
      (a.applicationId && a.applicationId.toLowerCase().includes(term)) ||
      (a.userName && a.userName.toLowerCase().includes(term)) ||
      (a.userEmail && a.userEmail.toLowerCase().includes(term)) ||
      (a.portfolioId && a.portfolioId.toLowerCase().includes(term)) ||
      (a.portfolioName && a.portfolioName.toLowerCase().includes(term)) ||
      (a.riskTier && a.riskTier.toLowerCase().includes(term)) ||
      (a.status && a.status.toLowerCase().includes(term)) ||
      (a.riskScore && a.riskScore.toString().includes(term))
    );
  });

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.refresh();

    // Listen to real-time events across tabs/windows via BroadcastChannel & Subject
    this.eventSub = this.underwritingQueue.events$.subscribe(() => {
      this.refresh(false);
    });
  }

  ngOnDestroy(): void {
    if (this.eventSub) this.eventSub.unsubscribe();
  }

  getUnderwriterName(): string {
    const u = this.authService.user();
    if (u?.fullName) return u.fullName;
    if (u?.firstName) return `${u.firstName} ${u.lastName || ''}`.trim();
    return 'Senior Underwriter';
  }

  getUser(userId?: string): UserDTO | undefined {
    if (!userId) return undefined;
    return this.usersMap()[userId] || (userId.includes('@') ? this.usersMap()[userId.toLowerCase()] : undefined);
  }

  getUserFullName(userId?: string): string {
    if (!userId) return 'Investor';
    const user = this.getUser(userId);
    if (user) {
      if (user.fullName) return user.fullName;
      if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (user.email) return user.email.split('@')[0];
    }
    return 'Investor';
  }

  getUserEmail(userId?: string): string {
    if (!userId) return '';
    const user = this.getUser(userId);
    return user?.email || (userId.includes('@') ? userId : '');
  }

  getUserInitial(userId?: string): string {
    const name = this.getUserFullName(userId);
    if (name && name !== 'Investor') {
      return name.charAt(0).toUpperCase();
    }
    const email = this.getUserEmail(userId);
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'I';
  }

  refresh(showSpinner: boolean = true): void {
    if (showSpinner) {
      this.loading.set(true);
    }

    this.api.getAllUsers().subscribe({
      next: (users) => {
        const map: Record<string, UserDTO> = {};
        for (const u of (users || [])) {
          if (u.id) map[u.id] = u;
          if (u.userId) map[u.userId] = u;
          if (u.email) map[u.email.toLowerCase()] = u;
        }
        this.usersMap.set(map);
      },
      error: () => {}
    });

    this.api.getAllPolicies().subscribe({
      next: (p) => {
        const sorted = (p || []).sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tB - tA;
        });
        this.policies.set(sorted);
        const avg = sorted.length > 0 ? Math.round(sorted.reduce((s, x) => s + (x.riskScore || 380), 0) / sorted.length) : 0;
        this.avgRiskScore.set(avg);
        this.totalPremium.set(sorted.reduce((s, x) => s + (x.annualPremium || 0), 0));

        // Sync with backend pending-endorsements endpoint
        this.api.getPendingEndorsements().subscribe({
          next: (pendingList) => {
            const combined = [...sorted, ...(pendingList || [])];
            this.underwritingQueue.syncEndorsementsFromBackend(combined);
            if (showSpinner) this.loading.set(false);
          },
          error: () => {
            this.underwritingQueue.syncEndorsementsFromBackend(sorted);
            if (showSpinner) this.loading.set(false);
          }
        });
      },
      error: () => {
        if (showSpinner) this.loading.set(false);
      }
    });

    // pendingEndorsements is a computed signal driven by endorsementReviews() — auto-updates reactive state
  }

  openUnderwriteModal(app: UnderwritingApplicationDTO): void {
    this.selectedApplication.set(app);
    this.underwriterNotes.set(app.reviewNotes || 'Approved under high-risk underwriting guidelines with standard actuarial volatility margin.');
    this.showPortfolioDetails.set(false);
    this.activePortfolioHoldings.set([]);
  }

  closeUnderwriteModal(): void {
    this.selectedApplication.set(null);
    this.showPortfolioDetails.set(false);
  }

  togglePortfolioDetails(portfolioId?: string): void {
    if (this.showPortfolioDetails()) {
      this.showPortfolioDetails.set(false);
    } else {
      this.showPortfolioDetails.set(true);
      if (portfolioId && this.activePortfolioHoldings().length === 0) {
        this.holdingsLoading.set(true);
        this.api.getPortfolioHoldings(portfolioId).subscribe({
          next: (holdings) => {
            this.activePortfolioHoldings.set(holdings || []);
            this.holdingsLoading.set(false);
          },
          error: () => this.holdingsLoading.set(false)
        });
      }
    }
  }

  setNotePreset(preset: string): void {
    this.underwriterNotes.set(preset);
  }

  approveApp(app: UnderwritingApplicationDTO): void {
    this.processing.set(true);
    const underwriter = this.getUnderwriterName();

    this.underwritingQueue.approveApplication(app.applicationId, underwriter, this.underwriterNotes()).subscribe({
      next: (updatedApp) => {
        this.processing.set(false);
        this.closeUnderwriteModal();
        this.notificationService.addToast(
          'Policy Authorized & Bound',
          `Application ${app.applicationId} approved. Official policy #${updatedApp?.policyNumber || 'POL-UW'} issued.`,
          'SUCCESS'
        );
        this.refresh();
      },
      error: () => {
        this.processing.set(false);
        this.closeUnderwriteModal();
      }
    });
  }

  rejectApp(app: UnderwritingApplicationDTO): void {
    const reason = this.underwriterNotes() || 'Unhedged equity beta volatility exceeds maximum platform risk cap.';
    const underwriter = this.getUnderwriterName();
    this.underwritingQueue.rejectApplication(app.applicationId, underwriter, reason);
    this.closeUnderwriteModal();
    this.notificationService.addToast(
      'Policy Application Declined',
      `Application ${app.applicationId} has been declined for coverage.`,
      'INFO'
    );
  }

  getRiskBadgeClass(score: number): string {
    if (!score) return 'bg-surface-800 text-surface-200 border-surface-700';
    if (score <= 400) return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    if (score <= 600) return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
    if (score <= 800) return 'bg-accent-500/15 text-accent-700 border-accent-500/40';
    return 'bg-rose-500/15 text-rose-700 border-rose-500/40';
  }

  getRiskTextColor(score: number): string {
    if (!score) return 'text-surface-200';
    if (score <= 400) return 'text-emerald-700';
    if (score <= 600) return 'text-blue-700';
    if (score <= 800) return 'text-accent-700';
    return 'text-rose-700';
  }

  openDiffModal(endorsement: any): void {
    this.selectedEndorsement.set(endorsement);
    if (!endorsement) return;

    // 1. Locate related policy in directory or policies signal
    const policy = this.policies().find(p => 
      (p.policyId && p.policyId === endorsement.policyId) || 
      (p.id && p.id === endorsement.policyId)
    );
    const portfolioId = endorsement.portfolioId || policy?.portfolioId;

    // 2. Dynamic Premium Calculations
    const oldInsuredVal = Number(endorsement.oldInsuredValue || policy?.insuredValue || policy?.totalInsuredValue || endorsement.portfolioValue || 0);
    const newInsuredVal = Number(endorsement.newInsuredValue || endorsement.portfolioValue || oldInsuredVal);

    let oldPrem = Number(policy?.annualPremium || policy?.premiumAmount || 0);
    if (!oldPrem && oldInsuredVal > 0) {
      const baseRate = Number(policy?.premiumPercentage || 2.0);
      oldPrem = oldInsuredVal * (baseRate / 100);
    }

    let delta = Number(endorsement.premiumDelta || 0);
    let newPrem = oldPrem + delta;
    if (delta <= 0 && newInsuredVal > 0) {
      const pendingTranche = policy?.tranches?.find(t => 
        t.trancheStatus === 'PENDING_ACCEPTANCE' || t.trancheStatus === 'PENDING' || t.trancheStatus === 'PENDING_APPROVAL'
      );
      const pendingRate = Number(pendingTranche?.premiumPercentage || (endorsement.newRiskScore >= 800 ? 8.0 : endorsement.newRiskScore >= 600 ? 5.0 : 3.0));
      newPrem = newInsuredVal * (pendingRate / 100);
      delta = Math.max(0, newPrem - oldPrem);
    }

    this.diffOldPremium.set(Math.round(oldPrem));
    this.diffNewPremium.set(Math.round(newPrem));
    this.diffPremiumDelta.set(Math.round(delta));

    // 3. Dynamic Holdings Diff Resolution
    // Case A: Direct snapshot on endorsement object
    if (endorsement.proposedHoldings && endorsement.proposedHoldings.length > 0) {
      this.diffPreviousHoldings.set(endorsement.previousHoldings || []);
      this.diffProposedHoldings.set(endorsement.proposedHoldings);
      return;
    }

    // Case B: Snapshot cached in UnderwritingQueueService
    const snapshot = this.underwritingQueue.getHoldingsSnapshot(portfolioId, endorsement.policyId);
    if (snapshot && snapshot.proposedHoldings && snapshot.proposedHoldings.length > 0) {
      this.diffPreviousHoldings.set(snapshot.previousHoldings || []);
      this.diffProposedHoldings.set(snapshot.proposedHoldings);
      return;
    }

    // Case C: Live fetch directly from backend API for real holdings
    if (portfolioId) {
      this.diffLoading.set(true);
      this.api.getPortfolioHoldings(portfolioId).subscribe({
        next: (holdings: PortfolioHoldingDTO[]) => {
          this.diffLoading.set(false);
          if (holdings && holdings.length > 0) {
            this.buildHoldingsDiffFromLive(holdings, endorsement, policy);
          } else {
            this.diffPreviousHoldings.set([]);
            this.diffProposedHoldings.set([]);
          }
        },
        error: () => {
          this.diffLoading.set(false);
          this.diffPreviousHoldings.set([]);
          this.diffProposedHoldings.set([]);
        }
      });
    } else {
      this.diffPreviousHoldings.set([]);
      this.diffProposedHoldings.set([]);
    }
  }

  private buildHoldingsDiffFromLive(holdings: PortfolioHoldingDTO[], endorsement: any, policy?: PolicyDTO): void {
    const highRiskSymbols = new Set(['NVDA', 'TSLA', 'ADANIENT', 'ADANIPORTS', 'SUZLON', 'ZOMATO']);

    let baselineSymbols = new Set<string>();
    
    // Find the latest ACTIVE or SUPERSEDED tranche to compare against, rather than always ORIGINAL
    let compareTranche = policy?.tranches?.find(t => t.trancheStatus === 'ACTIVE');
    if (!compareTranche) {
       // If no active, find the highest superseded
       const superseded = policy?.tranches?.filter(t => t.trancheStatus === 'SUPERSEDED') || [];
       if (superseded.length > 0) {
          superseded.sort((a, b) => (b.trancheNumber || 0) - (a.trancheNumber || 0));
          compareTranche = superseded[0];
       }
    }
    if (!compareTranche) {
      compareTranche = policy?.tranches?.find(t => t.trancheNumber === 1 || t.trancheType === 'ORIGINAL');
    }

    if (compareTranche?.coveredSymbols) {
      try {
        const arr = JSON.parse(compareTranche.coveredSymbols);
        if (Array.isArray(arr)) arr.forEach((s: string) => baselineSymbols.add(s.toUpperCase()));
      } catch {
        compareTranche.coveredSymbols.split(',').forEach((s: string) => baselineSymbols.add(s.trim().toUpperCase()));
      }
    }

    const prevList: EndorsementHoldingDiffItem[] = [];
    const propList: EndorsementHoldingDiffItem[] = [];

    for (const h of holdings) {
      const sym = (h.tickerSymbol || h.symbol || 'STOCK').toUpperCase();
      const qty = Number(h.quantity || 0);
      const price = Number(h.averageBuyPrice || h.averagePrice || 0);
      const val = Number(h.currentValue || (qty * price));
      const isHighBeta = Boolean((h.betaScore && h.betaScore > 1.2) || highRiskSymbols.has(sym));
      const isNew = baselineSymbols.size > 0 ? !baselineSymbols.has(sym) : isHighBeta;

      if (!isNew) {
        prevList.push({
          symbol: sym,
          quantity: qty,
          averageBuyPrice: price,
          totalValue: val,
          status: 'UNCHANGED',
          isHighRisk: false
        });
      }

      propList.push({
        symbol: sym,
        quantity: qty,
        averageBuyPrice: price,
        totalValue: val,
        status: isNew ? 'ADDED' : 'UNCHANGED',
        isHighRisk: isHighBeta || isNew
      });
    }

    this.diffPreviousHoldings.set(prevList);
    this.diffProposedHoldings.set(propList);
  }

  closeDiffModal(): void {
    this.selectedEndorsement.set(null);
    this.diffPreviousHoldings.set([]);
    this.diffProposedHoldings.set([]);
  }

  acceptEndorsement(): void {
    const end = this.selectedEndorsement();
    if (!end) return;

    this.processing.set(true);
    const underwriter = this.getUnderwriterName();
    const policy = this.policies().find(p => p.policyId === end.policyId || p.id === end.policyId);

    // Confirm in shared UnderwritingQueueService to unlock investor view
    // Pass policyId, policyNumber, and trancheNumber for robust matching
    this.underwritingQueue.confirmEndorsementReview(
      end.trancheId,
      underwriter,
      end.policyId,
      policy?.policyNumber || end.policyNumber,
      end.trancheNumber
    );

    setTimeout(() => {
      this.processing.set(false);
      this.closeDiffModal();
      this.refresh(false);
      // pendingEndorsements is computed — auto-updates when service signal changes
      this.notificationService.addToast(
        'Endorsement Confirmed',
        `High-risk tranche endorsement (Risk: ${end.newRiskScore}/1000) reviewed and released to investor.`,
        'SUCCESS'
      );
    }, 400);
  }

  rejectEndorsement(): void {
    const end = this.selectedEndorsement();
    if (!end) return;

    this.processing.set(true);
    const underwriter = this.getUnderwriterName();
    const policy = this.policies().find(p => p.policyId === end.policyId || p.id === end.policyId);

    this.underwritingQueue.rejectEndorsementReview(
      end.trancheId,
      underwriter,
      undefined,
      end.policyId,
      policy?.policyNumber || end.policyNumber,
      end.trancheNumber
    );

    if (end.policyId && !end.id?.startsWith('end-')) {
      this.api.rejectEndorsement(end.policyId, end.trancheId).subscribe({
        next: () => {
          this.processing.set(false);
          this.closeDiffModal();
          this.notificationService.addToast('Endorsement Declined', `Tranche endorsement declined for Policy ${end.policyId}.`, 'INFO');
        },
        error: () => {
          this.processing.set(false);
          this.closeDiffModal();
          this.notificationService.addToast('Endorsement Declined', `Tranche endorsement declined for Policy ${end.policyId}.`, 'INFO');
        }
      });
    } else {
      setTimeout(() => {
        this.processing.set(false);
        this.closeDiffModal();
        this.notificationService.addToast('Endorsement Declined', 'Tranche modification declined.', 'INFO');
      }, 600);
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-IN').format(Math.round(val || 0));
  }

  clearQueue(): void {
    this.underwritingQueue.clearQueue();
    this.notificationService.addToast('Queue Cleared', 'Underwriting application queue cleared.', 'INFO');
  }

  clearEndorsements(): void {
    if (confirm('Are you sure you want to clear the pending endorsements queue?')) {
      this.underwritingQueue.clearEndorsementReviews();
      this.underwritingQueue.clearAllApprovedKeys();
      this.notificationService.addToast('Endorsements Cleared', 'All pending endorsement reviews and approval cache cleared.', 'INFO');
      this.refresh();
    }
  }
}

