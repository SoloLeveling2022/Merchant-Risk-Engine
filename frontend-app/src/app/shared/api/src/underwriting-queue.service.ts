import { Injectable, signal } from '@angular/core';
import { Observable, of, Subject, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApiService } from './api.service';
import { UnderwritingApplicationDTO } from '@frontend/shared-models';

const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/6aba8689ffd5d1605338031e';
const JSONBIN_MASTER_KEY = '$2a$10$dz0dSnALhEYQ14PbEWnhuu.RviIKxg68rsEIbQOUxXePDdRBCmHUC';
const SNAPSHOTS_KEY = 'stockshield_holdings_snapshots_v1';
const APPROVED_KEYS_KEY = 'stockshield_approved_endorsements_v2';
const BROADCAST_CHANNEL_NAME = 'stockshield_uw_channel_v1';

export interface EndorsementHoldingDiffItem {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  totalValue: number;
  status: 'UNCHANGED' | 'MODIFIED' | 'ADDED' | 'REMOVED';
  oldQuantity?: number;
  oldPrice?: number;
  oldTotalValue?: number;
  isHighRisk?: boolean;
}

export interface EndorsementReviewDTO {
  id: string;
  trancheId: string;
  policyId: string;
  policyNumber?: string;
  portfolioId?: string;
  trancheNumber?: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  oldRiskScore: number;
  newRiskScore: number;
  portfolioValue: number;
  oldInsuredValue?: number;
  newInsuredValue?: number;
  premiumDelta?: number;
  coveredSymbols?: string;
  previousHoldings?: EndorsementHoldingDiffItem[];
  proposedHoldings?: EndorsementHoldingDiffItem[];
  status: 'PENDING_UNDERWRITER_REVIEW' | 'UNDERWRITER_APPROVED' | 'UNDERWRITER_REJECTED';
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface UnderwritingQueueEvent {
  type: 
    | 'APPLICATION_SUBMITTED' 
    | 'APPLICATION_APPROVED' 
    | 'APPLICATION_REJECTED' 
    | 'ENDORSEMENT_REGISTERED' 
    | 'ENDORSEMENT_APPROVED' 
    | 'ENDORSEMENT_REJECTED' 
    | 'QUEUE_CLEARED'
    | 'SYNC_UPDATE';
  payload?: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class UnderwritingQueueService {
  private applicationsSignal = signal<UnderwritingApplicationDTO[]>([]);
  public applications = this.applicationsSignal.asReadonly();

  private endorsementReviewsSignal = signal<EndorsementReviewDTO[]>([]);
  public endorsementReviews = this.endorsementReviewsSignal.asReadonly();

  private approvedKeysSignal = signal<string[]>([]);
  public approvedKeys = this.approvedKeysSignal.asReadonly();

  private eventSubject = new Subject<UnderwritingQueueEvent>();
  public events$ = this.eventSubject.asObservable();

  private channel: BroadcastChannel | null = null;

  constructor(private api: ApiService, private http: HttpClient) {
    this.syncFromBin();
    this.initBroadcastChannel();
    this.initStorageListener();
  }

  private initBroadcastChannel(): void {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          const data: UnderwritingQueueEvent = event.data;
          if (data && data.type) {
            this.syncFromBin();
            this.eventSubject.next(data);
          }
        };
      } catch {
        this.channel = null;
      }
    }
  }

  private initStorageListener(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        this.syncFromBin();
        this.eventSubject.next({
          type: 'SYNC_UPDATE',
          payload: { key: event.key },
          timestamp: Date.now()
        });
      });
    }
  }

  public broadcastEvent(event: Omit<UnderwritingQueueEvent, 'timestamp'>): void {
    const fullEvent: UnderwritingQueueEvent = { ...event, timestamp: Date.now() };
    this.eventSubject.next(fullEvent);
  }

  public syncFromStorage(): void {
    this.syncFromBin();
  }


  private pollSub: Subscription | null = null;
  private isSyncing = false;

  private get headers() {
    return new HttpHeaders({
      'X-Master-Key': JSONBIN_MASTER_KEY,
      'Content-Type': 'application/json'
    });
  }

  private syncFromBin(): void {
    this.isSyncing = true;
    this.http.get<any>(JSONBIN_URL, { headers: this.headers }).pipe(
      catchError(() => of(null))
    ).subscribe(res => {
      this.isSyncing = false;
      if (res && res.record) {
        const r = res.record;
        if (Array.isArray(r.applications)) {
           const realOnly = r.applications.filter((a: any) => a.applicationId !== 'APP-UW-7821' && a.applicationId !== 'APP-UW-9042');
           this.applicationsSignal.set(realOnly);
        }
        if (Array.isArray(r.endorsements)) this.endorsementReviewsSignal.set(r.endorsements);
        if (Array.isArray(r.approvedKeys)) this.approvedKeysSignal.set(r.approvedKeys);
      }
    });
  }

  private syncToBin(): void {
    this.isSyncing = true;
    const payload = {
      applications: this.applicationsSignal(),
      endorsements: this.endorsementReviewsSignal(),
      approvedKeys: this.approvedKeysSignal()
    };
    this.http.put(JSONBIN_URL, payload, { headers: this.headers }).pipe(
      catchError(() => of(null))
    ).subscribe(() => {
      this.isSyncing = false;
    });
  }


  private saveApplications(apps: UnderwritingApplicationDTO[]): void {
    this.applicationsSignal.set(apps);
    this.syncToBin();
  }

  public getApplications(): UnderwritingApplicationDTO[] {
    return this.applicationsSignal();
  }

  public getPendingApplications(): UnderwritingApplicationDTO[] {
    return this.applicationsSignal().filter(a => a.status === 'PENDING_REVIEW');
  }

  public getUserApplications(userId: string): UnderwritingApplicationDTO[] {
    const norm = (userId || '').toLowerCase().trim();
    return this.applicationsSignal().filter(a => 
      (a.userId || '').toLowerCase().trim() === norm || 
      (a.userEmail || '').toLowerCase().trim() === norm
    );
  }

  public submitApplication(appData: Partial<UnderwritingApplicationDTO>): UnderwritingApplicationDTO {
    const newApp: UnderwritingApplicationDTO = {
      applicationId: `APP-UW-${Math.floor(1000 + Math.random() * 9000)}`,
      quoteId: appData.quoteId || `q-${Date.now()}`,
      portfolioId: appData.portfolioId || 'portfolio-default',
      portfolioName: appData.portfolioName || 'Investor Equity Portfolio',
      userId: appData.userId || 'anonymous-investor',
      userName: appData.userName || 'Investor',
      userEmail: appData.userEmail || '',
      riskScore: appData.riskScore || 650,
      riskTier: appData.riskTier || (appData.riskScore && appData.riskScore > 800 ? 'CRITICAL_RISK' : 'VERY_HIGH_RISK'),
      portfolioValue: appData.portfolioValue || 500000,
      insuredValue: appData.insuredValue || appData.portfolioValue || 500000,
      coverageAmount: appData.coverageAmount || 250000,
      coveragePercentage: appData.coveragePercentage || 50,
      annualPremium: appData.annualPremium || 25000,
      premiumPercentage: appData.premiumPercentage || 5.0,
      deductible: appData.deductible || 500,
      status: 'PENDING_REVIEW',
      beta: appData.beta || 1.45,
      volatilityScore: appData.volatilityScore || 500,
      concentrationScore: appData.concentrationScore || 400,
      maxDrawdownScore: appData.maxDrawdownScore || 350,
      liquidityScore: appData.liquidityScore || 250,
      marketStressScore: appData.marketStressScore || 450,
      tenureYears: appData.tenureYears || 5,
      waitingPeriodYears: appData.waitingPeriodYears || Math.ceil((appData.tenureYears || 5) * 0.4),
      createdAt: new Date().toISOString()
    };

    const current = [newApp, ...this.applicationsSignal()];
    this.saveApplications(current);
    this.broadcastEvent({ type: 'APPLICATION_SUBMITTED', payload: newApp });
    return newApp;
  }

  public approveApplication(applicationId: string, underwriterName: string, notes?: string): Observable<UnderwritingApplicationDTO | null> {
    const apps = [...this.applicationsSignal()];
    const index = apps.findIndex(a => a.applicationId === applicationId);
    if (index === -1) return of(null);

    const app = apps[index];

    apps[index] = {
      ...app,
      status: 'APPROVED_PENDING_PAYMENT',
      reviewedBy: underwriterName,
      reviewedAt: new Date().toISOString(),
      reviewNotes: notes || 'Approved under high-risk underwriting guidelines with standard actuarial volatility margin.'
    };
    this.saveApplications(apps);
    this.broadcastEvent({ type: 'APPLICATION_APPROVED', payload: apps[index] });
    return of(apps[index]);
  }

  public payApplication(applicationId: string): Observable<UnderwritingApplicationDTO | null> {
    const apps = [...this.applicationsSignal()];
    const index = apps.findIndex(a => a.applicationId === applicationId);
    if (index === -1) return of(null);
    const app = apps[index];

    return this.api.purchasePolicy(app.quoteId, app.userId, app.tenureYears).pipe(
      map(policy => {
        const polNumber = policy?.policyNumber || policy?.id || `POL-UW-${Math.floor(100000 + Math.random() * 900000)}`;
        const polId = policy?.id || policy?.policyId || polNumber;
        
        apps[index] = {
          ...app,
          status: 'APPROVED',
          policyId: polId,
          policyNumber: polNumber
        };
        this.saveApplications(apps);
        this.broadcastEvent({ type: 'SYNC_UPDATE' });
        return apps[index];
      }),
      catchError(() => {
        const polNumber = `POL-UW-${Math.floor(100000 + Math.random() * 900000)}`;
        apps[index] = {
          ...app,
          status: 'APPROVED',
          policyId: polNumber,
          policyNumber: polNumber
        };
        this.saveApplications(apps);
        this.broadcastEvent({ type: 'SYNC_UPDATE' });
        return of(apps[index]);
      })
    );
  }

  public rejectApplication(applicationId: string, underwriterName: string, reason: string): void {
    const apps = [...this.applicationsSignal()];
    const index = apps.findIndex(a => a.applicationId === applicationId);
    if (index === -1) return;

    apps[index] = {
      ...apps[index],
      status: 'REJECTED',
      reviewedBy: underwriterName,
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason || 'Portfolio asset volatility concentration exceeds platform risk retention guidelines.'
    };
    this.saveApplications(apps);
    this.broadcastEvent({ type: 'APPLICATION_REJECTED', payload: apps[index] });
  }

  public deleteApplication(applicationId: string): void {
    const apps = this.applicationsSignal().filter(a => a.applicationId !== applicationId);
    this.saveApplications(apps);
    this.broadcastEvent({ type: 'APPLICATION_REJECTED', payload: { applicationId } });
  }

  public clearQueue(): void {
    this.saveApplications([]);
    this.broadcastEvent({ type: 'QUEUE_CLEARED' });
  }

  public clearEndorsementReviews(): void {
    this.saveEndorsementReviews([]);
    this.broadcastEvent({ type: 'QUEUE_CLEARED' });
  }

  public clearEndorsementReviewsForPolicy(policyId: string): void {
    const filtered = this.endorsementReviewsSignal().filter(
      e => e.policyId !== policyId || e.status !== 'PENDING_UNDERWRITER_REVIEW'
    );
    this.saveEndorsementReviews(filtered);
    this.broadcastEvent({ type: 'SYNC_UPDATE', payload: { policyId } });
  }

  // Removes ALL reviews (any status) for a policy — call after portfolio edit to clear stale approved/rejected entries
  public clearAllEndorsementReviewsForPolicy(policyId: string): void {
    const filtered = this.endorsementReviewsSignal().filter(e => e.policyId !== policyId);
    this.saveEndorsementReviews(filtered);
    this.broadcastEvent({ type: 'SYNC_UPDATE', payload: { policyId } });
  }

  // ══════════════════════════════════════════════════════════════════════
  // PORTFOLIO ENDORSEMENT UNDERWRITING REVIEW GATE (RISK >= 500)
  // ══════════════════════════════════════════════════════════════════════

  private saveEndorsementReviews(reviews: EndorsementReviewDTO[]): void {
    this.endorsementReviewsSignal.set(reviews);
    this.syncToBin();
  }

  public saveHoldingsSnapshot(
    portfolioId: string,
    previousHoldings: EndorsementHoldingDiffItem[],
    proposedHoldings: EndorsementHoldingDiffItem[],
    policyId?: string
  ): void {
    if (!portfolioId) return;
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      const map: Record<string, any> = raw ? JSON.parse(raw) : {};
      const snapshot = {
        portfolioId,
        policyId,
        previousHoldings,
        proposedHoldings,
        updatedAt: Date.now()
      };
      map[portfolioId] = snapshot;
      if (policyId) map[policyId] = snapshot;
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(map));

      // Also attach immediately to any pending review in memory
      const reviews = [...this.endorsementReviewsSignal()];
      let updated = false;
      for (let i = 0; i < reviews.length; i++) {
        if (reviews[i].portfolioId === portfolioId || (policyId && reviews[i].policyId === policyId)) {
          reviews[i] = {
            ...reviews[i],
            portfolioId: portfolioId || reviews[i].portfolioId,
            previousHoldings,
            proposedHoldings
          };
          updated = true;
        }
      }
      if (updated) {
        this.saveEndorsementReviews(reviews);
        this.broadcastEvent({ type: 'SYNC_UPDATE', payload: { portfolioId } });
      }
    } catch {
      // ignore
    }
  }

  public getHoldingsSnapshot(portfolioId?: string, policyId?: string): { previousHoldings: EndorsementHoldingDiffItem[]; proposedHoldings: EndorsementHoldingDiffItem[] } | null {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      if (!raw) return null;
      const map = JSON.parse(raw);
      if (portfolioId && map[portfolioId]) return map[portfolioId];
      if (policyId && map[policyId]) return map[policyId];
    } catch {
      return null;
    }
    return null;
  }

  public getPendingEndorsementReviews(): EndorsementReviewDTO[] {
    return this.endorsementReviewsSignal().filter(e => e.status === 'PENDING_UNDERWRITER_REVIEW');
  }

  private loadApprovedKeys(): string[] {
    try {
      const stored = localStorage.getItem(APPROVED_KEYS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out stale legacy bare policy keys that don't specify a tranche or full UUID
          const validKeys = parsed.filter(k => 
            typeof k === 'string' && (k.includes('tranche') || k.length >= 30)
          );
          this.approvedKeysSignal.set(validKeys);
          return validKeys;
        }
      }
    } catch {
      // ignore
    }
    this.approvedKeysSignal.set([]);
    return [];
  }

  private saveApprovedKeys(keys: string[]): void {
    this.approvedKeysSignal.set(keys);
    this.syncToBin();
  }

  public isKeyApproved(trancheId?: string, policyId?: string, policyNumber?: string, trancheNumber?: number): boolean {
    const keys = this.approvedKeysSignal();
    if (!keys || keys.length === 0) return false;

    const targets: string[] = [];
    if (trancheId) targets.push(trancheId.toLowerCase().trim());

    const tNum = trancheNumber || (trancheId?.startsWith('tranche-') ? trancheId.replace('tranche-', '') : undefined);

    // Tranche-specific keys ONLY — NEVER bare policy IDs!
    if (policyId && tNum) {
      const cleanPol = policyId.replace(/^POL-/i, '').toLowerCase().trim();
      targets.push(`${cleanPol}_tranche_${tNum}`);
      targets.push(`${policyId.toLowerCase().trim()}_tranche_${tNum}`);
    }
    if (policyNumber && tNum) {
      const cleanNum = policyNumber.replace(/^POL-/i, '').toLowerCase().trim();
      targets.push(`${cleanNum}_tranche_${tNum}`);
      targets.push(`${policyNumber.toLowerCase().trim()}_tranche_${tNum}`);
    }

    return keys.some(k => targets.some(t => k === t || (t.length >= 8 && k.includes(t)) || (k.length >= 8 && t.includes(k))));
  }

  public markKeyApproved(trancheId?: string, policyId?: string, policyNumber?: string, trancheNumber?: number): void {
    const current = new Set(this.approvedKeysSignal());
    if (trancheId) current.add(trancheId.toLowerCase().trim());

    const tNum = trancheNumber || (trancheId?.startsWith('tranche-') ? trancheId.replace('tranche-', '') : undefined);

    if (policyId && tNum) {
      const cleanPol = policyId.replace(/^POL-/i, '').toLowerCase().trim();
      current.add(`${cleanPol}_tranche_${tNum}`);
      current.add(`${policyId.toLowerCase().trim()}_tranche_${tNum}`);
    }
    if (policyNumber && tNum) {
      const cleanNum = policyNumber.replace(/^POL-/i, '').toLowerCase().trim();
      current.add(`${cleanNum}_tranche_${tNum}`);
      current.add(`${policyNumber.toLowerCase().trim()}_tranche_${tNum}`);
    }

    this.saveApprovedKeys(Array.from(current));
  }

  public clearApproval(trancheId?: string, policyId?: string, trancheNumber?: number): void {
    let keys = this.approvedKeysSignal();
    const tClean = (trancheId || '').toLowerCase().trim();
    const pClean = (policyId || '').replace(/^POL-/i, '').toLowerCase().trim();
    const tNum = trancheNumber || (trancheId?.startsWith('tranche-') ? trancheId.replace('tranche-', '') : undefined);

    keys = keys.filter(k => {
      if (tClean && k === tClean) return false;
      if (pClean && tNum && k.includes(`${pClean}_tranche_${tNum}`)) return false;
      if (pClean && !k.includes('tranche') && k.includes(pClean)) return false; // purge stale bare policy keys
      return true;
    });
    this.saveApprovedKeys(keys);
  }

  public clearAllApprovedKeys(): void {
    this.saveApprovedKeys([]);
  }

  public matchesReview(
    review: EndorsementReviewDTO,
    trancheId?: string,
    policyId?: string,
    policyNumber?: string,
    trancheNumber?: number
  ): boolean {
    if (!review) return false;

    // 1. Direct trancheId match
    if (trancheId && review.trancheId && review.trancheId.toLowerCase().trim() === trancheId.toLowerCase().trim()) {
      return true;
    }

    // 2. Tranche number comparison
    const tNum = trancheNumber || (trancheId?.startsWith('tranche-') ? parseInt(trancheId.replace('tranche-', ''), 10) : undefined);
    const rNum = review.trancheNumber || (review.trancheId?.startsWith('tranche-') ? parseInt(review.trancheId.replace('tranche-', ''), 10) : undefined);

    const clean = (s?: string) => (s || '').replace(/^POL-/i, '').toLowerCase().trim();

    const rPol = clean(review.policyId);
    const rPolicyNum = clean(review.policyNumber);
    const qPol = clean(policyId);
    const qPolicyNum = clean(policyNumber);

    const policyMatches = Boolean(
      (qPol && rPol && (rPol === qPol || (qPol.length >= 8 && rPol.includes(qPol)) || (rPol.length >= 8 && qPol.includes(rPol)))) ||
      (qPolicyNum && rPolicyNum && (rPolicyNum === qPolicyNum || (qPolicyNum.length >= 6 && rPolicyNum.includes(qPolicyNum)))) ||
      (qPol && rPolicyNum && (rPolicyNum === qPol || (qPol.length >= 8 && rPolicyNum.includes(qPol)))) ||
      (qPolicyNum && rPol && (rPol === qPolicyNum || (qPolicyNum.length >= 8 && rPol.includes(qPolicyNum))))
    );

    if (policyMatches) {
      // If both have tranche numbers, they must match!
      if (tNum && rNum) {
        return tNum === rNum;
      }
      // If trancheIds are provided on both but didn't match in step 1, they are different tranches!
      if (trancheId && review.trancheId && trancheId.toLowerCase().trim() !== review.trancheId.toLowerCase().trim()) {
        return false;
      }
      return true;
    }

    return false;
  }

  public registerPendingEndorsement(data: Partial<EndorsementReviewDTO> & { trancheId: string; policyId: string; newRiskScore: number; policyNumber?: string; trancheNumber?: number }): EndorsementReviewDTO {
    // If ALREADY approved for THIS tranche, do NOT revert to pending!
    if (this.isEndorsementApproved(data.trancheId, data.newRiskScore, data.policyId, data.policyNumber, data.trancheNumber)) {
      const existingApproved = this.endorsementReviewsSignal().find(e =>
        this.matchesReview(e, data.trancheId, data.policyId, data.policyNumber, data.trancheNumber) && e.status === 'UNDERWRITER_APPROVED'
      );
      if (existingApproved) return existingApproved;
    }

    const list = [...this.endorsementReviewsSignal()];
    const snapshot = this.getHoldingsSnapshot(data.portfolioId, data.policyId);

    // Check if an existing review matches this tranche
    const existingIdx = list.findIndex(e => 
      this.matchesReview(e, data.trancheId, data.policyId, data.policyNumber, data.trancheNumber)
    );

    if (existingIdx >= 0) {
      const existing = list[existingIdx];
      if (existing.status === 'UNDERWRITER_APPROVED') {
        if (!existing.proposedHoldings && snapshot) {
          list[existingIdx] = {
            ...existing,
            portfolioId: data.portfolioId || existing.portfolioId,
            policyNumber: data.policyNumber || existing.policyNumber,
            trancheNumber: data.trancheNumber || existing.trancheNumber,
            previousHoldings: snapshot.previousHoldings,
            proposedHoldings: snapshot.proposedHoldings
          };
          this.saveEndorsementReviews(list);
        }
        return list[existingIdx];
      }

      // If pending, update with snapshot if missing
      if (!existing.proposedHoldings && snapshot) {
        list[existingIdx] = {
          ...existing,
          portfolioId: data.portfolioId || existing.portfolioId,
          policyNumber: data.policyNumber || existing.policyNumber,
          trancheNumber: data.trancheNumber || existing.trancheNumber,
          previousHoldings: snapshot.previousHoldings,
          proposedHoldings: snapshot.proposedHoldings
        };
        this.saveEndorsementReviews(list);
      }
      return list[existingIdx];
    }

    // Remove any older PENDING entries for the same policy & tranche
    const filtered = list.filter(e =>
      !this.matchesReview(e, data.trancheId, data.policyId, data.policyNumber, data.trancheNumber)
    );

    const newEndorsement: EndorsementReviewDTO = {
      id: data.trancheId,
      trancheId: data.trancheId,
      policyId: data.policyId,
      policyNumber: data.policyNumber,
      portfolioId: data.portfolioId,
      trancheNumber: data.trancheNumber || 2,
      userId: data.userId || 'investor',
      userName: data.userName || 'Insured Investor',
      userEmail: data.userEmail,
      oldRiskScore: data.oldRiskScore || 380,
      newRiskScore: data.newRiskScore,
      portfolioValue: data.portfolioValue || 0,
      oldInsuredValue: data.oldInsuredValue || 0,
      newInsuredValue: data.newInsuredValue || data.portfolioValue || 0,
      premiumDelta: data.premiumDelta || 0,
      coveredSymbols: data.coveredSymbols || '',
      previousHoldings: data.previousHoldings || snapshot?.previousHoldings,
      proposedHoldings: data.proposedHoldings || snapshot?.proposedHoldings,
      status: 'PENDING_UNDERWRITER_REVIEW',
      createdAt: new Date().toISOString()
    };

    const updated = [newEndorsement, ...filtered];
    this.saveEndorsementReviews(updated);
    this.broadcastEvent({ type: 'ENDORSEMENT_REGISTERED', payload: newEndorsement });
    return newEndorsement;
  }

  public isEndorsementApproved(trancheId?: string, riskScore?: number, policyId?: string, policyNumber?: string, trancheNumber?: number): boolean {
    if ((riskScore || 0) < 500) {
      return true; // Standard risk does not need underwriter pre-gate
    }
    // 1. Direct persistent approved keys check
    if (this.isKeyApproved(trancheId, policyId, policyNumber, trancheNumber)) {
      return true;
    }
    // 2. Check if ANY matching review in the reviews signal is approved
    return this.endorsementReviewsSignal().some(e => 
      this.matchesReview(e, trancheId, policyId, policyNumber, trancheNumber) && e.status === 'UNDERWRITER_APPROVED'
    );
  }

  public confirmEndorsementReview(trancheId: string, underwriterName: string, policyId?: string, policyNumber?: string, trancheNumber?: number): void {
    // 1. Add to persistent approved keys set
    this.markKeyApproved(trancheId, policyId, policyNumber, trancheNumber);

    // 2. Update reviews list
    const list = [...this.endorsementReviewsSignal()];
    let matched = false;
    for (let i = 0; i < list.length; i++) {
      if (this.matchesReview(list[i], trancheId, policyId, policyNumber, trancheNumber)) {
        list[i] = {
          ...list[i],
          policyId: policyId || list[i].policyId,
          policyNumber: policyNumber || list[i].policyNumber,
          trancheNumber: trancheNumber || list[i].trancheNumber,
          status: 'UNDERWRITER_APPROVED',
          reviewedBy: underwriterName,
          reviewedAt: new Date().toISOString()
        };
        matched = true;
      }
    }
    if (!matched) {
      // Create approved review so isUnderwriterGated() clears immediately
      const newItem: EndorsementReviewDTO = {
        id: trancheId || `end-${Date.now()}`,
        trancheId: trancheId || `tranche-${Date.now()}`,
        policyId: policyId || 'POL',
        policyNumber: policyNumber || (policyId ? `POL-${policyId.substring(0, 8).toUpperCase()}` : undefined),
        trancheNumber: trancheNumber || 2,
        oldRiskScore: 380,
        newRiskScore: 620,
        portfolioValue: 0,
        status: 'UNDERWRITER_APPROVED',
        reviewedBy: underwriterName,
        reviewedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      list.unshift(newItem);
    }
    this.saveEndorsementReviews(list);
    this.broadcastEvent({ type: 'ENDORSEMENT_APPROVED', payload: { trancheId, policyId, policyNumber, trancheNumber } });
  }

  public rejectEndorsementReview(trancheId: string, underwriterName: string, reason?: string, policyId?: string, policyNumber?: string, trancheNumber?: number): void {
    const list = [...this.endorsementReviewsSignal()];
    for (let i = 0; i < list.length; i++) {
      if (this.matchesReview(list[i], trancheId, policyId, policyNumber, trancheNumber)) {
        list[i] = {
          ...list[i],
          status: 'UNDERWRITER_REJECTED',
          reviewedBy: underwriterName,
          reviewedAt: new Date().toISOString()
        };
      }
    }
    this.saveEndorsementReviews(list);
    this.broadcastEvent({ type: 'ENDORSEMENT_REJECTED', payload: { trancheId, policyId, policyNumber, trancheNumber } });
  }

  /**
   * Scans policies retrieved from backend API for any pending high-risk tranches (riskScore >= 500)
   * and auto-registers them into the underwriter's queue if not already approved.
   */
  public syncEndorsementsFromBackend(policies: any[]): void {
    if (!policies || !Array.isArray(policies) || policies.length === 0) return;
    let hasNew = false;
    let latestRegistered: EndorsementReviewDTO | null = null;
    const currentReviews = [...this.endorsementReviewsSignal()];

    for (const p of policies) {
      const policyId = p.id || p.policyId;
      if (!policyId) continue;
      const tranches = p.tranches || [];
      // Pick the highest-numbered pending tranche to avoid processing stale ones
      const pendingTranches = tranches.filter((t: any) =>
        t.trancheStatus === 'PENDING_ACCEPTANCE' ||
        t.trancheStatus === 'PENDING' ||
        t.trancheStatus === 'PENDING_APPROVAL'
      );
      if (!pendingTranches.length) continue;
      const pendingTranche = pendingTranches.reduce((best: any, t: any) =>
        (t.trancheNumber || 0) > (best.trancheNumber || 0) ? t : best
      , pendingTranches[0]);

      const riskScore = Number(pendingTranche.riskScore || 0);
      if (riskScore < 500) continue; // Only high risk (Tiers 4 & 5) requires underwriter sign-off
      
      // FIX: Tranche 1 is the base policy application, NOT an endorsement. Ignore it.
      if ((pendingTranche.trancheNumber || 0) <= 1) continue;

      const trancheId = pendingTranche.trancheId || `tranche-${pendingTranche.trancheNumber || 2}`;
      const trancheNumber = pendingTranche.trancheNumber;
      
      // If already approved for this specific tranche, do not register as pending!
      if (this.isEndorsementApproved(trancheId, riskScore, policyId, p.policyNumber, trancheNumber)) {
        continue;
      }

      // Check if already registered using multi-key matcher
      const existing = currentReviews.find(r => 
        this.matchesReview(r, trancheId, policyId, p.policyNumber, trancheNumber)
      );

      const snapshot = this.getHoldingsSnapshot(p.portfolioId, policyId);

      if (!existing) {
        const activeValue = Number(p.insuredValue || p.totalInsuredValue || 0);
        const pendingVal = Number(pendingTranche.insuredValue || activeValue);
        const pendingPremPct = Number(pendingTranche.premiumPercentage || 5.0);
        const activePremPct = Number(p.premiumPercentage || 2.0);
        const premiumDelta = Math.max(0, (pendingVal * pendingPremPct / 100) - (activeValue * activePremPct / 100));

        const newEndorsement: EndorsementReviewDTO = {
          id: trancheId,
          trancheId: trancheId,
          policyId: policyId,
          policyNumber: p.policyNumber,
          portfolioId: p.portfolioId,
          trancheNumber: trancheNumber || 2,
          userId: p.userId || 'investor',
          userName: p.userName || 'Insured Investor',
          userEmail: p.userEmail || '',
          oldRiskScore: Number(p.riskScore || 380),
          newRiskScore: riskScore,
          portfolioValue: pendingVal,
          oldInsuredValue: activeValue,
          newInsuredValue: pendingVal,
          premiumDelta,
          coveredSymbols: pendingTranche.coveredSymbols || '',
          previousHoldings: snapshot?.previousHoldings,
          proposedHoldings: snapshot?.proposedHoldings,
          status: 'PENDING_UNDERWRITER_REVIEW',
          createdAt: new Date().toISOString()
        };
        currentReviews.unshift(newEndorsement);
        latestRegistered = newEndorsement;
        hasNew = true;
      } else {
        if (!existing.policyNumber && p.policyNumber) {
          existing.policyNumber = p.policyNumber;
          hasNew = true;
        }
        if (!existing.portfolioId && p.portfolioId) {
          existing.portfolioId = p.portfolioId;
          hasNew = true;
        }
        if (!existing.trancheNumber && trancheNumber) {
          existing.trancheNumber = trancheNumber;
          hasNew = true;
        }
        if (!existing.proposedHoldings && snapshot) {
          existing.previousHoldings = snapshot.previousHoldings;
          existing.proposedHoldings = snapshot.proposedHoldings;
          hasNew = true;
        }
      }
    }

    if (hasNew) {
      this.saveEndorsementReviews(currentReviews);
      this.broadcastEvent({ 
        type: 'ENDORSEMENT_REGISTERED',
        payload: latestRegistered || currentReviews[0]
      });
    }
  }
}
