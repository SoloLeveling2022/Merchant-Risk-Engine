import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { SchemeRatioReportDTO, ReservePolicyDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-merchant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class MerchantDashboardComponent implements OnInit {
  ratios = signal<SchemeRatioReportDTO | null>(null);
  policy = signal<ReservePolicyDTO | null>(null);
  loading = signal(true);

  // Live Metrics
  vampRatio = signal(1.12); // %
  vampStatus = signal<'NORMAL' | 'ELEVATED' | 'BREACH'>('NORMAL');
  mastercardCtrBps = signal(85.4); // bps
  lockedEscrow = signal(193200.00);
  maturedAvailable = signal(45800.00);
  holdRatePct = signal(10.0);
  settlementAccountBalance = signal(125400.00);
  operationalState = signal<'NORMAL' | 'ELEVATED_WATCH' | 'RESERVE_HIKE' | 'PAYOUT_FROZEN' | 'TERMINATED'>('NORMAL');

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const merchantId = this.authService.merchantId();
    this.apiService.getSchemeRatios(merchantId).subscribe({
      next: (res) => {
        this.ratios.set(res);
        if (res.vampRatio) {
          const pct = parseFloat(res.vampRatio.toString()) * 100;
          this.vampRatio.set(pct);
          this.vampStatus.set(pct >= 1.5 ? 'BREACH' : pct >= 1.2 ? 'ELEVATED' : 'NORMAL');
        }
        if (res.ctrBps) {
          this.mastercardCtrBps.set(parseFloat(res.ctrBps.toString()));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });

    this.apiService.getReservePolicy(merchantId).subscribe({
      next: (pol) => {
        this.policy.set(pol);
        if (pol.holdRate) {
          const rate = typeof pol.holdRate === 'number' ? pol.holdRate : parseFloat(pol.holdRate.toString());
          this.holdRatePct.set(rate * 100);
        }
      },
      error: () => {}
    });
  }
}
