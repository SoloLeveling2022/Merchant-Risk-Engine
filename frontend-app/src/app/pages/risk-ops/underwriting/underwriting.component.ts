import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '@frontend/shared-api';

interface MerchantRiskProfileView {
  merchantId: string;
  businessName: string;
  mcc: string;
  riskScore: number;
  holdRatePct: number;
  gmvGrowth7d: number;
  aovSigma: number;
  fulfillmentPct: number;
  refundPct: number;
  state: 'NORMAL' | 'ELEVATED_WATCH' | 'RESERVE_HIKE' | 'PAYOUT_FROZEN' | 'TERMINATED';
}

@Component({
  selector: 'app-risk-underwriting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './underwriting.component.html',
  styleUrls: ['./underwriting.component.css']
})
export class RiskUnderwritingComponent implements OnInit {
  merchants = signal<MerchantRiskProfileView[]>([]);
  showOverrideModal = signal(false);
  selectedMerchantId = signal('');
  overrideAction = signal<'FORCE_NORMAL' | 'HIKE_RESERVE' | 'FREEZE_PAYOUT' | 'UNFREEZE'>('HIKE_RESERVE');
  overrideHoldRate = signal(15);
  overrideReason = signal('');

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    const mock: MerchantRiskProfileView[] = [
      {
        merchantId: 'm-mid-001',
        businessName: 'Acme Global Technologies Inc.',
        mcc: '5734',
        riskScore: 35,
        holdRatePct: 10.0,
        gmvGrowth7d: 1.15,
        aovSigma: 0.8,
        fulfillmentPct: 99.4,
        refundPct: 0.4,
        state: 'NORMAL'
      },
      {
        merchantId: 'm-mid-002',
        businessName: 'Apex Digital Downloads LLC',
        mcc: '5817',
        riskScore: 78,
        holdRatePct: 15.0,
        gmvGrowth7d: 2.85, // Spike!
        aovSigma: 3.1, // Surge!
        fulfillmentPct: 96.2, // Below 98%!
        refundPct: 1.8, // Above 1%!
        state: 'RESERVE_HIKE'
      },
      {
        merchantId: 'm-mid-003',
        businessName: 'Vanguard Gaming Network',
        mcc: '7995',
        riskScore: 92,
        holdRatePct: 20.0,
        gmvGrowth7d: 3.4,
        aovSigma: 4.2,
        fulfillmentPct: 94.0,
        refundPct: 3.2,
        state: 'PAYOUT_FROZEN'
      }
    ];
    this.merchants.set(mock);
  }

  openOverride(mId: string): void {
    this.selectedMerchantId.set(mId);
    this.showOverrideModal.set(true);
  }

  submitOverride(): void {
    if (!this.overrideReason().trim()) return;
    this.apiService.submitOpsOverride({
      merchantId: this.selectedMerchantId(),
      action: this.overrideAction(),
      adjustedHoldRate: (this.overrideHoldRate() / 100).toString(),
      reason: this.overrideReason(),
      analystId: 'analyst-ops-01'
    }).subscribe({
      next: () => {
        this.showOverrideModal.set(false);
        this.overrideReason.set('');
      },
      error: () => {
        this.showOverrideModal.set(false);
      }
    });
  }
}
