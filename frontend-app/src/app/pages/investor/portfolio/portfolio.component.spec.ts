import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioComponent } from './portfolio.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ApiService, UnderwritingQueueService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('PortfolioComponent', () => {
  let component: PortfolioComponent;
  let fixture: ComponentFixture<PortfolioComponent>;
  let apiServiceMock: any;
  let authServiceMock: any;
  let notificationMock: any;
  let queueMock: any;

  beforeEach(async () => {
    apiServiceMock = {
      getPortfoliosByUser: jasmine.createSpy('getPortfoliosByUser').and.returnValue(of([{ id: 'p1', portfolioName: 'Test Port' }])),
      getPortfolioHoldings: jasmine.createSpy('getPortfolioHoldings').and.returnValue(of([{ symbol: 'AAPL', quantity: 10, averageBuyPrice: 150 }])),
      uploadManualPortfolio: jasmine.createSpy('uploadManualPortfolio').and.returnValue(of({})),
      uploadCsvPortfolio: jasmine.createSpy('uploadCsvPortfolio').and.returnValue(of({})),
      updatePortfolio: jasmine.createSpy('updatePortfolio').and.returnValue(of({})),
      simulateMarket: jasmine.createSpy('simulateMarket').and.returnValue(of({})),
      reUnderwrite: jasmine.createSpy('reUnderwrite').and.returnValue(of({})),
      getPoliciesByUser: jasmine.createSpy('getPoliciesByUser').and.returnValue(of([]))
    };

    authServiceMock = {
      userId: jasmine.createSpy('userId').and.returnValue('user-123'),
      isKycApproved: jasmine.createSpy('isKycApproved').and.returnValue(true)
    };

    notificationMock = {
      addToast: jasmine.createSpy('addToast')
    };

    queueMock = {
      saveHoldingsSnapshot: jasmine.createSpy('saveHoldingsSnapshot'),
      clearAllEndorsementReviewsForPolicy: jasmine.createSpy('clearAllEndorsementReviewsForPolicy'),
      syncEndorsementsFromBackend: jasmine.createSpy('syncEndorsementsFromBackend')
    };

    await TestBed.configureTestingModule({
      imports: [PortfolioComponent, ReactiveFormsModule],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: apiServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: UnderwritingQueueService, useValue: queueMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load portfolios on init', () => {
    expect(component).toBeTruthy();
    expect(authServiceMock.userId).toHaveBeenCalled();
    expect(apiServiceMock.getPortfoliosByUser).toHaveBeenCalledWith('user-123');
    expect(component.portfolios().length).toBe(1);
  });

  describe('Upload Modals', () => {
    it('should open upload modal if KYC approved', () => {
      component.openUploadModal();
      expect(component.showUploadModal()).toBeTrue();
      expect(component.showKycBlockedModal()).toBeFalse();
    });

    it('should block upload modal if KYC not approved', () => {
      authServiceMock.isKycApproved.and.returnValue(false);
      component.openUploadModal();
      expect(component.showUploadModal()).toBeFalse();
      expect(component.showKycBlockedModal()).toBeTrue();
    });
  });

  describe('Manual Upload', () => {
    it('should add and remove rows', () => {
      const initialCount = component.manualHoldingsControl.length;
      component.addRow();
      expect(component.manualHoldingsControl.length).toBe(initialCount + 1);
    });

    it('should submit manual portfolio', () => {
      component.manualUploadForm.patchValue({ portfolioName: 'New Port' });
      component.manualHoldingsControl.clear();
      component.addRowData({ tickerSymbol: 'AAPL', quantity: 10, averageBuyPrice: 150 });
      
      component.submitManual();
      expect(apiServiceMock.uploadManualPortfolio).toHaveBeenCalled();
      expect(component.showUploadModal()).toBeFalse();
    });

    it('should block submit manual if KYC not approved', () => {
      authServiceMock.isKycApproved.and.returnValue(false);
      component.submitManual();
      expect(component.showKycBlockedModal()).toBeTrue();
    });

    it('should handle manual submit error', () => {
      apiServiceMock.uploadManualPortfolio.and.returnValue(throwError(() => ({ error: { message: 'Error' } })));
      component.submitManual();
      expect(component.errorMsg()).toBe('Error');
    });
  });

  describe('CSV Upload', () => {
    it('should handle file selection', () => {
      const mockFile = new File([''], 'test.csv');
      const event = { target: { files: [mockFile] } } as any;
      component.onCsvSelected(event);
      expect(component.csvFile).toBe(mockFile);
    });

    it('should submit CSV portfolio', () => {
      component.csvFile = new File([''], 'test.csv');
      component.csvUploadForm.patchValue({ portfolioName: 'CSV Port' });
      component.uploadCsv();
      expect(apiServiceMock.uploadCsvPortfolio).toHaveBeenCalled();
      expect(component.showUploadModal()).toBeFalse();
    });

    it('should block CSV submit if KYC not approved', () => {
      authServiceMock.isKycApproved.and.returnValue(false);
      component.uploadCsv();
      expect(component.showKycBlockedModal()).toBeTrue();
    });

    it('should handle CSV submit error', () => {
      component.csvFile = new File([''], 'test.csv');
      apiServiceMock.uploadCsvPortfolio.and.returnValue(throwError(() => ({ error: { message: 'CSV Error' } })));
      component.uploadCsv();
      expect(component.errorMsg()).toBe('CSV Error');
    });
  });

  describe('Edit Modal and Holdings', () => {
    it('should open edit modal and load holdings if not cached', () => {
      const p = { id: 'p1', portfolioName: 'Test Port' } as any;
      component.openEditModal(p);
      expect(component.editingPortfolioId()).toBe('p1');
      expect(component.showEditModal()).toBeTrue();
      expect(apiServiceMock.getPortfolioHoldings).toHaveBeenCalledWith('p1');
    });

    it('should open edit modal and use cached holdings', () => {
      component.selectedPortfolioHoldings.set({ 'p1': [{ symbol: 'AAPL', quantity: 10, averageBuyPrice: 150 }] as any });
      const p = { id: 'p1', portfolioName: 'Test Port' } as any;
      component.openEditModal(p);
      expect(apiServiceMock.getPortfolioHoldings).not.toHaveBeenCalled(); // used cache
      expect(component.editHoldingsControl.length).toBe(1);
    });

    it('should add and remove edit holding rows', () => {
      component.openEditModal({ id: 'p1', portfolioName: 'Test Port' } as any);
      const initial = component.editHoldingsControl.length;
      component.addEditHoldingRow();
      expect(component.editHoldingsControl.length).toBe(initial + 1);
      
      component.removeEditHoldingRow(0);
      expect(component.editHoldingsControl.length).toBe(initial);
    });

    it('should calculate modal total value', () => {
      component.openEditModal({ id: 'p1', portfolioName: 'Test Port' } as any);
      expect(component.calculateModalTotalValue()).toBe(1500); // 10 * 150
    });

    it('should block submitEdit if form invalid or duplicate symbols', () => {
      component.openEditModal({ id: 'p1', portfolioName: 'Test Port' } as any);
      // Empty name
      component.editForm.patchValue({ editPortfolioName: '' });
      component.submitEdit();
      expect(component.editErrorMsg()).toContain('Please fill out all required fields');

      // Duplicate symbol
      component.editForm.patchValue({ editPortfolioName: 'Name' });
      component.addEditHoldingRow();
      component.editHoldingsControl.at(0).patchValue({ symbol: 'AAPL' });
      component.editHoldingsControl.at(1).patchValue({ symbol: 'AAPL' });
      component.submitEdit();
      expect(component.editErrorMsg()).toContain('Duplicate stock symbol');
    });

    it('should submit edit successfully and trigger underwriting', () => {
      component.openEditModal({ id: 'p1', portfolioName: 'Test Port' } as any);
      component.editForm.patchValue({ editPortfolioName: 'New Name' });
      component.editHoldingsControl.at(0).patchValue({ symbol: 'AAPL', quantity: 20, averageBuyPrice: 150 });
      
      component.submitEdit();
      
      expect(queueMock.saveHoldingsSnapshot).toHaveBeenCalled();
      expect(apiServiceMock.updatePortfolio).toHaveBeenCalled();
      expect(queueMock.clearAllEndorsementReviewsForPolicy).toHaveBeenCalledWith('p1');
      expect(apiServiceMock.reUnderwrite).toHaveBeenCalledWith('p1');
    });

    it('should handle submitEdit error', () => {
      component.openEditModal({ id: 'p1', portfolioName: 'Test Port' } as any);
      apiServiceMock.updatePortfolio.and.returnValue(throwError(() => ({ error: { message: 'Update error' } })));
      component.submitEdit();
      expect(component.editErrorMsg()).toBe('Update error');
    });
  });

  describe('Misc', () => {
    it('should simulate market', () => {
      component.simulateMarket('p1');
      expect(apiServiceMock.simulateMarket).toHaveBeenCalledWith('p1');
      expect(notificationMock.addToast).toHaveBeenCalled();
    });

    it('should load holdings separately', () => {
      component.loadHoldings('p2');
      expect(apiServiceMock.getPortfolioHoldings).toHaveBeenCalledWith('p2');
    });
  });
});
