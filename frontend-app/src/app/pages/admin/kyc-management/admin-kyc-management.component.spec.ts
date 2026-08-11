import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminKycManagementComponent } from './admin-kyc-management.component';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('AdminKycManagementComponent', () => {
  let component: AdminKycManagementComponent;
  let fixture: ComponentFixture<AdminKycManagementComponent>;
  let mockApi: any;
  let mockAuth: any;
  let mockNotif: any;

  beforeEach(async () => {
    mockApi = {
      getAllUsers: jasmine.createSpy('getAllUsers').and.returnValue(of([{ id: 'u1', email: 'u1@test.com', fullName: 'User One' }])),
      getAllKycApplications: jasmine.createSpy('getAllKycApplications').and.returnValue(of([
        { userId: 'u1', kycStatus: 'PENDING', panNumber: 'PAN1' },
        { userId: 'u2', kycStatus: 'APPROVED' },
        { userId: 'u3', kycStatus: 'REJECTED' }
      ])),
      approveKyc: jasmine.createSpy('approveKyc').and.returnValue(of({})),
      rejectKyc: jasmine.createSpy('rejectKyc').and.returnValue(of({}))
    };

    mockAuth = {};
    mockNotif = {
      addToast: jasmine.createSpy('addToast')
    };

    await TestBed.configureTestingModule({
      imports: [AdminKycManagementComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: mockApi },
        { provide: AuthService, useValue: mockAuth },
        { provide: NotificationService, useValue: mockNotif }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminKycManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load data', () => {
    expect(component).toBeTruthy();
    expect(mockApi.getAllUsers).toHaveBeenCalled();
    expect(mockApi.getAllKycApplications).toHaveBeenCalled();
    expect(component.applications().length).toBe(3);
  });

  describe('User Info Helpers', () => {
    it('should format user names and emails', () => {
      expect(component.getUserFullName('u1')).toBe('User One');
      expect(component.getUserEmail('u1')).toBe('u1@test.com');
      expect(component.getUserInitial('u1')).toBe('U');

      expect(component.getUserFullName('unknown')).toBe('Investor');
      expect(component.getUserEmail('unknown')).toBe('');
      expect(component.getUserInitial('unknown')).toBe('I');
    });
  });

  describe('Filtering and Counts', () => {
    it('should compute counts correctly', () => {
      expect(component.countPending()).toBe(1);
      expect(component.countApproved()).toBe(1);
      expect(component.countRejected()).toBe(1);
    });

    it('should filter by tab', () => {
      component.activeTab.set('PENDING');
      expect(component.filteredApplications().length).toBe(1);
      expect(component.filteredApplications()[0].kycStatus).toBe('PENDING');

      component.activeTab.set('APPROVED');
      expect(component.filteredApplications().length).toBe(1);

      component.activeTab.set('REJECTED');
      expect(component.filteredApplications().length).toBe(1);
    });

    it('should filter by search query', () => {
      component.activeTab.set('ALL');
      component.searchForm.patchValue({ searchQuery: 'PAN1' });
      expect(component.searchQuerySignal()).toBe('PAN1');
    });
  });

  describe('Actions', () => {
    it('should approve KYC', () => {
      component.approveKyc({ userId: 'u1' } as any);
      expect(mockApi.approveKyc).toHaveBeenCalledWith('u1');
      expect(mockNotif.addToast).toHaveBeenCalled();
      
      const updated = component.applications().find(a => a.userId === 'u1');
      expect(updated?.kycStatus).toBe('APPROVED');
    });

    it('should handle approve KYC error gracefully', () => {
      mockApi.approveKyc.and.returnValue(throwError(() => new Error()));
      component.approveKyc({ userId: 'u1' } as any);
      expect(mockNotif.addToast).toHaveBeenCalled();
    });

    it('should open reject modal', () => {
      component.openRejectModal({ userId: 'u1' } as any);
      expect(component.selectedForReject()?.userId).toBe('u1');
    });

    it('should confirm reject', () => {
      component.openRejectModal({ userId: 'u1' } as any);
      component.rejectForm.patchValue({ rejectReason: 'Bad photo' });
      component.confirmReject();
      
      expect(mockApi.rejectKyc).toHaveBeenCalledWith('u1', 'Bad photo');
      expect(mockNotif.addToast).toHaveBeenCalled();
      
      const updated = component.applications().find(a => a.userId === 'u1');
      expect(updated?.kycStatus).toBe('REJECTED');
    });

    it('should handle confirm reject error gracefully', () => {
      mockApi.rejectKyc.and.returnValue(throwError(() => new Error()));
      component.openRejectModal({ userId: 'u1' } as any);
      component.confirmReject();
      expect(mockNotif.addToast).toHaveBeenCalled();
    });

    it('should open inspect modal', () => {
      component.openInspectModal({ userId: 'u1' } as any);
      expect(component.selectedForInspect()?.userId).toBe('u1');
    });
  });

  describe('Formatting', () => {
    it('should format status text', () => {
      expect(component.formatStatus('PENDING')).toContain('Pending Review');
      expect(component.formatStatus('APPROVED')).toContain('Verified');
      expect(component.formatStatus('REJECTED')).toContain('Rejected');
      expect(component.formatStatus('UNKNOWN')).toContain('Not Submitted');
    });

    it('should get status badge', () => {
      expect(component.getStatusBadge('PENDING')).toContain('bg-orange-100');
      expect(component.getStatusBadge('APPROVED')).toContain('bg-emerald-100');
      expect(component.getStatusBadge('REJECTED')).toContain('bg-rose-100');
      expect(component.getStatusBadge('UNKNOWN')).toContain('bg-[#f4f5f6]');
    });
  });
});
