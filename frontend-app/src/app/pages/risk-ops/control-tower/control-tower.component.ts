import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@frontend/shared-api';
import { ControlTowerAlertDTO } from '@frontend/shared-models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-risk-control-tower',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './control-tower.component.html',
  styleUrls: ['./control-tower.component.css']
})
export class RiskControlTowerComponent implements OnInit, OnDestroy {
  private sseSub?: Subscription;

  alerts = signal<ControlTowerAlertDTO[]>([]);
  portfolioVampBps = signal(42.5); // bps (Threshold 50 bps standard, 70 bps excessive)
  ecpActiveBreaches = signal(1);
  ecpTotalFinesMo = signal(25000.00);
  activeSseConnected = signal(true);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Initial alerts
    const initial: ControlTowerAlertDTO[] = [
      {
        id: 'alt-1001',
        merchantId: 'm-mid-002',
        type: 'VAMP_SPIKE',
        severity: 'CRITICAL',
        message: 'Visa VAMP ratio breached 1.50% (Current: 1.62% with 1,620 fraud events). Escalating to RESERVE_HIKE.',
        timestamp: '2026-11-11T16:45:00Z'
      },
      {
        id: 'alt-1002',
        merchantId: 'm-mid-003',
        type: 'ENUMERATION_ATTACK',
        severity: 'CRITICAL',
        message: 'Card testing enumeration detected: decline ratio 24.5% (>20% threshold) across 315,000 attempts.',
        timestamp: '2026-11-11T16:30:00Z'
      },
      {
        id: 'alt-1003',
        merchantId: 'm-mid-001',
        type: 'TRANCHE_MATURED',
        severity: 'INFO',
        message: '30 tranches reached maturity ($45,800.00) and released to MATURED_RELEASED pool.',
        timestamp: '2026-11-11T15:00:00Z'
      }
    ];
    this.alerts.set(initial);

    // Listen to real-time control tower SSE
    this.sseSub = this.apiService.subscribeToControlTower().subscribe({
      next: (alert) => {
        this.alerts.update(prev => [alert, ...prev.slice(0, 49)]);
      },
      error: () => {
        this.activeSseConnected.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.sseSub) {
      this.sseSub.unsubscribe();
    }
  }
}
