import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';

interface PayoutBatchView {
  id: string;
  batchDate: string;
  grossVolume: number;
  reserveDeduction: number;
  disputeDeduction: number;
  netPayout: number;
  status: 'PAID' | 'PROCESSING' | 'SCHEDULED' | 'FROZEN';
  currency: string;
}

@Component({
  selector: 'app-merchant-payouts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payouts.component.html',
  styleUrls: ['./payouts.component.css']
})
export class MerchantPayoutsComponent implements OnInit {
  payouts = signal<PayoutBatchView[]>([]);
  loading = signal(true);

  totalPaidYtd = signal(1480200.00);
  nextScheduledPayout = signal(125400.00);
  newMerchantHoldDaysRemaining = signal(0); // 0 means hold completed

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const mock: PayoutBatchView[] = [
      {
        id: 'payout-b-9901',
        batchDate: '2026-11-11',
        grossVolume: 145000.00,
        reserveDeduction: 14500.00,
        disputeDeduction: 2500.00,
        netPayout: 128000.00,
        status: 'PAID',
        currency: 'USD'
      },
      {
        id: 'payout-b-9902',
        batchDate: '2026-11-10',
        grossVolume: 138000.00,
        reserveDeduction: 13800.00,
        disputeDeduction: 0.00,
        netPayout: 124200.00,
        status: 'PAID',
        currency: 'USD'
      },
      {
        id: 'payout-b-9903',
        batchDate: '2026-11-09',
        grossVolume: 152000.00,
        reserveDeduction: 15200.00,
        disputeDeduction: 1250.00,
        netPayout: 135550.00,
        status: 'PAID',
        currency: 'USD'
      },
      {
        id: 'payout-b-9904',
        batchDate: '2026-11-12',
        grossVolume: 140000.00,
        reserveDeduction: 14000.00,
        disputeDeduction: 600.00,
        netPayout: 125400.00,
        status: 'PROCESSING',
        currency: 'USD'
      }
    ];
    this.payouts.set(mock);
    this.loading.set(false);
  }
}
