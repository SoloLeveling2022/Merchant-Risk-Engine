import { Injectable, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiService } from './api.service';

export interface MerchantRiskQueueItem {
  merchantId: string;
  legalEntity: string;
  mcc: string;
  holdRate: number;
  anomalyType: 'GMV_SPIKE' | 'AOV_SURGE' | 'FULFILLMENT_DROP' | 'REFUND_SURGE' | 'VAMP_ELEVATED';
  riskState: 'NORMAL' | 'ELEVATED_WATCH' | 'RESERVE_HIKE' | 'PAYOUT_FROZEN' | 'TERMINATED';
  recommendedHoldRate: number;
  flaggedAt: string;
}

@Injectable({ providedIn: 'root' })
export class UnderwritingQueueService {
  private queue = signal<MerchantRiskQueueItem[]>([
    {
      merchantId: 'm-mid-002',
      legalEntity: 'Apex Digital Downloads LLC',
      mcc: '5817',
      holdRate: 0.10,
      anomalyType: 'GMV_SPIKE',
      riskState: 'RESERVE_HIKE',
      recommendedHoldRate: 0.15,
      flaggedAt: '2026-11-11T14:30:00Z'
    },
    {
      merchantId: 'm-mid-003',
      legalEntity: 'Vanguard Gaming Network',
      mcc: '7995',
      holdRate: 0.15,
      anomalyType: 'VAMP_ELEVATED',
      riskState: 'PAYOUT_FROZEN',
      recommendedHoldRate: 0.20,
      flaggedAt: '2026-11-11T15:10:00Z'
    }
  ]);

  readonly activeQueue = this.queue.asReadonly();

  constructor(private apiService: ApiService) {}

  getPendingReviews(): Observable<MerchantRiskQueueItem[]> {
    return of(this.queue());
  }

  approveEscalation(merchantId: string, targetState: string, holdRate: number, justification: string): Observable<any> {
    return this.apiService.submitOpsOverride({
      merchantId,
      action: targetState,
      adjustedHoldRate: holdRate.toString(),
      reason: justification,
      analystId: 'analyst-ops-01'
    });
  }
}
