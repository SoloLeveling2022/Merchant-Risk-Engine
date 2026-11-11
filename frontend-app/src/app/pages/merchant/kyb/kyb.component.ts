import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@frontend/shared-auth';

@Component({
  selector: 'app-merchant-kyb',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kyb.component.html',
  styleUrls: ['./kyb.component.css']
})
export class MerchantKybComponent implements OnInit {
  mid = signal('MID-992014-US');
  legalName = signal('Acme Global Technologies Inc.');
  dba = signal('Acme SaaS');
  mcc = signal('5734 (Computer Software & SaaS)');
  billingDescriptorPrefix = signal('ACMECO');
  kybStatus = signal<'APPROVED' | 'IN_REVIEW' | 'PENDING'>('APPROVED');
  taxId = signal('XX-XXX4910');
  incorporationDate = signal('2021-04-12');
  jurisdiction = signal('Delaware, United States');

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Loaded
  }
}
