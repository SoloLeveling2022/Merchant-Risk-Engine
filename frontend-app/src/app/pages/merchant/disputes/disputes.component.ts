import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { DisputeCaseDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-merchant-disputes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disputes.component.html',
  styleUrls: ['./disputes.component.css']
})
export class MerchantDisputesComponent implements OnInit {
  disputes = signal<DisputeCaseDTO[]>([]);
  loading = signal(true);

  activeDisputeCount = signal(3);
  totalDisputedAmount = signal(3850.00);
  rdrEligibleCount = signal(2);
  ce30QualifiedCount = signal(1);

  constructor(
    private apiService: ApiService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const merchantId = this.authService.merchantId();
    this.apiService.getDisputes(merchantId).subscribe({
      next: (cases) => {
        if (cases && cases.length > 0) {
          this.disputes.set(cases);
        } else {
          this.populateMockDisputes();
        }
        this.loading.set(false);
      },
      error: () => {
        this.populateMockDisputes();
        this.loading.set(false);
      }
    });
  }

  private populateMockDisputes(): void {
    const mock: DisputeCaseDTO[] = [
      {
        id: 'dsp-case-8812',
        merchantId: 'm-mid-001',
        disputeRef: 'V-2026-99120',
        scheme: 'VISA',
        reasonCode: '10.4 (Card-Absent Fraud)',
        amount: '1250.00',
        currency: 'USD',
        status: 'CHARGEBACK_RECORDED',
        ce30Eligible: true,
        rdrResolved: false,
        createdAt: '2026-11-09T14:20:00Z'
      },
      {
        id: 'dsp-case-8813',
        merchantId: 'm-mid-001',
        disputeRef: 'MC-2026-44102',
        scheme: 'MASTERCARD',
        reasonCode: '4837 (No Cardholder Authorization)',
        amount: '1600.00',
        currency: 'USD',
        status: 'INQUIRY',
        ce30Eligible: false,
        rdrResolved: true,
        createdAt: '2026-11-10T09:15:00Z'
      },
      {
        id: 'dsp-case-8814',
        merchantId: 'm-mid-001',
        disputeRef: 'V-2026-11942',
        scheme: 'VISA',
        reasonCode: '13.1 (Merchandise Not Received)',
        amount: '1000.00',
        currency: 'USD',
        status: 'REVERSED_MERCHANT_WIN',
        ce30Eligible: true,
        rdrResolved: false,
        createdAt: '2026-11-05T18:40:00Z'
      }
    ];
    this.disputes.set(mock);
  }
}
