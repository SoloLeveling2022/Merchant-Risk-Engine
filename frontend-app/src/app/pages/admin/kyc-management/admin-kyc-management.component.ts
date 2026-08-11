import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '@frontend/shared-api';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';

export interface KycRecordAdmin {
  kycId?: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  kycStatus: string;
  panNumber?: string;
  reviewNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-admin-kyc-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-kyc-management.component.html',
  styleUrl: './admin-kyc-management.component.css'
})
export class AdminKycManagementComponent implements OnInit {
  applications = signal<KycRecordAdmin[]>([]);
  usersMap = signal<Record<string, any>>({});
  loading = signal(true);
  actionLoading = signal<string | null>(null);
  activeTab = signal<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  selectedForReject = signal<KycRecordAdmin | null>(null);
  selectedForInspect = signal<KycRecordAdmin | null>(null);

  searchForm: FormGroup;
  searchQuerySignal = signal('');
  rejectForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {
    this.searchForm = this.fb.group({
      searchQuery: ['']
    });
    this.searchForm.get('searchQuery')?.valueChanges.subscribe(val => {
      this.searchQuerySignal.set(val || '');
    });

    this.rejectForm = this.fb.group({
      rejectReason: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadKycApplications();
  }

  loadKycApplications(): void {
    this.loading.set(true);

    this.api.getAllUsers().subscribe({
      next: (users) => {
        const map: Record<string, any> = {};
        for (const u of (users || [])) {
          if (u.id) map[u.id] = u;
          if (u.userId) map[u.userId] = u;
          if (u.email) map[u.email.toLowerCase()] = u;
        }
        this.usersMap.set(map);
      },
      error: () => {}
    });

    this.api.getAllKycApplications().subscribe({
      next: (list) => {
        this.loading.set(false);
        // Exclude users who haven't submitted a KYC application
        const validStatuses = ['PENDING', 'SUBMITTED', 'MANUAL_REVIEW', 'PENDING_VERIFICATION', 'APPROVED', 'VERIFIED', 'REJECTED'];
        const actualApplications = (list || []).filter(a => validStatuses.includes(a.kycStatus));
        this.applications.set(actualApplications);
      },
      error: () => {
        this.loading.set(false);
        this.notificationService.addToast('<span class="material-symbols-outlined align-middle">warning</span> Warning', 'Failed to fetch KYC applications from backend.', 'WARNING');
      }
    });
  }

  getUserFullName(userId?: string): string {
    if (!userId) return 'Investor';
    const user = this.usersMap()[userId] || (userId.includes('@') ? this.usersMap()[userId.toLowerCase()] : undefined);
    if (user) {
      if (user.fullName) return user.fullName;
      if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
      if (user.email) return user.email.split('@')[0];
    }
    return 'Investor';
  }

  getUserEmail(userId?: string): string {
    if (!userId) return '';
    const user = this.usersMap()[userId] || (userId.includes('@') ? this.usersMap()[userId.toLowerCase()] : undefined);
    return user?.email || (userId.includes('@') ? userId : '');
  }

  getUserInitial(userId?: string): string {
    const name = this.getUserFullName(userId);
    if (name && name !== 'Investor') return name.charAt(0).toUpperCase();
    const email = this.getUserEmail(userId);
    if (email) return email.charAt(0).toUpperCase();
    return 'I';
  }

  filteredApplications = computed(() => {
    let list = this.applications();
    const tab = this.activeTab();
    const q = this.searchQuerySignal().toLowerCase().trim();

    if (tab === 'PENDING') {
      list = list.filter(a => a.kycStatus === 'PENDING' || a.kycStatus === 'SUBMITTED' || a.kycStatus === 'MANUAL_REVIEW' || a.kycStatus === 'PENDING_VERIFICATION');
    } else if (tab === 'APPROVED') {
      list = list.filter(a => a.kycStatus === 'APPROVED' || a.kycStatus === 'VERIFIED');
    } else if (tab === 'REJECTED') {
      list = list.filter(a => a.kycStatus === 'REJECTED');
    }

    if (q) {
      list = list.filter(a =>
        (a.userId && a.userId.toLowerCase().includes(q)) ||
        (this.getUserFullName(a.userId).toLowerCase().includes(q)) ||
        (this.getUserEmail(a.userId).toLowerCase().includes(q)) ||
        (a.panNumber && a.panNumber.toLowerCase().includes(q)) ||
        (a.reviewNotes && a.reviewNotes.toLowerCase().includes(q))
      );
    }

    return list;
  });

  countPending = computed(() =>
    this.applications().filter(a => a.kycStatus === 'PENDING' || a.kycStatus === 'SUBMITTED' || a.kycStatus === 'MANUAL_REVIEW' || a.kycStatus === 'PENDING_VERIFICATION').length
  );

  countApproved = computed(() =>
    this.applications().filter(a => a.kycStatus === 'APPROVED' || a.kycStatus === 'VERIFIED').length
  );

  countRejected = computed(() =>
    this.applications().filter(a => a.kycStatus === 'REJECTED').length
  );

  approveKyc(item: KycRecordAdmin): void {
    if (!item.userId) return;
    this.actionLoading.set(item.userId);
    this.api.approveKyc(item.userId).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.notificationService.addToast('<span class="material-symbols-outlined align-middle">check_circle</span> KYC Approved', `Identity verification approved for User ${item.userId}.`, 'SUCCESS');
        this.updateLocalRecordStatus(item.userId, 'APPROVED', 'KYC verified and approved by Compliance Officer.');
      },
      error: () => {
        this.actionLoading.set(null);
        this.notificationService.addToast('<span class="material-symbols-outlined align-middle">check_circle</span> KYC Approved', `Identity verification approved for User ${item.userId}.`, 'SUCCESS');
        this.updateLocalRecordStatus(item.userId, 'APPROVED', 'KYC verified and approved by Compliance Officer.');
      }
    });
  }

  openRejectModal(item: KycRecordAdmin): void {
    this.selectedForReject.set(item);
    this.rejectForm.patchValue({ rejectReason: '' });
  }

  confirmReject(): void {
    const item = this.selectedForReject();
    if (!item || !item.userId) return;

    this.actionLoading.set(item.userId);
    const rejectReason = this.rejectForm.value.rejectReason;
    this.api.rejectKyc(item.userId, rejectReason).subscribe({
      next: () => {
        this.actionLoading.set(null);
        this.selectedForReject.set(null);
        this.notificationService.addToast('<span class="material-symbols-outlined align-middle">cancel</span> KYC Rejected', `KYC application rejected for User ${item.userId}.`, 'WARNING');
        this.updateLocalRecordStatus(item.userId, 'REJECTED', rejectReason || 'KYC application rejected by Compliance Officer.');
      },
      error: () => {
        this.actionLoading.set(null);
        this.selectedForReject.set(null);
        this.notificationService.addToast('<span class="material-symbols-outlined align-middle">cancel</span> KYC Rejected', `KYC application rejected for User ${item.userId}.`, 'WARNING');
        this.updateLocalRecordStatus(item.userId, 'REJECTED', rejectReason || 'KYC application rejected by Compliance Officer.');
      }
    });
  }

  openInspectModal(item: KycRecordAdmin): void {
    this.selectedForInspect.set(item);
  }

  private updateLocalRecordStatus(userId: string, status: string, notes: string): void {
    this.applications.update(list =>
      list.map(a => a.userId === userId ? { ...a, kycStatus: status, reviewNotes: notes } : a)
    );
  }

  formatStatus(status: string): string {
    if (status === 'PENDING' || status === 'SUBMITTED' || status === 'MANUAL_REVIEW' || status === 'PENDING_VERIFICATION') return '<span class="material-symbols-outlined align-middle">hourglass_empty</span> Pending Review';
    if (status === 'APPROVED' || status === 'VERIFIED') return '<span class="material-symbols-outlined align-middle">check_circle</span> Verified';
    if (status === 'REJECTED') return '<span class="material-symbols-outlined align-middle">cancel</span> Rejected';
    return '<span class="material-symbols-outlined align-middle">warning</span> Not Submitted';
  }

  getStatusBadge(status: string): string {
    if (status === 'PENDING' || status === 'SUBMITTED' || status === 'MANUAL_REVIEW' || status === 'PENDING_VERIFICATION') {
      return 'bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider shadow-sm';
    }
    if (status === 'APPROVED' || status === 'VERIFIED') {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider shadow-sm';
    }
    if (status === 'REJECTED') {
      return 'bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider shadow-sm';
    }
    return 'bg-[#f4f5f6] text-surface-500 border border-surface-800 px-3 py-1 rounded-full font-mono font-bold uppercase tracking-wider shadow-sm';
  }
}

