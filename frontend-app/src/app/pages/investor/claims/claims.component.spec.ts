import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClaimsComponent } from './claims.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { of } from 'rxjs';

describe('ClaimsComponent', () => {
  let component: ClaimsComponent;
  let fixture: ComponentFixture<ClaimsComponent>;
  let apiServiceMock: any;
  let authServiceMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      getPoliciesByUser: jasmine.createSpy('getPoliciesByUser').and.returnValue(of([])),
      getClaimsByUser: jasmine.createSpy('getClaimsByUser').and.returnValue(of([])),
      submitClaim: jasmine.createSpy('submitClaim').and.returnValue(of({}))
    };

    authServiceMock = {
      userId: jasmine.createSpy('userId').and.returnValue('user-123')
    };

    await TestBed.configureTestingModule({
      imports: [ClaimsComponent, ReactiveFormsModule],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), 
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load policies and claims on init', () => {
    expect(authServiceMock.userId).toHaveBeenCalled();
    expect(apiServiceMock.getPoliciesByUser).toHaveBeenCalledWith('user-123');
    expect(apiServiceMock.getClaimsByUser).toHaveBeenCalledWith('user-123');
  });

  it('should calculate loss percentage correctly', () => {
    const claim1 = { baselineValue: 1000, currentValue: 500 };
    expect(component.getLossPercentage(claim1)).toBe(50);
    
    const claim2 = { baselineValue: 1000, currentValue: 1000 };
    expect(component.getLossPercentage(claim2)).toBe(0);

    const claim3 = { baselineValue: 1000, currentValue: 1200 };
    expect(component.getLossPercentage(claim3)).toBe(0);
  });

  it('should get correct claim badge class', () => {
    expect(component.getClaimBadge('APPROVED')).toBe('badge-success');
    expect(component.getClaimBadge('REJECTED')).toBe('badge-danger');
    expect(component.getClaimBadge('SUBMITTED')).toBe('badge-warning');
    expect(component.getClaimBadge('UNKNOWN')).toBe('badge-primary');
  });
});

