import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  AuthResponseDTO,
  KycSubmissionDTO,
  UserDTO,
  PortfolioDTO,
  PortfolioHoldingDTO,
  ManualPortfolioRequestDTO,
  QuoteRequestDTO,
  QuoteDTO,
  PolicyDTO,
  ClaimDTO,
  ClaimSubmissionDTO,
  AuditLogDTO,
} from '../../models/src/index';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = '/api/v1';

  constructor(private http: HttpClient) {}

  // ─── Auth ────────────────────────────────
  login(req: LoginRequestDTO): Observable<AuthResponseDTO> {
    return this.http.post<any>(`${this.BASE}/auth/login`, req).pipe(
      map((res: any) => res?.data || res)
    );
  }

  register(req: RegisterRequestDTO): Observable<AuthResponseDTO> {
    return this.http.post<any>(`${this.BASE}/auth/register`, req).pipe(
      map((res: any) => res?.data || res)
    );
  }

  refreshToken(refreshToken: string): Observable<AuthResponseDTO> {
    return this.http.post<AuthResponseDTO>(`${this.BASE}/auth/refresh`, { refreshToken });
  }

  seedUsers(): Observable<any> {
    return this.http.post(`${this.BASE}/auth/seed-users`, {});
  }

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<any>(`${this.BASE}/auth/users`).pipe(
      map((res: any) => res?.data || res || [])
    );
  }

  // ─── KYC ─────────────────────────────────
  submitKyc(submission: KycSubmissionDTO): Observable<any> {
    return this.http.post(`${this.BASE}/auth/kyc/submit`, submission);
  }

  getKycStatus(userId: string): Observable<any> {
    return this.http.get(`${this.BASE}/auth/kyc/status`, { params: { userId } });
  }

  getPendingKyc(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/auth/kyc/pending`);
  }

  getAllKycApplications(): Observable<any[]> {
    return this.http.get<any>(`${this.BASE}/auth/kyc/all`).pipe(
      map((res: any) => res?.data || res || [])
    );
  }

  approveKyc(userId: string): Observable<any> {
    return this.http.post(`${this.BASE}/auth/kyc/approve/${userId}`, {});
  }

  rejectKyc(userId: string, reason?: string): Observable<any> {
    return this.http.post(`${this.BASE}/auth/kyc/reject/${userId}`, { reason });
  }

  // ─── Portfolio ───────────────────────────
  getPortfoliosByUser(userId: string): Observable<PortfolioDTO[]> {
    return this.http.get<PortfolioDTO[]>(`${this.BASE}/portfolios/user/${userId}`);
  }

  getPortfolioById(portfolioId: string): Observable<PortfolioDTO> {
    return this.http.get<PortfolioDTO>(`${this.BASE}/portfolios/${portfolioId}`);
  }

  getPortfolioHoldings(portfolioId: string): Observable<PortfolioHoldingDTO[]> {
    return this.http.get<PortfolioHoldingDTO[]>(`${this.BASE}/portfolios/${portfolioId}/holdings`);
  }

  getAllPortfolios(): Observable<PortfolioDTO[]> {
    return this.http.get<PortfolioDTO[]>(`${this.BASE}/portfolios/all`);
  }

  uploadManualPortfolio(req: ManualPortfolioRequestDTO): Observable<PortfolioDTO> {
    return this.http.post<PortfolioDTO>(`${this.BASE}/portfolios/upload/manual`, req);
  }

  uploadCsvPortfolio(userId: string, portfolioName: string, file: File): Observable<PortfolioDTO> {
    const formData = new FormData();
    formData.append('file', file);
    const encodedName = encodeURIComponent(portfolioName || 'CSV Portfolio');
    return this.http.post<PortfolioDTO>(`${this.BASE}/portfolios/${userId}/${encodedName}/import/csv`, formData);
  }

  updateHoldings(portfolioId: string, holdings: any[]): Observable<PortfolioDTO> {
    return this.http.put<PortfolioDTO>(`${this.BASE}/portfolios/${portfolioId}/holdings`, holdings);
  }

  updatePortfolio(portfolioId: string, payload: { portfolioName?: string; holdings?: any[] }): Observable<PortfolioDTO> {
    return this.http.put<PortfolioDTO>(`${this.BASE}/portfolios/${portfolioId}`, payload);
  }

  simulateMarket(portfolioId: string): Observable<PortfolioDTO> {
    return this.http.post<PortfolioDTO>(`${this.BASE}/portfolios/${portfolioId}/simulate-market`, {});
  }

  // ─── Underwriting ───────────────────────
  generateQuote(req: QuoteRequestDTO): Observable<QuoteDTO> {
    return this.http.post<QuoteDTO>(`${this.BASE}/underwriting/quote`, req);
  }

  // ─── Policy ─────────────────────────────
  purchasePolicy(quoteId: string, userId: string, tenureYears?: number): Observable<PolicyDTO> {
    const payload: any = { quoteId, userId };
    if (tenureYears) {
      payload.tenureYears = tenureYears;
    }
    return this.http.post<PolicyDTO>(`${this.BASE}/policies/purchase`, payload);
  }

  getPolicyById(policyId: string): Observable<PolicyDTO> {
    return this.http.get<PolicyDTO>(`${this.BASE}/policies/${policyId}`);
  }

  getPoliciesByUser(userId: string): Observable<PolicyDTO[]> {
    return this.http.get<PolicyDTO[]>(`${this.BASE}/policies/user/${userId}`);
  }

  getAllPolicies(): Observable<PolicyDTO[]> {
    return this.http.get<PolicyDTO[]>(`${this.BASE}/policies/all`);
  }

  reUnderwrite(portfolioId: string): Observable<any> {
    return this.http.post(`${this.BASE}/policies/re-underwrite/portfolio/${portfolioId}`, {});
  }

  getPendingEndorsements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/policies/pending-endorsements`);
  }

  acceptEndorsement(policyId: string, trancheId: string): Observable<PolicyDTO> {
    return this.http.post<PolicyDTO>(`${this.BASE}/policies/${policyId}/endorsements/${trancheId}/accept`, {});
  }

  rejectEndorsement(policyId: string, trancheId: string): Observable<PolicyDTO> {
    return this.http.post<PolicyDTO>(`${this.BASE}/policies/${policyId}/endorsements/${trancheId}/reject`, {});
  }

  // ─── Claims ─────────────────────────────
  submitClaim(submission: ClaimSubmissionDTO): Observable<ClaimDTO> {
    return this.http.post<ClaimDTO>(`${this.BASE}/claims`, submission);
  }

  getPendingClaims(): Observable<ClaimDTO[]> {
    return this.http.get<ClaimDTO[]>(`${this.BASE}/claims/pending`);
  }

  approveClaim(claimId: string): Observable<any> {
    return this.http.post(`${this.BASE}/claims/${claimId}/approve`, {});
  }

  rejectClaim(claimId: string, rejectionReason?: string): Observable<any> {
    return this.http.post(`${this.BASE}/claims/${claimId}/reject`, { rejectionReason });
  }

  processCrash(data: any): Observable<any> {
    return this.http.post(`${this.BASE}/claims/process-crash`, data);
  }

  getClaimsByUser(userId: string): Observable<ClaimDTO[]> {
    return this.http.get<ClaimDTO[]>(`${this.BASE}/claims/user/${userId}`);
  }

  getAllClaims(): Observable<ClaimDTO[]> {
    return this.http.get<ClaimDTO[]>(`${this.BASE}/claims/all`);
  }

  // ─── Payments ───────────────────────────
  getUserTransactions(userId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE}/payments/user`);
  }

  processPayment(req: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/payments/process`, req);
  }

  payPremium(policyId: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/payments/pay-premium/${policyId}`, {});
  }

  // ─── Audit ──────────────────────────────
  logAudit(log: any): Observable<any> {
    return this.http.post(`${this.BASE}/audit/log`, log);
  }

  // ─── Merchant Risk Engine Endpoints ──────
  getVelocityRatios(merchantId: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/velocity/merchants/${merchantId}/ratios`);
  }

  ingestTelemetry(telemetry: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/velocity/ingest`, telemetry);
  }

  onboardRiskProfile(profile: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/underwriting/profiles`, profile);
  }

  lockTranche(req: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/underwriting/tranches/lock`, req);
  }

  drawdownTranchesFifo(req: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/underwriting/tranches/drawdown-fifo`, req);
  }

  releaseMaturedTranches(asOfDate?: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/underwriting/tranches/release-matured`, { asOfDate });
  }

  captureSettlement(req: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/ledger/captures`, req);
  }

  ingestDispute(req: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/disputes/ingest`, req);
  }

  arbitrateDispute(disputeId: string, outcome: string, notes?: string): Observable<any> {
    return this.http.post<any>(`${this.BASE}/disputes/${disputeId}/arbitrate`, { outcome, notes });
  }

  getTrialBalance(merchantId: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/ledger/merchants/${merchantId}/trial-balance`);
  }

  getPortfolioVampHealth(region?: string, month?: string): Observable<any> {
    const params: any = {};
    if (region) params.region = region;
    if (month) params.month = month;
    return this.http.get<any>(`${this.BASE}/ops/portfolio/vamp-health`, { params });
  }

  getEcpStatus(merchantId: string): Observable<any> {
    return this.http.get<any>(`${this.BASE}/ops/merchants/${merchantId}/ecp-status`);
  }

  recordOpsOverride(merchantId: string, override: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/ops/merchants/${merchantId}/override`, override);
  }
}
