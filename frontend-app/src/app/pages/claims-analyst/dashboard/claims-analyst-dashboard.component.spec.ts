import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClaimsAnalystDashboardComponent } from './claims-analyst-dashboard.component';

describe('ClaimsAnalystDashboardComponent', () => {
  let component: ClaimsAnalystDashboardComponent;
  let fixture: ComponentFixture<ClaimsAnalystDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClaimsAnalystDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

