import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoginComponent } from './login.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let apiServiceMock: any;
  let authServiceMock: any;
  let router: Router;
  beforeEach(async () => {
    apiServiceMock = {
      login: jasmine.createSpy('login').and.returnValue(of({ role: 'ROLE_INVESTOR', token: 'fake-token' }))
    };

    authServiceMock = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
      userRole: jasmine.createSpy('userRole').and.returnValue(null),
      login: jasmine.createSpy('login')
    };


    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), 
        provideRouter([]),
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  it('should redirect if already logged in', () => {
    authServiceMock.isLoggedIn.and.returnValue(true);
    authServiceMock.userRole.and.returnValue('ROLE_UNDERWRITER');
    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/underwriter/dashboard']);
  });

  it('should initialize form with empty email and password', () => {
    expect(component.loginForm.value).toEqual({ email: '', password: '' });
  });

  it('should not call login API if form is invalid', () => {
    component.onLogin();
    expect(apiServiceMock.login).not.toHaveBeenCalled();
    expect(component.loginForm.touched).toBeTrue();
  });

  it('should call login API when form is valid', () => {
    component.loginForm.patchValue({ email: 'test@example.com', password: 'password123' });
    component.onLogin();
    
    expect(apiServiceMock.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
    expect(authServiceMock.login).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/investor/dashboard']);
  });

  it('should show error message on login failure (nested)', () => {
    apiServiceMock.login.and.returnValue(throwError(() => ({ error: { error: { message: 'Nested error' } } })));
    component.loginForm.patchValue({ email: 'test@example.com', password: 'wrong' });
    component.onLogin();
    expect(component.error()).toBe('Nested error');
  });

  it('should show default error message on login failure (no error body)', () => {
    apiServiceMock.login.and.returnValue(throwError(() => ({})));
    component.loginForm.patchValue({ email: 'test@example.com', password: 'wrong' });
    component.onLogin();
    expect(component.error()).toBe('Login failed. Please check your credentials.');
  });

  it('should redirect in ngOnInit if already logged in', () => {
    authServiceMock.isLoggedIn.and.returnValue(true);
    authServiceMock.userRole.and.returnValue('ROLE_ADMIN');
    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/underwriter/dashboard']);
  });

  it('should quickLogin and navigate based on roles', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_ADMIN', token: 'fake-token' }));
    component.quickLogin('admin@test.com', 'admin');
    expect(apiServiceMock.login).toHaveBeenCalledWith({ email: 'admin@test.com', password: 'admin' });
    expect(router.navigate).toHaveBeenCalledWith(['/underwriter/dashboard']);
  });

  it('should navigateByRole correctly for claims analyst', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_CLAIMS_ANALYST', token: 'fake-token' }));
    component.quickLogin('claims@test.com', 'claims');
    expect(router.navigate).toHaveBeenCalledWith(['/claims-analyst/dashboard']);
  });

  it('should navigateByRole correctly for compliance', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_COMPLIANCE', token: 'fake-token' }));
    component.quickLogin('comp@test.com', 'comp');
    expect(router.navigate).toHaveBeenCalledWith(['/compliance/kyc']);
  });

  it('should fallback to investor dashboard on unknown role', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_UNKNOWN', token: 'fake-token' }));
    component.quickLogin('un@test.com', 'un');
    expect(router.navigate).toHaveBeenCalledWith(['/investor/dashboard']);
  });

  it('should handle role from roles array', () => {
    apiServiceMock.login.and.returnValue(of({ roles: ['ROLE_ADMIN'], token: 'fake-token' }));
    component.quickLogin('admin@test.com', 'admin');
    expect(router.navigate).toHaveBeenCalledWith(['/underwriter/dashboard']);
  });

  it('should fallback to ROLE_INVESTOR if no role provided', () => {
    apiServiceMock.login.and.returnValue(of({ token: 'fake-token' }));
    component.quickLogin('inv@test.com', 'inv');
    expect(router.navigate).toHaveBeenCalledWith(['/investor/dashboard']);
  });
});

