import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService, UnderwritingQueueService, EndorsementHoldingDiffItem } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { PortfolioDTO, PortfolioHoldingDTO, ManualHoldingItemDTO } from '@frontend/shared-models';

interface EditHoldingItem {
  symbol: string;
  quantity: number;
  averageBuyPrice: number;
  isNew?: boolean;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.css'
})
export class PortfolioComponent implements OnInit {
  portfolios = signal<PortfolioDTO[]>([]);
  selectedPortfolioHoldings = signal<Record<string, PortfolioHoldingDTO[]>>({});
  loading = signal(false);
  showUploadModal = signal(false);
  showKycBlockedModal = signal(false);
  uploadTab = signal<'manual' | 'csv'>('csv');
  portfolioName = '';
  errorMsg = signal('');
  manualHoldings: ManualHoldingItemDTO[] = [
    { tickerSymbol: 'RELIANCE', quantity: 100, averageBuyPrice: 2500 },
    { tickerSymbol: 'TCS', quantity: 50, averageBuyPrice: 3500 },
    { tickerSymbol: 'HDFCBANK', quantity: 200, averageBuyPrice: 1600 },
  ];
  csvFile: File | null = null;

  // Edit Modal State
  showEditModal = signal(false);
  editingPortfolioId = signal<string | null>(null);
  editPortfolioName = '';
  editHoldings: EditHoldingItem[] = [];
  originalEditHoldings: EditHoldingItem[] = [];
  editLoading = signal(false);
  editLoadingHoldings = signal(false);
  editErrorMsg = signal('');

  // Form Groups
  editForm: FormGroup;
  manualUploadForm: FormGroup;
  csvUploadForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    public authService: AuthService,
    public notificationService: NotificationService,
    private underwritingQueue: UnderwritingQueueService
  ) {
    this.editForm = this.fb.group({
      editPortfolioName: ['', Validators.required],
      holdings: this.fb.array([])
    });

    this.manualUploadForm = this.fb.group({
      portfolioName: ['', Validators.required],
      holdings: this.fb.array([])
    });

    this.csvUploadForm = this.fb.group({
      portfolioName: ['']
    });

    this.initManualHoldings();
  }

  get editHoldingsControl(): FormArray {
    return this.editForm.get('holdings') as FormArray;
  }

  get manualHoldingsControl(): FormArray {
    return this.manualUploadForm.get('holdings') as FormArray;
  }

  initManualHoldings() {
    this.manualHoldings.forEach(h => this.addRowData(h));
  }

  addRowData(holding: any) {
    this.manualHoldingsControl.push(this.fb.group({
      tickerSymbol: [holding.tickerSymbol],
      quantity: [holding.quantity],
      averageBuyPrice: [holding.averageBuyPrice]
    }));
  }

  ngOnInit(): void {
    this.loadPortfolios();
  }

  openUploadModal(): void {
    if (!this.authService.isKycApproved()) {
      this.showKycBlockedModal.set(true);
      return;
    }
    this.showUploadModal.set(true);
  }

  loadPortfolios(): void {
    const userId = this.authService.userId();
    if (!userId) return;
    this.api.getPortfoliosByUser(userId).subscribe({ next: (p) => this.portfolios.set(p) });
  }

  loadHoldings(portfolioId: string): void {
    if (!portfolioId) return;
    this.api.getPortfolioHoldings(portfolioId).subscribe({
      next: (holdings) => {
        this.selectedPortfolioHoldings.update(map => ({ ...map, [portfolioId]: holdings }));
      },
    });
  }

  openEditModal(portfolio: PortfolioDTO): void {
    const pId = portfolio.id || portfolio.portfolioId || '';
    if (!pId) return;

    this.editingPortfolioId.set(pId);
    this.editPortfolioName = portfolio.portfolioName;
    this.editForm.patchValue({ editPortfolioName: this.editPortfolioName });
    this.editHoldings = [];
    this.editHoldingsControl.clear();
    this.originalEditHoldings = [];
    this.editErrorMsg.set('');
    this.showEditModal.set(true);

    const cachedHoldings = this.selectedPortfolioHoldings()[pId];
    if (cachedHoldings && cachedHoldings.length > 0) {
      this.populateEditHoldings(cachedHoldings);
    } else {
      this.editLoadingHoldings.set(true);
      this.api.getPortfolioHoldings(pId).subscribe({
        next: (holdings) => {
          this.editLoadingHoldings.set(false);
          this.selectedPortfolioHoldings.update(map => ({ ...map, [pId]: holdings }));
          this.populateEditHoldings(holdings);
        },
        error: () => {
          this.editLoadingHoldings.set(false);
          this.editErrorMsg.set('Failed to fetch portfolio holdings.');
        }
      });
    }
  }

  private populateEditHoldings(holdings: PortfolioHoldingDTO[]): void {
    this.editHoldingsControl.clear();
    this.editHoldings = holdings.map(h => ({
      symbol: h.tickerSymbol || h.symbol || '',
      quantity: Number(h.quantity || 0),
      averageBuyPrice: Number(h.averageBuyPrice || h.averagePrice || 0),
      isNew: false
    }));
    this.editHoldings.forEach(h => {
      this.editHoldingsControl.push(this.fb.group({
        symbol: [h.symbol, Validators.required],
        quantity: [h.quantity, [Validators.required, Validators.min(1)]],
        averageBuyPrice: [h.averageBuyPrice, [Validators.required, Validators.min(0.01)]],
        isNew: [false]
      }));
    });
    this.originalEditHoldings = JSON.parse(JSON.stringify(this.editHoldings));
  }

  addEditHoldingRow(): void {
    this.editHoldingsControl.push(this.fb.group({
      symbol: ['', [Validators.required]],
      quantity: [100, [Validators.required, Validators.min(1)]],
      averageBuyPrice: [800, [Validators.required, Validators.min(0.01)]],
      isNew: [true]
    }));
  }

  removeEditHoldingRow(index: number): void {
    if (this.editHoldingsControl.length > 1) {
      this.editHoldingsControl.removeAt(index);
    }
  }

  calculateModalTotalValue(): number {
    if (!this.editHoldingsControl || !this.editHoldingsControl.controls) return 0;
    return this.editHoldingsControl.controls.reduce((sum, ctrl) => {
      const qty = Number(ctrl.value?.quantity || 0);
      const price = Number(ctrl.value?.averageBuyPrice || 0);
      return sum + (qty * price);
    }, 0);
  }

  submitEdit(): void {
    if (this.editForm.invalid) {
      this.editErrorMsg.set('Please fill out all required fields with valid quantities and prices.');
      return;
    }

    const pId = this.editingPortfolioId();
    if (!pId) return;

    const formValues = this.editForm.value;

    if (!formValues.editPortfolioName.trim()) {
      this.editErrorMsg.set('Portfolio name cannot be empty.');
      return;
    }

    const seenSymbols = new Set<string>();
    const payloadHoldings: { symbol: string; quantity: number; averagePrice: number }[] = [];

    for (const h of formValues.holdings) {
      const sym = (h.symbol || '').trim().toUpperCase();
      if (!sym) {
        this.editErrorMsg.set('All stock symbols must be filled.');
        return;
      }
      if (seenSymbols.has(sym)) {
        this.editErrorMsg.set(`Duplicate stock symbol "${sym}" detected. Please combine into a single row.`);
        return;
      }
      seenSymbols.add(sym);

      const qty = Number(h.quantity);
      if (isNaN(qty) || qty <= 0) {
        this.editErrorMsg.set(`Invalid quantity for ${sym}. Quantity must be at least 1.`);
        return;
      }

      const price = Number(h.averageBuyPrice);
      if (isNaN(price) || price <= 0) {
        this.editErrorMsg.set(`Invalid buy price for ${sym}. Price must be greater than 0.`);
        return;
      }

      payloadHoldings.push({
        symbol: sym,
        quantity: qty,
        averagePrice: price
      });
    }

    if (payloadHoldings.length === 0) {
      this.editErrorMsg.set('Portfolio must contain at least one stock holding.');
      return;
    }

    // Compute changed stock names & quantities
    const changedItems: string[] = [];
    payloadHoldings.forEach((h: any) => {
      const orig = (this.originalEditHoldings || []).find(o => o.symbol.toUpperCase() === h.symbol.toUpperCase());
      if (!orig) {
        changedItems.push(`Added ${h.symbol} (${h.quantity} shares @ ₹${h.averagePrice})`);
      } else if (Number(orig.quantity) !== Number(h.quantity) || Number(orig.averageBuyPrice) !== Number(h.averagePrice)) {
        changedItems.push(`${h.symbol}: ${orig.quantity} → ${h.quantity} shares`);
      }
    });

    const changeSummary = changedItems.length > 0 ? changedItems.join(', ') : 'Quantities updated';

    // Capture exact previous vs proposed holdings snapshot for underwriting diff verification
    const previousHoldings: EndorsementHoldingDiffItem[] = (this.originalEditHoldings || []).map(o => {
      const stillPresent = payloadHoldings.some(n => n.symbol.toUpperCase() === o.symbol.toUpperCase());
      return {
        symbol: o.symbol.toUpperCase(),
        quantity: Number(o.quantity || 0),
        averageBuyPrice: Number(o.averageBuyPrice || 0),
        totalValue: Number(o.quantity || 0) * Number(o.averageBuyPrice || 0),
        status: (stillPresent ? 'UNCHANGED' : 'REMOVED') as 'UNCHANGED' | 'REMOVED'
      };
    });

    const proposedHoldings: EndorsementHoldingDiffItem[] = payloadHoldings.map(n => {
      const orig = (this.originalEditHoldings || []).find(o => o.symbol.toUpperCase() === n.symbol.toUpperCase());
      const isNew = !orig;
      const isModified = Boolean(orig && (Number(orig.quantity) !== Number(n.quantity) || Number(orig.averageBuyPrice) !== Number(n.averagePrice)));
      const isHighBeta = ['NVDA', 'TSLA', 'ADANIENT', 'ADANIPORTS', 'SUZLON'].includes(n.symbol.toUpperCase());
      return {
        symbol: n.symbol.toUpperCase(),
        quantity: Number(n.quantity || 0),
        averageBuyPrice: Number(n.averagePrice || 0),
        totalValue: Number(n.quantity || 0) * Number(n.averagePrice || 0),
        status: (isNew ? 'ADDED' : (isModified ? 'MODIFIED' : 'UNCHANGED')) as 'ADDED' | 'MODIFIED' | 'UNCHANGED',
        oldQuantity: orig ? Number(orig.quantity) : undefined,
        oldPrice: orig ? Number(orig.averageBuyPrice) : undefined,
        oldTotalValue: orig ? (Number(orig.quantity) * Number(orig.averageBuyPrice)) : undefined,
        isHighRisk: isNew || isHighBeta || (orig && Number(n.quantity) > Number(orig.quantity) * 1.5)
      };
    });

    this.underwritingQueue.saveHoldingsSnapshot(pId, previousHoldings, proposedHoldings);

    this.editLoading.set(true);
    this.editErrorMsg.set('');

    this.api.updatePortfolio(pId, {
      portfolioName: formValues.editPortfolioName.trim(),
      holdings: payloadHoldings
    }).subscribe({
      next: () => {
        this.editLoading.set(false);
        this.showEditModal.set(false);
        this.loadPortfolios();
        this.loadHoldings(pId);
        // Clear ALL stale endorsement reviews for this policy (including previously approved/rejected)
        // so stale entries don't block the new pending tranche via loose matchesReview
        this.underwritingQueue.clearAllEndorsementReviewsForPolicy(pId);

        // Explicitly trigger re-underwriting so the backend creates the PENDING_ACCEPTANCE tranche
        // and sets policyStatus = ENDORSEMENT_PENDING — required for the underwriter queue to populate.
        this.api.reUnderwrite(pId).subscribe({
          next: () => {
            // After re-underwrite completes, wait briefly then sync endorsements into the queue
            setTimeout(() => {
              const uid = this.authService.userId();
              if (uid) {
                this.api.getPoliciesByUser(uid).subscribe({
                  next: (policies) => {
                    this.underwritingQueue.syncEndorsementsFromBackend(policies || []);
                  }
                });
              }
            }, 800);
          },
          error: () => {
            // re-underwrite failed (e.g. no policy for this portfolio yet) — still sync from backend
            setTimeout(() => {
              const uid = this.authService.userId();
              if (uid) {
                this.api.getPoliciesByUser(uid).subscribe({
                  next: (policies) => {
                    this.underwritingQueue.syncEndorsementsFromBackend(policies || []);
                  }
                });
              }
            }, 600);
          }
        });

        this.showToast(`Changed stocks: ${changeSummary}`);
      },
      error: (err) => {
        this.editLoading.set(false);
        this.editErrorMsg.set(err.error?.message || 'Failed to update portfolio.');
      }
    });
  }

  showToast(msg: string): void {
    this.notificationService.addToast('Portfolio Updated', msg, 'SUCCESS');
  }

  addRow(): void {
    this.manualHoldingsControl.push(this.fb.group({
      tickerSymbol: [''],
      quantity: [0],
      averageBuyPrice: [0]
    }));
  }

  submitManual(): void {
    if (!this.authService.isKycApproved()) {
      this.showKycBlockedModal.set(true);
      return;
    }
    const userId = this.authService.userId();
    if (!userId) return;
    this.loading.set(true);
    this.errorMsg.set('');

    const validHoldings = this.manualUploadForm.value.holdings.filter((h: any) => h.tickerSymbol && h.quantity > 0);
    this.api.uploadManualPortfolio({
      userId,
      portfolioName: this.manualUploadForm.value.portfolioName || 'My Equity Portfolio',
      holdings: validHoldings.map((h: any) => ({
        tickerSymbol: (h.tickerSymbol || '').toUpperCase(),
        assetName: h.tickerSymbol || 'Stock',
        quantity: Number(h.quantity),
        averageBuyPrice: Number(h.averageBuyPrice || 0)
      })),
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.showUploadModal.set(false);
        this.manualUploadForm.patchValue({ portfolioName: '' });
        this.loadPortfolios();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || err.error?.error?.message || 'Manual portfolio creation failed.');
      },
    });
  }

  onCsvSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.csvFile = input.files?.[0] ?? null;
    this.errorMsg.set('');
  }

  uploadCsv(): void {
    if (!this.authService.isKycApproved()) {
      this.showKycBlockedModal.set(true);
      return;
    }
    const userId = this.authService.userId();
    if (!userId || !this.csvFile) return;
    this.loading.set(true);
    this.errorMsg.set('');

    const name = this.csvUploadForm.value.portfolioName?.trim() || 'My CSV Equity Portfolio';
    this.api.uploadCsvPortfolio(userId, name, this.csvFile).subscribe({
      next: () => {
        this.loading.set(false);
        this.showUploadModal.set(false);
        this.csvFile = null;
        this.csvUploadForm.patchValue({ portfolioName: '' });
        this.loadPortfolios();
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || err.error?.error?.message || 'CSV Import failed. Please verify that the backend services are running and the CSV columns match symbol, quantity, averagePrice.');
      },
    });
  }

  simulateMarket(portfolioId: string): void {
    if (!portfolioId) return;
    this.api.simulateMarket(portfolioId).subscribe({
      next: () => {
        this.loadPortfolios();
        this.showToast('Simulated market fluctuation. Endorsement proposal updated!');
      }
    });
  }

  formatCurrency(value: number | undefined): string {
    return new Intl.NumberFormat('en-IN').format(value || 0);
  }
}
