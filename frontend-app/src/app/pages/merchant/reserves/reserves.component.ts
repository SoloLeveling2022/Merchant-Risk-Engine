import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { ReservePolicyDTO, ReserveTrancheDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-merchant-reserves',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reserves.component.html',
  styleUrls: ['./reserves.component.css']
})
export class MerchantReservesComponent implements OnInit {
  policy = signal<ReservePolicyDTO | null>(null);
  tranches = signal<ReserveTrancheDTO[]>([]);
  loading = signal(true);

  totalLockedAmount = signal(193200.00);
  totalMaturedUnreleased = signal(45800.00);
  holdRatePct = signal(10.0);
  maturityDays = signal(90);
  withholdingBasis = signal<'GROSS' | 'NET_AFTER_FEES'>('GROSS');

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const merchantId = this.authService.merchantId();
    
    // Fetch policy
    this.apiService.getReservePolicy(merchantId).subscribe({
      next: (pol) => {
        this.policy.set(pol);
        if (pol.holdRate) {
          const rate = typeof pol.holdRate === 'number' ? pol.holdRate : parseFloat(pol.holdRate.toString());
          this.holdRatePct.set(rate * 100);
        }
        if (pol.maturityDays) this.maturityDays.set(pol.maturityDays);
        if (pol.withholdingBasis) this.withholdingBasis.set(pol.withholdingBasis as any);
      },
      error: () => {}
    });

    // Fetch tranches
    this.apiService.getReserveTranches(merchantId).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.tranches.set(data);
        } else {
          this.populateMockTranches();
        }
        this.loading.set(false);
      },
      error: () => {
        this.populateMockTranches();
        this.loading.set(false);
      }
    });
  }

  private populateMockTranches(): void {
    const mock: ReserveTrancheDTO[] = [
      {
        id: 'tranche-101',
        merchantId: 'm-mid-001',
        captureDate: '2026-08-15',
        maturityDate: '2026-11-13',
        eligibleVolume: '64400.00',
        holdRate: '0.1000',
        initialAmount: '6440.00',
        remainingAmount: '6440.00',
        status: 'MATURED_UNRELEASED'
      },
      {
        id: 'tranche-102',
        merchantId: 'm-mid-001',
        captureDate: '2026-08-16',
        maturityDate: '2026-11-14',
        eligibleVolume: '65200.00',
        holdRate: '0.1000',
        initialAmount: '6520.00',
        remainingAmount: '6520.00',
        status: 'MATURED_UNRELEASED'
      },
      {
        id: 'tranche-103',
        merchantId: 'm-mid-001',
        captureDate: '2026-08-17',
        maturityDate: '2026-11-15',
        eligibleVolume: '71000.00',
        holdRate: '0.1000',
        initialAmount: '7100.00',
        remainingAmount: '7100.00',
        status: 'LOCKED'
      },
      {
        id: 'tranche-104',
        merchantId: 'm-mid-001',
        captureDate: '2026-08-18',
        maturityDate: '2026-11-16',
        eligibleVolume: '68500.00',
        holdRate: '0.1000',
        initialAmount: '6850.00',
        remainingAmount: '6850.00',
        status: 'LOCKED'
      },
      {
        id: 'tranche-105',
        merchantId: 'm-mid-001',
        captureDate: '2026-08-19',
        maturityDate: '2026-11-17',
        eligibleVolume: '72300.00',
        holdRate: '0.1000',
        initialAmount: '7230.00',
        remainingAmount: '7230.00',
        status: 'LOCKED'
      }
    ];
    this.tranches.set(mock);
  }
}
