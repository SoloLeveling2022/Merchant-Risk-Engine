import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UnderwriterDashboardComponent } from './underwriter-dashboard.component';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { of, throwError, Subject } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('UnderwriterDashboardComponent', () => {
  let component: UnderwriterDashboardComponent;
  let fixture: ComponentFixture<UnderwriterDashboardComponent>;
  let mockApi: any;
  let mockAuth: any;
  let mockQueue: any;
  let mockNotif: any;
  let eventsSubject: Subject<any>;

  beforeEach(async () => {
    eventsSubject = new Subject();

    mockApi = {
      getAllUsers: jasmine.createSpy('getAllUsers').and.returnValue(of([{ id: 'u1', email: 'test@test.com' }])),
      getAllPolicies: jasmine.createSpy('getAllPolicies').and.returnValue(of([{ policyId: 'p1', riskScore: 500, annualPremium: 100 }])),
      getPendingEndorsements: jasmine.createSpy('getPendingEndorsements').and.returnValue(of([])),
      getPortfolioHoldings: jasmine.createSpy('getPortfolioHoldings').and.returnValue(of([])),
      rejectEndorsement: jasmine.createSpy('rejectEndorsement').and.returnValue(of({}))
    };

    mockAuth = {
      user: jasmine.createSpy('user').and.returnValue({ fullName: 'John Doe' })
    };

    mockQueue = {
      endorsementReviews: jasmine.createSpy('endorsementReviews').and.returnValue([]),
      applications: jasmine.createSpy('applications').and.returnValue([]),
      events$: eventsSubject.asObservable(),
      syncEndorsementsFromBackend: jasmine.createSpy('syncEndorsementsFromBackend'),
      approveApplication: jasmine.createSpy('approveApplication').and.returnValue(of({})),
      rejectApplication: jasmine.createSpy('rejectApplication'),
      getHoldingsSnapshot: jasmine.createSpy('getHoldingsSnapshot').and.returnValue(null),
      confirmEndorsementReview: jasmine.createSpy('confirmEndorsementReview'),
      rejectEndorsementReview: jasmine.createSpy('rejectEndorsementReview'),
      clearQueue: jasmine.createSpy('clearQueue'),
      clearEndorsementReviews: jasmine.createSpy('clearEndorsementReviews'),
      clearAllApprovedKeys: jasmine.createSpy('clearAllApprovedKeys')
    };

    mockNotif = {
      addToast: jasmine.createSpy('addToast')
    };

    await TestBed.configureTestingModule({
      imports: [UnderwriterDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: UnderwritingQueueService, useValue: mockQueue },
        { provide: NotificationService, useValue: mockNotif }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UnderwriterDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load data on init', () => {
    expect(component).toBeTruthy();
    expect(mockApi.getAllUsers).toHaveBeenCalled();
    expect(mockApi.getAllPolicies).toHaveBeenCalled();
    expect(mockApi.getPendingEndorsements).toHaveBeenCalled();
  });

  it('should refresh on events', () => {
    eventsSubject.next(null);
    expect(mockApi.getAllPolicies).toHaveBeenCalledTimes(2);
  });

  describe('User Helpers', () => {
    it('should return underwriter name', () => {
      expect(component.getUnderwriterName()).toBe('John Doe');
      mockAuth.user.and.returnValue({ firstName: 'Jane' });
      expect(component.getUnderwriterName()).toBe('Jane');
    });

    it('should return user details correctly', () => {
      // It sets usersMap in refresh()
      component.refresh();
      expect(component.getUser('u1')?.email).toBe('test@test.com');
      expect(component.getUserEmail('u1')).toBe('test@test.com');
      expect(component.getUserInitial('u1')).toBe('T');
      
      expect(component.getUserFullName('nonexistent')).toBe('Investor');
      expect(component.getUserEmail('nonexistent@test.com')).toBe('nonexistent@test.com');
    });
  });

  describe('Applications & Underwriting', () => {
    it('should open and close underwrite modal', () => {
      component.openUnderwriteModal({ applicationId: 'app1' } as any);
      expect(component.selectedApplication()?.applicationId).toBe('app1');
      expect(component.showPortfolioDetails()).toBeFalse();
      
      component.closeUnderwriteModal();
      expect(component.selectedApplication()).toBeNull();
    });

    it('should toggle portfolio details', () => {
      component.togglePortfolioDetails('port1');
      expect(component.showPortfolioDetails()).toBeTrue();
      expect(mockApi.getPortfolioHoldings).toHaveBeenCalledWith('port1');
      
      component.togglePortfolioDetails('port1');
      expect(component.showPortfolioDetails()).toBeFalse();
    });

    it('should approve app', () => {
      component.openUnderwriteModal({ applicationId: 'app1' } as any);
      component.approveApp({ applicationId: 'app1' } as any);
      expect(mockQueue.approveApplication).toHaveBeenCalled();
      expect(mockNotif.addToast).toHaveBeenCalled();
    });

    it('should reject app', () => {
      component.openUnderwriteModal({ applicationId: 'app1' } as any);
      component.rejectApp({ applicationId: 'app1' } as any);
      expect(mockQueue.rejectApplication).toHaveBeenCalled();
      expect(mockNotif.addToast).toHaveBeenCalled();
    });
  });

  describe('Risk Badge formatting', () => {
    it('should return correct badge classes for scores', () => {
      expect(component.getRiskBadgeClass(0)).toContain('bg-surface-800');
      expect(component.getRiskBadgeClass(200)).toContain('bg-emerald-500/10');
      expect(component.getRiskBadgeClass(500)).toContain('bg-blue-500/10');
      expect(component.getRiskBadgeClass(700)).toContain('bg-accent-500/15');
      expect(component.getRiskBadgeClass(900)).toContain('bg-rose-500/15');
      
      expect(component.getRiskTextColor(200)).toBe('text-emerald-700');
      expect(component.getRiskTextColor(500)).toBe('text-blue-700');
      expect(component.getRiskTextColor(700)).toBe('text-accent-700');
      expect(component.getRiskTextColor(900)).toBe('text-rose-700');
      expect(component.getRiskTextColor(0)).toBe('text-surface-200');
    });
  });

  describe('Endorsements & Diff Modal', () => {
    it('should open diff modal with cached snapshot', () => {
      mockQueue.getHoldingsSnapshot.and.returnValue({
        previousHoldings: [{ symbol: 'AAPL' }],
        proposedHoldings: [{ symbol: 'AAPL' }]
      });
      component.openDiffModal({ policyId: 'p1' });
      expect(component.diffProposedHoldings().length).toBe(1);
    });

    it('should fetch diff modal data live if no cache', () => {
      mockApi.getPortfolioHoldings.and.returnValue(of([{ symbol: 'AAPL', quantity: 10, averageBuyPrice: 150 }]));
      component.openDiffModal({ policyId: 'p1', portfolioId: 'port1' });
      expect(mockApi.getPortfolioHoldings).toHaveBeenCalled();
      expect(component.diffProposedHoldings().length).toBe(1);
    });

    it('should accept endorsement', fakeAsync(() => {
      component.openDiffModal({ policyId: 'p1', trancheId: 't1' });
      component.acceptEndorsement();
      expect(mockQueue.confirmEndorsementReview).toHaveBeenCalled();
      tick(500);
      expect(mockNotif.addToast).toHaveBeenCalled();
      expect(component.selectedEndorsement()).toBeNull();
    }));

    it('should reject endorsement', fakeAsync(() => {
      component.openDiffModal({ policyId: 'p1', trancheId: 't1', id: 'foo' });
      component.rejectEndorsement();
      expect(mockQueue.rejectEndorsementReview).toHaveBeenCalled();
      expect(mockApi.rejectEndorsement).toHaveBeenCalled();
      tick(500);
      expect(mockNotif.addToast).toHaveBeenCalled();
      expect(component.selectedEndorsement()).toBeNull();
    }));
  });

  describe('Misc', () => {
    it('should format currency', () => {
      expect(component.formatCurrency(1234)).toContain('1,234');
    });

    it('should clear queue', () => {
      component.clearQueue();
      expect(mockQueue.clearQueue).toHaveBeenCalled();
    });

    it('should clear endorsements', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      component.clearEndorsements();
      expect(mockQueue.clearEndorsementReviews).toHaveBeenCalled();
      expect(mockQueue.clearAllApprovedKeys).toHaveBeenCalled();
    });
  });
});
