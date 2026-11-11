import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '@frontend/shared-api';
import { TrialBalanceReportDTO } from '@frontend/shared-models';

interface LedgerAccountView {
  accountNumber: string;
  accountType: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

@Component({
  selector: 'app-risk-ledger',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ledger.component.html',
  styleUrls: ['./ledger.component.css']
})
export class RiskLedgerComponent implements OnInit {
  trialBalance = signal<TrialBalanceReportDTO | null>(null);
  accounts = signal<LedgerAccountView[]>([]);
  totalDebits = signal(4850000.00);
  totalCredits = signal(4850000.00);
  isBalanced = signal(true);

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    const mockAccounts: LedgerAccountView[] = [
      {
        accountNumber: '1010-CLEARING-USD',
        accountType: 'CARD_NETWORK_CLEARING_ASSET',
        normalBalance: 'DEBIT',
        totalDebits: 2500000.00,
        totalCredits: 120000.00,
        netBalance: 2380000.00
      },
      {
        accountNumber: '2010-SETTLEMENT-USD',
        accountType: 'MERCHANT_SETTLEMENT_ACCOUNT',
        normalBalance: 'CREDIT',
        totalDebits: 1400000.00,
        totalCredits: 2200000.00,
        netBalance: 800000.00
      },
      {
        accountNumber: '2020-ESCROW-RESERVE',
        accountType: 'ROLLING_RESERVE_ESCROW',
        normalBalance: 'CREDIT',
        totalDebits: 150000.00,
        totalCredits: 1450000.00,
        netBalance: 1300000.00
      },
      {
        accountNumber: '2030-CB-LIABILITY',
        accountType: 'CHARGEBACK_LIABILITY_ACCOUNT',
        normalBalance: 'CREDIT',
        totalDebits: 600000.00,
        totalCredits: 820000.00,
        netBalance: 220000.00
      },
      {
        accountNumber: '4010-NETWORK-FEES',
        accountType: 'FEE_ACCOUNT',
        normalBalance: 'CREDIT',
        totalDebits: 200000.00,
        totalCredits: 260000.00,
        netBalance: 60000.00
      }
    ];
    this.accounts.set(mockAccounts);
    this.isBalanced.set(this.totalDebits() === this.totalCredits());
  }
}
