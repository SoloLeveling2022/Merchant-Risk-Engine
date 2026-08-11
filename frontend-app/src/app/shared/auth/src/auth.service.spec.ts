import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    service.clearStorage();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login and set role', () => {
    service.login({ token: 'abc', role: 'ROLE_INVESTOR' } as any);
    expect(service.isLoggedIn()).toBeTrue();
    expect(service.userRole()).toBe('ROLE_INVESTOR');
    expect(service.getToken()).toBe('abc');
  });

  it('should handle different roles from email', () => {
    service.login({ token: 'abc', email: 'admin@test.com' } as any);
    expect(service.userRole()).toBe('ROLE_ADMIN');

    service.login({ token: 'abc', email: 'underwriter@test.com' } as any);
    expect(service.userRole()).toBe('ROLE_UNDERWRITER');
  });

  it('should logout', () => {
    service.login({ token: 'abc' } as any);
    // Just fake router navigation
    (service as any).router = { navigate: jasmine.createSpy('navigate') };
    service.logout();
    expect(service.isLoggedIn()).toBeFalse();
    expect(service.getToken()).toBe('demo-jwt-token-123456');
  });

  it('should update kyc status', () => {
    service.login({ token: 'abc' } as any);
    service.updateKycStatus('VERIFIED');
    expect(service.kycStatus()).toBe('VERIFIED');
    expect(service.isKycApproved()).toBeTrue();
  });

  it('should compute signals correctly', () => {
    service.login({ token: 'tok', email: 'test@a.com', userId: 'u123', kycStatus: 'PENDING' } as any);
    expect(service.userId()).toBe('u123');
    expect(service.email()).toBe('test@a.com');
    expect(service.isKycApproved()).toBeFalse();
  });

  it('should handle more roles from email', () => {
    service.login({ token: 'abc', email: 'claims@test.com' } as any);
    expect(service.userRole()).toBe('ROLE_CLAIMS_ANALYST');
    service.login({ token: 'abc', email: 'compliance@test.com' } as any);
    expect(service.userRole()).toBe('ROLE_COMPLIANCE');
  });

  it('should use overrideRole', () => {
    service.login({ token: 'abc' } as any, 'ROLE_ADMIN');
    expect(service.userRole()).toBe('ROLE_ADMIN');
  });

  it('should get token from user object if direct token missing', () => {
    localStorage.removeItem('auth_token');
    localStorage.setItem('auth_user', JSON.stringify({ token: 'saved-token' }));
    expect(service.getToken()).toBe('saved-token');
  });

  it('should handle broken json in getToken', () => {
    localStorage.removeItem('auth_token');
    localStorage.setItem('auth_user', '{ broken json');
    expect(service.getToken()).toBe('demo-jwt-token-123456');
  });

  it('should handle expired session in loadUser', () => {
    localStorage.setItem('auth_user', JSON.stringify({ token: 'abc', loginTimestamp: Date.now() - 4 * 24 * 60 * 60 * 1000 }));
    const result = (service as any).loadUser();
    expect(result).toBeNull();
    expect(localStorage.getItem('auth_user')).toBeNull();
  });

  it('should loadUser with roles', () => {
    localStorage.setItem('auth_user', JSON.stringify({ token: 'abc', email: 'admin@test.com' }));
    const result = (service as any).loadUser();
    expect(result.role).toBe('ROLE_ADMIN');

    localStorage.setItem('auth_user', JSON.stringify({ token: 'abc', email: 'claims@test.com' }));
    expect((service as any).loadUser().role).toBe('ROLE_CLAIMS_ANALYST');

    localStorage.setItem('auth_user', JSON.stringify({ token: 'abc', email: 'compliance@test.com' }));
    expect((service as any).loadUser().role).toBe('ROLE_COMPLIANCE');

    localStorage.setItem('auth_user', JSON.stringify({ token: 'abc', email: 'underwriter@test.com' }));
    expect((service as any).loadUser().role).toBe('ROLE_UNDERWRITER');
  });

  it('should handle broken json in loadUser', () => {
    localStorage.setItem('auth_user', 'broken');
    expect((service as any).loadUser()).toBeNull();
  });

  it('should handle login fallbacks for roles, token, and userId', () => {
    // 1. Data wrapper, accessToken, id, roles array
    service.login({
      data: {
        accessToken: 'access-123',
        id: 'user-id-123',
        roles: ['ROLE_ADMIN']
      }
    } as any);
    expect(service.getToken()).toBe('access-123');
    expect(service.userId()).toBe('user-id-123');
    expect(service.userRole()).toBe('ROLE_ADMIN');

    // 2. No token or id provided at all, should use fallback defaults
    service.login({} as any);
    expect(service.getToken()).toBe('demo-jwt-token-123456');
    expect(service.userId()).toBe('usr-investor-001');
    expect(service.userRole()).toBe('ROLE_INVESTOR');

    // 3. Flat rawResponse with accessToken and id
    service.login({ accessToken: 'access-flat', id: 'id-flat' } as any);
    expect(service.getToken()).toBe('access-flat');
    expect(service.userId()).toBe('id-flat');
  });

  it('should handle loadUser fallbacks', () => {
    // Empty parsed JSON
    localStorage.setItem('auth_user', JSON.stringify({}));
    let loaded = (service as any).loadUser();
    expect(loaded.token).toBe('demo-jwt-token-123456');
    expect(loaded.userId).toBe('usr-investor-001');
    expect(loaded.role).toBe('ROLE_INVESTOR');

    // accessToken, id, and roles array
    localStorage.setItem('auth_user', JSON.stringify({ accessToken: 'loaded-acc', id: 'loaded-id', roles: ['ROLE_ADMIN'] }));
    loaded = (service as any).loadUser();
    expect(loaded.token).toBe('loaded-acc');
    expect(loaded.userId).toBe('loaded-id');
    expect(loaded.role).toBe('ROLE_ADMIN');

    // Test rawResponse fallbacks
    localStorage.setItem('auth_user', JSON.stringify({ data: null, token: 'raw-token', userId: 'raw-userid' }));
    loaded = (service as any).loadUser();
    expect(loaded.token).toBe('raw-token');
    expect(loaded.userId).toBe('raw-userid');
  });

  it('should hit every token and userId OR fallback in login', () => {
    // rawResponse.token
    service.login({ data: null, token: 'raw-tok' } as any);
    expect(service.getToken()).toBe('raw-tok');

    // rawResponse.accessToken
    service.login({ data: null, accessToken: 'raw-acc-tok' } as any);
    expect(service.getToken()).toBe('raw-acc-tok');

    // rawResponse.userId
    service.login({ data: null, userId: 'raw-uid' } as any);
    expect(service.userId()).toBe('raw-uid');

    // rawResponse.id
    service.login({ data: null, id: 'raw-id' } as any);
    expect(service.userId()).toBe('raw-id');
  });

});
