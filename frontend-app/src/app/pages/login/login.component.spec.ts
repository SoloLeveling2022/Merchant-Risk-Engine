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
      login: jasmine.createSpy('login').and.returnValue(of({ role: 'ROLE_MERCHANT_OWNER', token: 'fake-token' }))
    };

    authServiceMock = {
      isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
      userRole: jasmine.createSpy('userRole').and.returnValue(null),
      login: jasmine.createSpy('login')
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
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
    authServiceMock.userRole.and.returnValue('ROLE_RISK_ANALYST');
    component.ngOnInit();
    expect(router.navigate).toHaveBeenCalledWith(['/risk-ops/control-tower']);
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
    component.loginForm.patchValue({ email: 'merchant@acme-corp.com', password: 'password123' });
    component.onLogin();
    
    expect(apiServiceMock.login).toHaveBeenCalledWith({ email: 'merchant@acme-corp.com', password: 'password123' });
    expect(authServiceMock.login).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/merchant/dashboard']);
  });

  it('should quickLogin and navigate based on roles', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_RISK_ADMIN', token: 'fake-token' }));
    component.quickLogin('admin@riskops.com', 'admin');
    expect(apiServiceMock.login).toHaveBeenCalledWith({ email: 'admin@riskops.com', password: 'admin' });
    expect(router.navigate).toHaveBeenCalledWith(['/risk-ops/control-tower']);
  });

  it('should navigateByRole correctly for risk analyst', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_RISK_ANALYST', token: 'fake-token' }));
    component.quickLogin('analyst@riskops.com', 'analyst');
    expect(router.navigate).toHaveBeenCalledWith(['/risk-ops/control-tower']);
  });

  it('should fallback to merchant dashboard on unknown or default role', () => {
    apiServiceMock.login.and.returnValue(of({ role: 'ROLE_UNKNOWN', token: 'fake-token' }));
    component.quickLogin('un@test.com', 'un');
    expect(router.navigate).toHaveBeenCalledWith(['/merchant/dashboard']);
  });
});
