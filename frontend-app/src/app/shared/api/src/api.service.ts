import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  LoginRequestDTO,
  RegisterRequestDTO,
  AuthResponseDTO,
  UserDTO,
  SchemeRatioReportDTO,
  ReservePolicyDTO,
  ReserveTrancheDTO,
  DisputeCaseDTO,
  TrialBalanceReportDTO,
  ControlTowerAlertDTO
} from '../../models/src/index';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE = '/api/v1';

  constructor(private http: HttpClient) {}

  // ─── 1. Auth & Merchant Identity Service (Port 8084) ───
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

  registerMerchantKYB(payload: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/auth/merchants/onboard-kyb`, payload);
  }

  getAllUsers(): Observable<UserDTO[]> {
    return this.http.get<any>(`${this.BASE}/auth/users`).pipe(
      map((res: any) => res?.data || res || [])
    );
  }

  getJwks(): Observable<any> {
    return this.http.get<any>(`${this.BASE}/auth/jwks.json`);
  }

  getKycStatus(userId: string): Observable<any> {
    return this.http.get(`${this.BASE}/auth/kyc/status`, { params: { userId } });
  }

  // ─── 2. Merchant Velocity Service (Port 8081) ─────────
  getVelocityRatios(merchantId: string): Observable<SchemeRatioReportDTO> {
    return this.http.get<SchemeRatioReportDTO>(`${this.BASE}/velocity/merchants/${merchantId}/ratios`);
  }

  getSchemeRatios(merchantId: string): Observable<SchemeRatioReportDTO> {
    return this.getVelocityRatios(merchantId);
  }

  ingestTelemetry(telemetry: any): Observable<any> {
    return this.http.post<any>(`${this.BASE}/velocity/ingest`, telemetry);
  }

  // ─── 3. Reserve Underwriting Service (Port 8082) ──────
  getReservePolicy(merchantId: string): Observable<ReservePolicyDTO> {
    return this.http.get<ReservePolicyDTO>(`${this.BASE}/underwriting/merchants/${merchantId}/policy`);
  }

  getReserveTranches(merchantId: string): Observable<ReserveTrancheDTO[]> {
    return this.http.get<ReserveTrancheDTO[]>(`${this.BASE}/underwriting/merchants/${merchantId}/tranches`);
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

  // ─── 4. Dispute Settlement Service (Port 8083) ────────
  getDisputes(merchantId: string): Observable<DisputeCaseDTO[]> {
    return this.http.get<DisputeCaseDTO[]>(`${this.BASE}/disputes/merchants/${merchantId}`);
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

  getTrialBalance(merchantId: string): Observable<TrialBalanceReportDTO> {
    return this.http.get<TrialBalanceReportDTO>(`${this.BASE}/ledger/merchants/${merchantId}/trial-balance`);
  }

  // ─── 5. Platform Ops Service (Port 8085) ──────────────
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

  submitOpsOverride(override: any): Observable<any> {
    return this.recordOpsOverride(override.merchantId, override);
  }

  subscribeToControlTower(): Observable<ControlTowerAlertDTO> {
    return new Observable(observer => {
      if (typeof EventSource === 'undefined') {
        observer.complete();
        return;
      }
      const es = new EventSource(`${this.BASE}/stream/control-tower`);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          observer.next(data);
        } catch (e) {
          // Heartbeat comment or non-json frame
        }
      };
      es.onerror = (err) => {
        observer.error(err);
      };
      return () => {
        es.close();
      };
    });
  }
}
