import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ClaimModalComponent } from './claim-modal.component';

describe('ClaimModalComponent', () => {
  let component: ClaimModalComponent;
  let fixture: ComponentFixture<ClaimModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimModalComponent);
    component = fixture.componentInstance;
    component.maxPayout = 1000;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit close when close is called', () => {
    spyOn(component.claimCancel, 'emit');
    component.close();
    expect(component.claimCancel.emit).toHaveBeenCalled();
  });

  it('should validate form correctly', () => {
    expect(component.isValid()).toBeFalse(); // initial empty

    component.claimForm.patchValue({ claimAmount: 1500, crashReason: 'crash' });
    expect(component.isValid()).toBeFalse(); // exceeds maxPayout

    component.claimForm.patchValue({ claimAmount: -10, crashReason: 'crash' });
    expect(component.isValid()).toBeFalse(); // negative

    component.claimForm.patchValue({ claimAmount: 500, crashReason: ' ' });
    expect(component.isValid()).toBeFalse(); // empty reason

    component.claimForm.patchValue({ claimAmount: 500, crashReason: 'Valid reason' });
    expect(component.isValid()).toBeTrue(); // valid
  });

  it('should emit submit when valid', () => {
    spyOn(component.claimSubmit, 'emit');
    
    // Invalid submit attempt
    component.submit();
    expect(component.claimSubmit.emit).not.toHaveBeenCalled();

    // Valid submit attempt
    component.claimForm.patchValue({ claimAmount: 500, crashReason: 'Valid reason' });
    component.submit();
    expect(component.claimSubmit.emit).toHaveBeenCalledWith({ amount: 500, reason: 'Valid reason' });
  });

  it('should format currency', () => {
    expect(component.formatCurrency(undefined)).toBe('0');
    expect(component.formatCurrency(0)).toBe('0');
    expect(component.formatCurrency(1234567)).toBe('12,34,567');
  });
});

