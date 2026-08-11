import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const BASE = '/api/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── Auth ────────────────────────────────
  it('should call login', () => {
    service.login({} as any).subscribe(res => expect(res).toEqual({ token: '123' } as any));
    const req = httpMock.expectOne(`${BASE}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { token: '123' } });
  });

  it('should call register', () => {
    service.register({} as any).subscribe(res => expect(res).toEqual({ token: 'abc' } as any));
    const req = httpMock.expectOne(`${BASE}/auth/register`);
    expect(req.request.method).toBe('POST');
    req.flush({ data: { token: 'abc' } });
  });

  it('should call refreshToken', () => {
    service.refreshToken('old').subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/refresh`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call seedUsers', () => {
    service.seedUsers().subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/seed-users`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call getAllUsers', () => {
    service.getAllUsers().subscribe(res => expect(res).toEqual([]));
    const req = httpMock.expectOne(`${BASE}/auth/users`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [] });
  });

  // ─── KYC ─────────────────────────────────
  it('should call submitKyc', () => {
    service.submitKyc({} as any).subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/kyc/submit`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call getKycStatus', () => {
    service.getKycStatus('u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/kyc/status?userId=u1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getPendingKyc', () => {
    service.getPendingKyc().subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/kyc/pending`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getAllKycApplications', () => {
    service.getAllKycApplications().subscribe(res => expect(res).toEqual([]));
    const req = httpMock.expectOne(`${BASE}/auth/kyc/all`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: [] });
  });

  it('should call approveKyc', () => {
    service.approveKyc('u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/kyc/approve/u1`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call rejectKyc', () => {
    service.rejectKyc('u1', 'reason').subscribe();
    const req = httpMock.expectOne(`${BASE}/auth/kyc/reject/u1`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'reason' });
    req.flush({});
  });

  // ─── Portfolio ───────────────────────────
  it('should call getPortfoliosByUser', () => {
    service.getPortfoliosByUser('u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/user/u1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getPortfolioById', () => {
    service.getPortfolioById('p1').subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/p1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getPortfolioHoldings', () => {
    service.getPortfolioHoldings('p1').subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/p1/holdings`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getAllPortfolios', () => {
    service.getAllPortfolios().subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/all`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call uploadManualPortfolio', () => {
    service.uploadManualPortfolio({} as any).subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/upload/manual`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call uploadCsvPortfolio', () => {
    const file = new File([''], 'filename');
    service.uploadCsvPortfolio('u1', 'My Port', file).subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/u1/My%20Port/import/csv`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call updateHoldings', () => {
    service.updateHoldings('p1', []).subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/p1/holdings`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should call updatePortfolio', () => {
    service.updatePortfolio('p1', {}).subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/p1`);
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should call simulateMarket', () => {
    service.simulateMarket('p1').subscribe();
    const req = httpMock.expectOne(`${BASE}/portfolios/p1/simulate-market`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── Underwriting ───────────────────────
  it('should call generateQuote', () => {
    service.generateQuote({} as any).subscribe();
    const req = httpMock.expectOne(`${BASE}/underwriting/quote`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── Policy ─────────────────────────────
  it('should call purchasePolicy', () => {
    service.purchasePolicy('q1', 'u1', 5).subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/purchase`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ quoteId: 'q1', userId: 'u1', tenureYears: 5 });
    req.flush({});
  });

  it('should call purchasePolicy without tenure', () => {
    service.purchasePolicy('q1', 'u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/purchase`);
    expect(req.request.body).toEqual({ quoteId: 'q1', userId: 'u1' });
    req.flush({});
  });

  it('should call getPolicyById', () => {
    service.getPolicyById('p1').subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/p1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getPoliciesByUser', () => {
    service.getPoliciesByUser('u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/user/u1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getAllPolicies', () => {
    service.getAllPolicies().subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/all`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call reUnderwrite', () => {
    service.reUnderwrite('p1').subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/re-underwrite/portfolio/p1`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call getPendingEndorsements', () => {
    service.getPendingEndorsements().subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/pending-endorsements`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call acceptEndorsement', () => {
    service.acceptEndorsement('p1', 't1').subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/p1/endorsements/t1/accept`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call rejectEndorsement', () => {
    service.rejectEndorsement('p1', 't1').subscribe();
    const req = httpMock.expectOne(`${BASE}/policies/p1/endorsements/t1/reject`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── Claims ─────────────────────────────
  it('should call submitClaim', () => {
    service.submitClaim({} as any).subscribe();
    const req = httpMock.expectOne(`${BASE}/claims`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call getPendingClaims', () => {
    service.getPendingClaims().subscribe();
    const req = httpMock.expectOne(`${BASE}/claims/pending`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call approveClaim', () => {
    service.approveClaim('c1').subscribe();
    const req = httpMock.expectOne(`${BASE}/claims/c1/approve`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call rejectClaim', () => {
    service.rejectClaim('c1', 'reason').subscribe();
    const req = httpMock.expectOne(`${BASE}/claims/c1/reject`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ rejectionReason: 'reason' });
    req.flush({});
  });

  it('should call processCrash', () => {
    service.processCrash({}).subscribe();
    const req = httpMock.expectOne(`${BASE}/claims/process-crash`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call getClaimsByUser', () => {
    service.getClaimsByUser('u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/claims/user/u1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getAllClaims', () => {
    service.getAllClaims().subscribe();
    const req = httpMock.expectOne(`${BASE}/claims/all`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  // ─── Payments ───────────────────────────
  it('should call getUserTransactions', () => {
    service.getUserTransactions('u1').subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/user`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call processPayment', () => {
    service.processPayment({}).subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/process`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('should call payPremium', () => {
    service.payPremium('p1').subscribe();
    const req = httpMock.expectOne(`${BASE}/payments/pay-premium/p1`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── Audit ──────────────────────────────
  it('should call logAudit', () => {
    service.logAudit({}).subscribe();
    const req = httpMock.expectOne(`${BASE}/audit/log`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  // ─── Extra Branch Coverage (res?.data || res) ───
  it('should handle login response without data property', () => {
    service.login({} as any).subscribe(res => expect(res).toEqual({ token: 'fallback' } as any));
    httpMock.expectOne(`${BASE}/auth/login`).flush({ token: 'fallback' });
  });

  it('should handle register response without data property', () => {
    service.register({} as any).subscribe(res => expect(res).toEqual({ token: 'fallback' } as any));
    httpMock.expectOne(`${BASE}/auth/register`).flush({ token: 'fallback' });
  });

  it('should handle getAllUsers response without data property', () => {
    service.getAllUsers().subscribe(res => expect(res).toEqual([{ id: '1' } as any]));
    httpMock.expectOne(`${BASE}/auth/users`).flush([{ id: '1' }]);
  });

  it('should handle getAllKycApplications response without data property', () => {
    service.getAllKycApplications().subscribe(res => expect(res).toEqual([{ id: 'kyc1' } as any]));
    httpMock.expectOne(`${BASE}/auth/kyc/all`).flush([{ id: 'kyc1' }]);
  });
});
