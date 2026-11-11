import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@frontend/shared-api';
import { DisputeCaseDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-risk-disputes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './disputes.component.html',
  styleUrls: ['./disputes.component.css']
})
export class RiskDisputesComponent implements OnInit {
  cases = signal<DisputeCaseDTO[]>([]);
  loading = signal(true);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    const mock: DisputeCaseDTO[] = [
      {
        id: 'dsp-case-8812',
        merchantId: 'm-mid-002',
        disputeRef: 'V-2026-99120',
        scheme: 'VISA',
        reasonCode: '10.4 (Card-Absent Fraud)',
        amount: '2500.00',
        currency: 'USD',
        status: 'CHARGEBACK_RECORDED',
        ce30Eligible: true,
        rdrResolved: false,
        createdAt: '2026-11-11T12:00:00Z'
      },
      {
        id: 'dsp-case-8813',
        merchantId: 'm-mid-003',
        disputeRef: 'MC-2026-44102',
        scheme: 'MASTERCARD',
        reasonCode: '4837 (Fraud / No Auth)',
        amount: '4200.00',
        currency: 'USD',
        status: 'PRE_ARBITRATION',
        ce30Eligible: false,
        rdrResolved: false,
        createdAt: '2026-11-10T16:20:00Z'
      }
    ];
    this.cases.set(mock);
    this.loading.set(false);
  }
}
