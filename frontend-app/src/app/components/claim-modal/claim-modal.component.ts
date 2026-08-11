import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-claim-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './claim-modal.component.html',
  styleUrl: './claim-modal.component.css'})
export class ClaimModalComponent {
  @Input() maxPayout = 0;
  
  @Output() claimSubmit = new EventEmitter<{ amount: number, reason: string }>();
  @Output() claimCancel = new EventEmitter<void>();

  claimForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.claimForm = this.fb.group({
      claimAmount: [0, [Validators.required, Validators.min(1)]],
      crashReason: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  close() {
    this.claimCancel.emit();
  }

  submit() {
    if (this.isValid()) {
      this.claimSubmit.emit({ amount: this.claimForm.value.claimAmount, reason: this.claimForm.value.crashReason });
    }
  }

  isValid(): boolean {
    const amount = this.claimForm.value.claimAmount;
    const reason = this.claimForm.value.crashReason;
    return this.claimForm.valid && amount > 0 && amount <= this.maxPayout && reason.trim().length > 0;
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}
