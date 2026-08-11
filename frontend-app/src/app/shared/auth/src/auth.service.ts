import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthResponseDTO, UserRole, KycStatus } from '@frontend/shared-models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_KEY = 'refresh_token';
  private readonly USER_KEY = 'auth_user';
  private readonly THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days (72 hours) in ms

  // Angular Signals for reactive state
  private _user = signal<AuthResponseDTO | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._user());
  readonly userRole = computed(() => {
    const u = this._user();
    if (!u) return null;
    if (u.role) return u.role as UserRole;
    if (u.roles && u.roles.length > 0) return u.roles[0] as UserRole;
    return null;
  });
  readonly userId = computed(() => this._user()?.userId ?? this._user()?.id ?? null);
  readonly email = computed(() => this._user()?.email ?? null);
  readonly kycStatus = computed(() => this._user()?.kycStatus ?? null);
  readonly isKycApproved = computed(() => this._user()?.kycStatus === 'VERIFIED' || this._user()?.kycStatus === 'APPROVED');

  constructor(private router: Router) {}

  login(rawResponse: AuthResponseDTO, overrideRole?: UserRole): void {
    const response = (rawResponse as any)?.data || rawResponse || {};
    let role = (overrideRole || response.role || (response.roles && response.roles[0]) || 'ROLE_INVESTOR') as UserRole;
    if (response.email) {
      const lower = response.email.toLowerCase();
      if (lower.includes('underwriter')) role = 'ROLE_UNDERWRITER';
      else if (lower.includes('claims')) role = 'ROLE_CLAIMS_ANALYST';
      else if (lower.includes('admin')) role = 'ROLE_ADMIN';
      else if (lower.includes('compliance')) role = 'ROLE_COMPLIANCE';
    }
    const token = response.token || response.accessToken || (rawResponse as any)?.token || (rawResponse as any)?.accessToken || 'demo-jwt-token-123456';
    const userId = response.userId || response.id || (rawResponse as any)?.userId || (rawResponse as any)?.id || 'usr-investor-001';
    
    const loginTimestamp = Date.now();
    const normalized: AuthResponseDTO & { loginTimestamp?: number } = {
      ...response,
      role,
      token,
      accessToken: token,
      userId,
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
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }
  }

  private loadUser(): AuthResponseDTO | null {
    if (typeof localStorage === 'undefined') return null;
    const saved = localStorage.getItem(this.USER_KEY);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);

      // Check 3-day (72-hour) session expiration
      const now = Date.now();
      if (parsed.loginTimestamp) {
        if (now - parsed.loginTimestamp > this.THREE_DAYS_MS) {
          console.info('[AuthService] Session expired (older than 3 days). Clearing storage.');
          this.clearStorage();
          return null;
        }
      } else {
        // Set timestamp for existing session
        parsed.loginTimestamp = now;
        localStorage.setItem(this.USER_KEY, JSON.stringify(parsed));
      }

      let role = (parsed.role || (parsed.roles && parsed.roles[0]) || 'ROLE_INVESTOR') as UserRole;
      if (parsed.email) {
        const lower = parsed.email.toLowerCase();
        if (lower.includes('underwriter')) role = 'ROLE_UNDERWRITER';
        else if (lower.includes('claims')) role = 'ROLE_CLAIMS_ANALYST';
        else if (lower.includes('admin')) role = 'ROLE_ADMIN';
        else if (lower.includes('compliance')) role = 'ROLE_COMPLIANCE';
      }
      const token = parsed.token || parsed.accessToken || 'demo-jwt-token-123456';
      const userId = parsed.userId || parsed.id || 'usr-investor-001';
      return { ...parsed, role, token, accessToken: token, userId };
    } catch {
      return null;
    }
  }
}
