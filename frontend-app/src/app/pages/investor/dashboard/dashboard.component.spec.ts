import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvestorDashboardComponent } from './dashboard.component';

describe('InvestorDashboardComponent', () => {
  let component: InvestorDashboardComponent;
  let fixture: ComponentFixture<InvestorDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvestorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

