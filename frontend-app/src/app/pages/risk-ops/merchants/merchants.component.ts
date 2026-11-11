import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface MerchantDirectoryView {
  mid: string;
  legalName: string;
  mcc: string;
  descriptorPrefix: string;
  kybStatus: 'APPROVED' | 'IN_REVIEW' | 'REJECTED';
  riskTier: 'TIER_1_LOW' | 'TIER_2_MODERATE' | 'TIER_3_HIGH' | 'PROHIBITED';
  vampRatioPct: number;
  ctrBps: number;
}

@Component({
  selector: 'app-risk-merchants',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './merchants.component.html',
  styleUrls: ['./merchants.component.css']
})
export class RiskMerchantsComponent implements OnInit {
  merchants = signal<MerchantDirectoryView[]>([]);

  ngOnInit(): void {
    const mock: MerchantDirectoryView[] = [
      {
        mid: 'm-mid-001',
        legalName: 'Acme Global Technologies Inc.',
        mcc: '5734 (Software)',
        descriptorPrefix: 'ACMECO',
        kybStatus: 'APPROVED',
        riskTier: 'TIER_1_LOW',
        vampRatioPct: 1.12,
        ctrBps: 85.4
      },
      {
        mid: 'm-mid-002',
        legalName: 'Apex Digital Downloads LLC',
        mcc: '5817 (Digital Goods)',
        descriptorPrefix: 'APEXDL',
        kybStatus: 'APPROVED',
        riskTier: 'TIER_2_MODERATE',
        vampRatioPct: 1.62,
        ctrBps: 110.5
      },
      {
        mid: 'm-mid-003',
        legalName: 'Vanguard Gaming Network',
        mcc: '7995 (Gaming/Gambling)',
        descriptorPrefix: 'VANGAM',
        kybStatus: 'APPROVED',
        riskTier: 'TIER_3_HIGH',
        vampRatioPct: 2.35,
        ctrBps: 340.0
      }
    ];
    this.merchants.set(mock);
  }
}
