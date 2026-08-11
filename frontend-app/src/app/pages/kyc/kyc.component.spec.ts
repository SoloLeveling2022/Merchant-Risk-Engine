import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KycComponent } from './kyc.component';

describe('KycComponent', () => {
  let component: KycComponent;
  let fixture: ComponentFixture<KycComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KycComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

