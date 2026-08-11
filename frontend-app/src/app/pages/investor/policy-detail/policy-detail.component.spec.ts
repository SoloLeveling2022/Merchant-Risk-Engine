import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PolicyDetailComponent } from './policy-detail.component';
import { ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError, Subject } from 'rxjs';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('PolicyDetailComponent', () => {
  let component: PolicyDetailComponent;
  let fixture: ComponentFixture<PolicyDetailComponent>;

  let mockApiService: any;
  let mockAuthService: any;
  let mockUnderwritingQueueService: any;
  let mockNotificationService: any;
  let mockActivatedRoute: any;
  let eventsSubject: Subject<any>;

  beforeEach(async () => {
    eventsSubject = new Subject<any>();

    mockApiService = {
      getClaimsByUser: jasmine.createSpy('getClaimsByUser').and.returnValue(of([])),
      getPolicyById: jasmine.createSpy('getPolicyById').and.returnValue(of(null)),
      getPoliciesByUser: jasmine.createSpy('getPoliciesByUser').and.returnValue(of([])),
      getAllPolicies: jasmine.createSpy('getAllPolicies').and.returnValue(of([])),
      acceptEndorsement: jasmine.createSpy('acceptEndorsement').and.returnValue(of({})),
      rejectEndorsement: jasmine.createSpy('rejectEndorsement').and.returnValue(of({}))
    };

    mockAuthService = {
      userId: jasmine.createSpy('userId').and.returnValue('user-1'),
      user: jasmine.createSpy('user').and.returnValue({ fullName: 'John Doe', email: 'john@example.com' }),
      email: jasmine.createSpy('email').and.returnValue('john@example.com'),
      userRole: jasmine.createSpy('userRole').and.returnValue('ROLE_INVESTOR')
    };

    mockUnderwritingQueueService = {
      events$: eventsSubject.asObservable(),
      applications: jasmine.createSpy('applications').and.returnValue([]),
      endorsementReviews: jasmine.createSpy('endorsementReviews').and.returnValue([]),
      isEndorsementApproved: jasmine.createSpy('isEndorsementApproved').and.returnValue(false),
      matchesReview: jasmine.createSpy('matchesReview').and.returnValue(true),
      registerPendingEndorsement: jasmine.createSpy('registerPendingEndorsement'),
      confirmEndorsementReview: jasmine.createSpy('confirmEndorsementReview'),
      clearApproval: jasmine.createSpy('clearApproval')
    };

    mockNotificationService = {
      addToast: jasmine.createSpy('addToast')
    };

    mockActivatedRoute = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('pol-1')
        }
      }
    };

    await TestBed.configureTestingModule({
      imports: [PolicyDetailComponent, ReactiveFormsModule],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UnderwritingQueueService, useValue: mockUnderwritingQueueService },
        { provide: NotificationService, useValue: mockNotificationService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PolicyDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load claims and policy if ids are present', () => {
      const mockPolicy = { policyId: 'pol-1', riskScore: 200 };
      mockApiService.getPolicyById.and.returnValue(of(mockPolicy));
      mockApiService.getClaimsByUser.and.returnValue(of([{ claimId: 'c1' }]));
      
      fixture.detectChanges(); // calls ngOnInit
      
      expect(mockApiService.getClaimsByUser).toHaveBeenCalledWith('user-1');
      expect(mockApiService.getPolicyById).toHaveBeenCalledWith('pol-1');
      expect(component.policy()).toEqual(mockPolicy as any);
      expect(component.claims().length).toBe(1);
    });

    it('should handle ENDORSEMENT_APPROVED event', () => {
      const mockPolicy = { policyId: 'pol-1', riskScore: 200 };
      mockApiService.getPolicyById.and.returnValue(of(mockPolicy));
      fixture.detectChanges();
      
      eventsSubject.next({ type: 'ENDORSEMENT_APPROVED', payload: { policyId: 'pol-1' } });
      
      expect(mockNotificationService.addToast).toHaveBeenCalled();
      expect(mockApiService.getPolicyById).toHaveBeenCalledTimes(2);
    });

    it('should handle ENDORSEMENT_REJECTED event', () => {
      const mockPolicy = { policyId: 'pol-1', riskScore: 200 };
      mockApiService.getPolicyById.and.returnValue(of(mockPolicy));
      fixture.detectChanges();
      
      eventsSubject.next({ type: 'ENDORSEMENT_REJECTED', payload: { policyId: 'pol-1' } });
      
      expect(mockApiService.getPolicyById).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadPolicy & fallbackLoadPolicy', () => {
    it('should fallback to getPoliciesByUser when getPolicyById fails', () => {
      mockApiService.getPolicyById.and.returnValue(throwError(() => new Error('Not found')));
      const fallbackPolicy = { policyId: 'pol-1', riskScore: 300 };
      mockApiService.getPoliciesByUser.and.returnValue(of([fallbackPolicy]));
      
      component.loadPolicy('pol-1');
      
      expect(mockApiService.getPoliciesByUser).toHaveBeenCalledWith('user-1');
      expect(component.policy()).toEqual(fallbackPolicy as any);
    });

    it('should generate policy from underwritingQueue applications if API returns not found', () => {
      mockApiService.getPolicyById.and.returnValue(throwError(() => new Error('Not found')));
      mockApiService.getPoliciesByUser.and.returnValue(of([]));
      // Missing fields to hit fallback logical OR operators
      mockUnderwritingQueueService.applications.and.returnValue([{ 
        applicationId: 'pol-1', riskScore: 400, 
        tenureYears: 0, waitingPeriodYears: 0,
        reviewedAt: '2023-01-01T00:00:00Z',
        totalInsuredValue: 5000 
      }]);
      
      component.loadPolicy('pol-1');
      
      const p = component.policy();
      expect(p).toBeTruthy();
      expect(p?.riskScore).toBe(400);
      expect(p?.id).toBe('pol-1');
      expect(p?.tenureYears).toBe(5); // fallbacks
      expect(p?.waitingPeriodYears).toBe(2); 
    });

    it('should set policy to null if all fallbacks fail', () => {
      // test getPolicyById returning null directly
      mockApiService.getPolicyById.and.returnValue(of(null)); 
      // test fallback getPoliciesByUser throwing
      mockApiService.getPoliciesByUser.and.returnValue(throwError(() => new Error('Not found'))); 
      mockUnderwritingQueueService.applications.and.returnValue([]);
      
      component.loadPolicy('pol-1');
      expect(component.policy()).toBeNull();
    });
  });

  describe('getTranches', () => {
    it('should return default tranche if no tranches are present', () => {
      component.policy.set({ policyId: 'pol-1', riskScore: 380, insuredValue: 1000 } as any);
      const tranches = component.getTranches();
      
      expect(tranches.length).toBe(1);
      expect(tranches[0].trancheType).toBe('ORIGINAL');
    });

    it('should return filtered and sorted tranches', () => {
      component.policy.set({
        policyId: 'pol-1',
        tranches: [
          { trancheNumber: 2, trancheStatus: 'ACTIVE' },
          { trancheNumber: 1, trancheStatus: 'SUPERSEDED' },
          { trancheNumber: 2, trancheStatus: 'PENDING_ACCEPTANCE' } // should be filtered out because max active is 2
        ]
      } as any);
      
      const tranches = component.getTranches();
      expect(tranches.length).toBe(2);
      expect(tranches[0].trancheNumber).toBe(1);
      expect(tranches[1].trancheNumber).toBe(2);
    });
  });

  describe('getPendingTranche & isUnderwriterGated', () => {
    it('should return pending tranche if exists and not rejected', () => {
      component.policy.set({
        policyId: 'pol-1',
        tranches: [
          { trancheNumber: 1, trancheStatus: 'ACTIVE' },
          { trancheNumber: 2, trancheStatus: 'PENDING_ACCEPTANCE', riskScore: 500, trancheId: 't2' }
        ]
      } as any);
      
      mockUnderwritingQueueService.endorsementReviews.and.returnValue([]);
      const pending = component.getPendingTranche();
      expect(pending).toBeTruthy();
      expect(pending?.trancheNumber).toBe(2);
    });

    it('should mark pending tranche as REJECTED if queue has REJECTED review', () => {
      component.policy.set({
        policyId: 'pol-1',
        tranches: [
          { trancheNumber: 2, trancheStatus: 'PENDING_ACCEPTANCE', riskScore: 500, trancheId: 't2' }
        ]
      } as any);
      
      mockUnderwritingQueueService.endorsementReviews.and.returnValue([{ status: 'UNDERWRITER_REJECTED' }]);
      mockUnderwritingQueueService.matchesReview.and.returnValue(true);
      
      const pending = component.getPendingTranche();
      expect(pending).toBeNull(); // because it was marked rejected and skipped
      
      const tranches = component.getTranches();
      expect(tranches[0].trancheStatus).toBe('REJECTED');
    });

    it('should return true for isUnderwriterGated if pending riskScore >= 500 and not approved', () => {
      component.policy.set({
        policyId: 'pol-1',
        tranches: [{ trancheNumber: 2, trancheStatus: 'PENDING_ACCEPTANCE', riskScore: 500, trancheId: 't2' }]
      } as any);
      mockUnderwritingQueueService.isEndorsementApproved.and.returnValue(false);
      
      expect(component.isUnderwriterGated()).toBeTrue();
      expect(component.isPendingUnderwriterReview(component.getPendingTranche())).toBeTrue();
    });

    it('should return false for isUnderwriterGated if pending riskScore < 500 or null', () => {
      component.policy.set({
        policyId: 'pol-1',
        tranches: [{ trancheNumber: 2, trancheStatus: 'PENDING_ACCEPTANCE', riskScore: 400, trancheId: 't2' }]
      } as any);
      expect(component.isUnderwriterGated()).toBeFalse();
      expect(component.isPendingUnderwriterReview(component.getPendingTranche())).toBeFalse();
      expect(component.isPendingUnderwriterReview(null)).toBeFalse();
    });
  });

  describe('checkAndRegisterHighRiskEndorsement', () => {
    it('should return early if pending is null or riskScore < 500', () => {
      component.policy.set({ policyId: 'pol-1', tranches: [] } as any);
      (component as any).checkAndRegisterHighRiskEndorsement();
      expect(mockUnderwritingQueueService.registerPendingEndorsement).not.toHaveBeenCalled();
    });
  });

  describe('Insurance Math Computations', () => {
    it('should calculate percentages for all risk score branches', () => {
      const scores = [
        { score: 100, cov: 80, prem: 1.5 },
        { score: 300, cov: 70, prem: 2.0 },
        { score: 500, cov: 60, prem: 3.0 },
        { score: 700, cov: 50, prem: 5.0 },
        { score: 900, cov: 40, prem: 8.0 }
      ];

      scores.forEach(s => {
        component.policy.set({ policyId: 'pol-1', riskScore: s.score, insuredValue: 100000 } as any);
        expect(component.getActiveCoveragePercentage()).toBe(s.cov);
        expect(component.getActivePremiumPercentage()).toBe(s.prem);
        expect(component.getTrancheCoveragePercentage({} as any)).toBe(s.cov);
        expect(component.getTranchePremiumPercentage({} as any)).toBe(s.prem);
        
        const tranche = { riskScore: s.score } as any;
        expect(component.getTrancheCoveragePercentage(tranche)).toBe(s.cov);
        expect(component.getTranchePremiumPercentage(tranche)).toBe(s.prem);
      });
    });

    it('should calculate caps and deltas correctly', () => {
      component.policy.set({ policyId: 'pol-1', riskScore: 300, insuredValue: 100000 } as any);
      expect(component.getActiveInsuredCap()).toBe(70000); // 100000 * 70%
      expect(component.getActivePremiumAmount()).toBe(2000); // 100000 * 2.0%
      
      const pendingTranche = { riskScore: 500, insuredValue: 150000 } as any;
      expect(component.getProposedPremiumAmount(pendingTranche)).toBe(4500); // 150000 * 3.0%
      expect(component.getPremiumDelta(pendingTranche)).toBe(2500); // 4500 - 2000
      expect(component.getExposureDelta(pendingTranche)).toBe(50000); // 150000 - 100000
      expect(component.getProposedInsuredCap(pendingTranche)).toBe(90000); // 150000 * 60%
      
      const lowerTranche = { riskScore: 100, insuredValue: 50000 } as any;
      expect(component.getPremiumDelta(lowerTranche)).toBe(0); // Math.max(0, negative)
      expect(component.getExposureDelta(lowerTranche)).toBe(0);
    });
  });

  describe('authorizeUnderwritingDirectly', () => {
    it('should authorize endorsement', () => {
      component.authorizeUnderwritingDirectly({ trancheId: 't2', trancheNumber: 2 } as any);
      expect(mockUnderwritingQueueService.confirmEndorsementReview).toHaveBeenCalled();
      expect(mockNotificationService.addToast).toHaveBeenCalled();
    });
    
    it('should return authorization allowed for certain roles', () => {
      expect(component.canAuthorizeUnderwriting()).toBeTrue(); // mocked as ROLE_INVESTOR
    });
  });

  describe('Endorsement Operations', () => {
    beforeEach(() => {
      component.policy.set({ policyId: 'pol-1', riskScore: 300, insuredValue: 100000 } as any);
    });

    it('should block acceptEndorsement if terms not accepted', () => {
      component.policyForm.patchValue({ termsAccepted: false });
      component.acceptEndorsement({ trancheId: 't2', insuredValue: 150000 } as any);
      expect(component.showEndorsementPayment()).toBeFalse();
      expect(mockApiService.acceptEndorsement).not.toHaveBeenCalled();
    });

    it('should show payment modal if premium delta > 0', () => {
      component.policyForm.patchValue({ termsAccepted: true });
      component.acceptEndorsement({ trancheId: 't2', insuredValue: 150000, riskScore: 500, premiumPercentage: 3.0 } as any); // 4500
      expect(component.showEndorsementPayment()).toBeTrue();
      expect(component.endorsementDeltaPremium()).toBe(2500);
      expect(mockApiService.acceptEndorsement).not.toHaveBeenCalled();
    });

    it('should directly process acceptEndorsement if premium delta <= 0', () => {
      component.policyForm.patchValue({ termsAccepted: true });
      component.acceptEndorsement({ trancheId: 't2', insuredValue: 50000, premiumPercentage: 2.0 } as any); // 1000
      expect(component.showEndorsementPayment()).toBeFalse();
      expect(mockApiService.acceptEndorsement).toHaveBeenCalled();
    });

    it('should process acceptEndorsement successfully', () => {
      mockApiService.acceptEndorsement.and.returnValue(of({}));
      component.processAcceptEndorsement({ trancheId: 't2', trancheNumber: 2 } as any);
      expect(mockApiService.acceptEndorsement).toHaveBeenCalledWith('pol-1', 't2');
      expect(mockNotificationService.addToast).toHaveBeenCalled();
    });

    it('should handle processAcceptEndorsement error and fallback to manual object update', () => {
      mockApiService.acceptEndorsement.and.returnValue(throwError(() => new Error('Error')));
      component.policy.set({ policyId: 'pol-1', tranches: [{ trancheId: 't2', trancheStatus: 'PENDING_ACCEPTANCE' }] } as any);
      
      component.processAcceptEndorsement({ trancheId: 't2', trancheNumber: 2, insuredValue: 200000, riskScore: 400 } as any);
      
      const p = component.policy();
      expect(p?.policyStatus).toBe('COVERAGE_ACTIVE');
      expect(p?.insuredValue).toBe(200000);
      expect(p?.tranches![0].trancheStatus).toBe('ACTIVE');
    });

    it('should process rejectEndorsement successfully', () => {
      mockApiService.rejectEndorsement.and.returnValue(of({ policyId: 'pol-1', riskScore: 300 }));
      component.rejectEndorsement({ trancheId: 't2', trancheNumber: 2 } as any);
      
      expect(mockApiService.rejectEndorsement).toHaveBeenCalledWith('pol-1', 't2');
      expect(mockNotificationService.addToast).toHaveBeenCalled();
      expect(component.policy()?.riskScore).toBe(300);
    });

    it('should handle rejectEndorsement error', () => {
      mockApiService.rejectEndorsement.and.returnValue(throwError(() => new Error('Error')));
      component.policy.set({ policyId: 'pol-1', tranches: [{ trancheId: 't2' }] } as any);
      component.rejectEndorsement({ trancheId: 't2', trancheNumber: 2 } as any);
      
      const p = component.policy();
      expect(p?.tranches?.length).toBe(0); // removed manually
      expect(mockNotificationService.addToast).toHaveBeenCalled();
    });
  });

  describe('Vesting Math & Claims', () => {
    it('should calculate time remaining and vesting progress', () => {
      const now = new Date();
      const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      component.policy.set({ 
        policyStartDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString(),
        waitingPeriodEndDate: nextYear.toISOString(),
        tenureYears: 5
      } as any);

      expect(component.isLockInCompleted()).toBeFalse();
      expect(component.getOptionAVestedPercentage()).toBe(0);
      expect(component.isPolicyMatured()).toBeFalse();
      expect(component.getTimeRemaining()).toContain('lock-in remaining');

      const progress = component.getVestingProgress();
      expect(progress).toBeGreaterThan(0);
      expect(progress).toBeLessThan(100);
    });

    it('should handle vested policies', () => {
      const now = new Date();
      const past = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
      component.policy.set({ 
        policyStartDate: past.toISOString(),
        waitingPeriodEndDate: past.toISOString(),
      } as any);

      expect(component.isLockInCompleted()).toBeTrue();
      expect(component.getOptionAVestedPercentage()).toBe(100);
      expect(component.getTimeRemaining()).toContain('Cliff Vested');
      expect(component.getVestingProgress()).toBe(100);
    });

    it('should handle missing start date in vesting progress', () => {
      component.policy.set({} as any);
      expect(component.getVestingProgress()).toBe(20); // fallback
    });

    it('should sum paid claims', () => {
      component.policy.set({ policyId: 'pol-1', riskScore: 300, insuredValue: 100000 } as any); // Active cap = 70000
      component.claims.set([
        { policyId: 'pol-1', status: 'PAID', claimAmount: 10000, payoutAmount: 7000 } as any,
        { policyId: 'pol-1', status: 'REJECTED', claimAmount: 5000, payoutAmount: 0 } as any,
        { policyId: 'pol-1', status: 'SETTLED', claimAmount: 100000, payoutAmount: 100000 } as any // will be capped by percentage logic inside
      ]);
      
      expect(component.getTotalClaimsPaid()).toBeGreaterThan(0);
    });
  });

  describe('Helper formatting', () => {
    it('should return correct format currency', () => {
      expect(component.formatCurrency(1234)).toContain('1,234');
      expect(component.formatCurrency(undefined)).toBe('0');
      expect(component.formatCurrencyDelta(100)).toContain('+₹100');
      expect(component.formatCurrencyDelta(-100)).toContain('-₹100');
      expect(component.formatDelta(100)).toBe('+100');
      expect(component.formatDelta(-100)).toBe('-100');
    });
    
    it('should return correct risk color and tier for all branches', () => {
      expect(component.getRiskColor(150)).toBe('text-success-400');
      expect(component.getRiskColor(350)).toBe('text-info-400');
      expect(component.getRiskColor(550)).toBe('text-warning-400');
      expect(component.getRiskColor(900)).toBe('text-danger-400');
      expect(component.getRiskTierName(9999)).toBe('MODERATE_RISK'); // fallback
    });

    it('should return status badge for various statuses', () => {
      expect(component.getStatusBadge('ACTIVE')).toBe('badge-success');
      expect(component.getStatusBadge('EXPIRED')).toBe('badge-danger');
      expect(component.getStatusBadge('IN_WAITING_PERIOD')).toBe('badge-warning');
      expect(component.getStatusBadge('CLAIM_ELIGIBLE')).toBe('badge-info');
      expect(component.getStatusBadge('UNKNOWN_STATUS')).toBe('badge-primary');
    });
    
    it('should format tranche status accurately', () => {
      component.policy.set({ policyId: 'pol-1', tranches: [{ trancheNumber: 2, trancheStatus: 'ACTIVE' }] } as any);
      expect(component.formatTrancheStatus(null)).toBe('ACTIVE (CURRENT)');
      
      const oldTranche = { trancheNumber: 1, trancheStatus: 'SUPERSEDED' } as any;
      expect(component.formatTrancheStatus(oldTranche)).toBe('SUPERSEDED (OLD)');
      expect(component.getTrancheStatusBadge(oldTranche)).toContain('bg-slate-700/60');
      
      const pendingTranche = { trancheNumber: 3, trancheStatus: 'PENDING' } as any;
      expect(component.formatTrancheStatus(pendingTranche)).toBe('PENDING ACCEPTANCE');
      expect(component.getTrancheStatusBadge(pendingTranche)).toContain('bg-neutral-500/20 text-neutral-300');
      
      const rejectedTranche = { trancheNumber: 3, trancheStatus: 'REJECTED' } as any;
      expect(component.formatTrancheStatus(rejectedTranche)).toBe('REJECTED (BY ADMIN)');
      expect(component.getTrancheStatusBadge(rejectedTranche)).toContain('bg-rose-100');
      
      const activeTranche = { trancheNumber: 2, trancheStatus: 'ACTIVE' } as any;
      expect(component.formatTrancheStatus(activeTranche)).toBe('ACTIVE (CURRENT)');
      expect(component.getTrancheStatusBadge(activeTranche)).toContain('text-neutral-400');
      
      const unknownTranche = { trancheNumber: 3, trancheStatus: 'WEIRD' } as any;
      expect(component.formatTrancheStatus(unknownTranche)).toBe('WEIRD');
      expect(component.getTrancheStatusBadge(unknownTranche)).toContain('badge-primary');
    });
  });

  describe('Payment Handlers', () => {
    it('should handle onPaymentSuccess', () => {
      spyOn(component, 'processAcceptEndorsement');
      component.paymentPendingTranche = { trancheId: 't2' } as any;
      component.onPaymentSuccess({});
      expect(component.showEndorsementPayment()).toBeFalse();
      expect(component.processAcceptEndorsement).toHaveBeenCalled();
    });

    it('should handle onPaymentCancel', () => {
      component.paymentPendingTranche = { trancheId: 't2' } as any;
      component.onPaymentCancel();
      expect(component.showEndorsementPayment()).toBeFalse();
      expect(component.paymentPendingTranche).toBeNull();
    });
  });
  
  describe('Modals & Actions', () => {
    it('should open tranche modal', () => {
      const tranche = { trancheId: 't1' } as any;
      component.openTrancheModal(tranche);
      expect(component.selectedTrancheForModal()).toEqual(tranche);
    });

    it('should scroll to comparison', () => {
      spyOn(document, 'getElementById').and.returnValue({ scrollIntoView: jasmine.createSpy() } as any);
      component.scrollToComparison();
      expect(document.getElementById).toHaveBeenCalledWith('comparisonSection');
    });
  });
});
