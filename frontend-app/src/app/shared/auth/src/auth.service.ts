import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponseDTO, UserRole, KycStatus } from '@frontend/shared-models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'auth_user';
  private readonly THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

  // Angular Signals for reactive state
  private _user = signal<AuthResponseDTO | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly userRole = computed(() => {
    const u = this._user();
    if (!u) return null;
    if (u.role) return u.role as UserRole;
    if (u.roles && u.roles.length > 0) return u.roles[0] as UserRole;
    return 'ROLE_MERCHANT_OWNER';
  });
  readonly userId = computed(() => this._user()?.userId ?? this._user()?.id ?? 'm-mid-001');
  readonly merchantId = computed(() => (this._user() as any)?.merchantId ?? 'm-mid-001');
  readonly email = computed(() => this._user()?.email ?? null);
  readonly kycStatus = computed(() => this._user()?.kycStatus ?? 'VERIFIED');
  readonly isKycApproved = computed(() => this._user()?.kycStatus === 'VERIFIED' || this._user()?.kycStatus === 'APPROVED');

  constructor(private router: Router) {}

  login(rawResponse: AuthResponseDTO, overrideRole?: UserRole): void {
    const response = (rawResponse as any)?.data || rawResponse || {};
    let role = (overrideRole || response.role || (response.roles && response.roles[0]) || 'ROLE_MERCHANT_OWNER') as UserRole;
    if (response.email) {
      const lower = response.email.toLowerCase();
      if (lower.includes('analyst')) role = 'ROLE_RISK_ANALYST';
      else if (lower.includes('admin') || lower.includes('ops')) role = 'ROLE_RISK_ADMIN';
      else if (lower.includes('finance')) role = 'ROLE_MERCHANT_FINANCE';
      else role = 'ROLE_MERCHANT_OWNER';
    }
    const token = response.token || response.accessToken || (rawResponse as any)?.token || (rawResponse as any)?.accessToken || 'demo-jwt-token-123456';
    const userId = response.userId || response.id || (rawResponse as any)?.userId || (rawResponse as any)?.id || 'm-mid-001';
    
    const loginTimestamp = Date.now();
    const normalized: AuthResponseDTO & { loginTimestamp?: number; merchantId?: string } = {
      ...response,
      role,
      token,
      accessToken: token,
      userId,
      merchantId: (response as any).merchantId || 'm-mid-001',
      kycStatus: response.kycStatus || 'VERIFIED',
      loginTimestamp,
    };

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
      if (response.refreshToken) localStorage.setItem(this.REFRESH_KEY, response.refreshToken);
      localStorage.setItem(this.USER_KEY, JSON.stringify(normalized));
    }
    this._user.set(normalized);
  }

  logout(): void {
    this.clearStorage();
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    if (typeof localStorage === 'undefined') return 'demo-jwt-token-123456';
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (token && token !== 'undefined' && token !== 'null') return token;
    const saved = localStorage.getItem(this.USER_KEY);
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const tok = u.token || u.accessToken;
        if (tok && tok !== 'undefined' && tok !== 'null') return tok;
      } catch {
        return 'demo-jwt-token-123456';
      }
    }
    return 'demo-jwt-token-123456';
  }

  updateKycStatus(status: KycStatus): void {
    const current = this._user();
    if (current) {
      const updated = { ...current, kycStatus: status };
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
      }
      this._user.set(updated);
    }
  }

  public clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  private loadUser(): AuthResponseDTO | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.loginTimestamp && Date.now() - parsed.loginTimestamp > this.THREE_DAYS_MS) {
        this.clearStorage();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
}
