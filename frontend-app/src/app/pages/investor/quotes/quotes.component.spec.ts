import { ComponentFixture, TestBed } from '@angular/core/testing';
import { QuotesComponent } from './quotes.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('QuotesComponent', () => {
  let component: QuotesComponent;
  let fixture: ComponentFixture<QuotesComponent>;
  let mockApi: any;
  let mockAuth: any;
  let mockNotif: any;
  let mockQueue: any;

  beforeEach(async () => {
    mockApi = {
      getPortfoliosByUser: jasmine.createSpy('getPortfoliosByUser').and.returnValue(of([{ id: 'port1', portfolioName: 'Port 1', totalValue: 100000 }])),
      getPoliciesByUser: jasmine.createSpy('getPoliciesByUser').and.returnValue(of([])),
      generateQuote: jasmine.createSpy('generateQuote').and.returnValue(of({ quoteId: 'q1', riskScore: 500, portfolioValue: 100000 })),
      purchasePolicy: jasmine.createSpy('purchasePolicy').and.returnValue(of({}))
    };

    mockAuth = {
      userId: jasmine.createSpy('userId').and.returnValue('u1'),
      email: jasmine.createSpy('email').and.returnValue('u1@test.com'),
      user: jasmine.createSpy('user').and.returnValue({ fullName: 'User One' })
    };

    mockNotif = {
      addToast: jasmine.createSpy('addToast')
    };

    mockQueue = {
      submitApplication: jasmine.createSpy('submitApplication').and.returnValue({ applicationId: 'app1', riskScore: 800, riskTier: 'HIGH' })
    };

    await TestBed.configureTestingModule({
      imports: [QuotesComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: NotificationService, useValue: mockNotif },
        { provide: UnderwritingQueueService, useValue: mockQueue }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuotesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load portfolios', () => {
    expect(component).toBeTruthy();
    expect(mockApi.getPortfoliosByUser).toHaveBeenCalledWith('u1');
    expect(component.portfolios().length).toBe(1);
  });

  describe('Quote Generation', () => {
    it('should generate quote if no existing policy', () => {
      component.quotesForm.patchValue({ selectedPortfolioId: 'port1' });
      component.generateQuote();
      expect(mockApi.getPoliciesByUser).toHaveBeenCalledWith('u1');
      expect(mockApi.generateQuote).toHaveBeenCalled();
      expect(component.quote()?.quoteId).toBe('q1');
    });

    it('should show existing policy modal if policy exists', () => {
      mockApi.getPoliciesByUser.and.returnValue(of([{ portfolioId: 'port1', policyId: 'p1' }]));
      component.quotesForm.patchValue({ selectedPortfolioId: 'port1' });
      component.generateQuote();
      expect(component.existingPolicyModal()?.policyId).toBe('p1');
      expect(mockApi.generateQuote).not.toHaveBeenCalled();
    });

    it('should fallback to generate quote if getPolicies fails', () => {
      mockApi.getPoliciesByUser.and.returnValue(throwError(() => new Error()));
      component.quotesForm.patchValue({ selectedPortfolioId: 'port1' });
      component.generateQuote();
      expect(mockApi.generateQuote).toHaveBeenCalled();
    });

    it('should handle generate quote error', () => {
      mockApi.generateQuote.and.returnValue(throwError(() => ({ error: { message: 'err' } })));
      component.quotesForm.patchValue({ selectedPortfolioId: 'port1' });
      component.generateQuote();
      expect(mockNotif.addToast).toHaveBeenCalledWith('Quote Error', 'err', 'ERROR');
    });
  });

  describe('Purchasing and Underwriting', () => {
    beforeEach(() => {
      component.quotesForm.patchValue({ selectedPortfolioId: 'port1', termsAccepted: true });
    });

    it('should route high risk to underwriter', () => {
      component.quote.set({ quoteId: 'q2', riskScore: 800 } as any);
      component.initiatePurchase();
      expect(mockQueue.submitApplication).toHaveBeenCalled();
      expect(component.submittedApplication()?.applicationId).toBe('app1');
    });

    it('should open payment modal for normal risk', () => {
      component.quote.set({ quoteId: 'q3', riskScore: 400 } as any);
      component.initiatePurchase();
      expect(component.showPaymentModal()).toBeTrue();
    });

    it('should handle payment success', () => {
      component.quote.set({ quoteId: 'q3', riskScore: 400 } as any);
      component.onPaymentSuccess({});
      expect(mockApi.purchasePolicy).toHaveBeenCalledWith('q3', 'u1', 5);
      expect(component.purchaseSuccess()).toBeTrue();
    });

    it('should handle payment cancel', () => {
      component.showPaymentModal.set(true);
      component.onPaymentCancel();
      expect(component.showPaymentModal()).toBeFalse();
    });

    it('should not purchase if terms not accepted', () => {
      component.quotesForm.patchValue({ termsAccepted: false });
      component.quote.set({ quoteId: 'q3', riskScore: 400 } as any);
      component.purchasePolicy();
      expect(mockApi.purchasePolicy).not.toHaveBeenCalled();
    });
  });

  describe('Helpers and Logic', () => {
    it('should get tenure and waiting years', () => {
      component.quotesForm.patchValue({ selectedTenure: 10 });
      expect(component.getTenureYears()).toBe(10);
      expect(component.getWaitingPeriodYears()).toBe(4);
      expect(component.getWaitingPeriodYears(5)).toBe(2);
    });

    it('should get risk tier and color', () => {
      expect(component.getRiskTier(250)).toBeTruthy();
      expect(component.getRiskColor(300)).toBe('text-info-400');
      expect(component.getRiskColor(800)).toBe('text-danger-400');
      expect(component.isActiveTier(component.riskMatrix[0], 150)).toBeTrue();
    });

    it('should calculate insured sum and annual premium', () => {
      expect(component.getInsuredSumCap({ insuredValue: 100 } as any)).toBe(100);
      expect(component.getInsuredSumCap({ coverageAmount: 200 } as any)).toBe(200);
      expect(component.getInsuredSumCap({ portfolioValue: 1000, coveragePercentage: 50 } as any)).toBe(500);

      expect(component.getAnnualPremium({ annualPremium: 50 } as any)).toBe(50);
      expect(component.getAnnualPremium({ portfolioValue: 1000, premiumPercentage: 2.5 } as any)).toBe(25);
    });
  });
});
