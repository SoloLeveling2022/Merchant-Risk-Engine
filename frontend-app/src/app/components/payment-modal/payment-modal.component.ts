import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ApiService } from '@frontend/shared-api';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.css'})
export class PaymentModalComponent {
  @Input() amount = 0;
  @Input() paymentType: 'INITIAL_PREMIUM' | 'RENEWAL_PREMIUM' = 'INITIAL_PREMIUM';
  @Input() targetId = ''; // quoteId or policyId depending on type
  
  @Output() paymentSuccess = new EventEmitter<any>();
  @Output() paymentCancel = new EventEmitter<void>();

  processing = signal(false);

  constructor(private api: ApiService) {}

  close() {
    if (this.processing()) return;
    this.paymentCancel.emit();
  }

  process() {
    this.processing.set(true);

    // Fake a 2-second delay for the sleek UI spinner effect
    setTimeout(() => {
      if (this.targetId && (this.targetId.startsWith('APP-UW-') || this.targetId.startsWith('TR-') || this.targetId.startsWith('tranche-') || this.targetId === 'ENDORSEMENT')) {
        this.processing.set(false);
        this.paymentSuccess.emit({ status: 'SUCCESS', mock: true, targetId: this.targetId });
        return;
      }

      if (this.paymentType === 'INITIAL_PREMIUM') {
        const req = { amount: this.amount, quoteId: this.targetId, transactionType: 'INITIAL_PREMIUM' };
        this.api.processPayment(req).subscribe({
          next: (res) => {
            this.processing.set(false);
            this.paymentSuccess.emit(res);
          },
          error: (err) => {
            this.processing.set(false);
            this.paymentCancel.emit();
          }
        });
      } else {
        this.api.payPremium(this.targetId).subscribe({
          next: (res) => {
            this.processing.set(false);
            this.paymentSuccess.emit(res);
          },
          error: (err) => {
            this.processing.set(false);
            this.paymentCancel.emit();
          }
        });
      }
    }, 2000);
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}
