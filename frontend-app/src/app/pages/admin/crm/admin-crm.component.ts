import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ApiService } from '@frontend/shared-api';
import { UserDTO, PolicyDTO, ClaimDTO, PortfolioDTO } from '@frontend/shared-models';

@Component({
  selector: 'app-admin-crm',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-crm.component.html',
  styleUrl: './admin-crm.component.css'})
export class AdminCrmComponent implements OnInit {
  users = signal<any[]>([]);
  policies = signal<PolicyDTO[]>([]);
  claims = signal<ClaimDTO[]>([]);
  portfolios = signal<PortfolioDTO[]>([]);
  loading = signal(true);
  selectedInvestor = signal<any | null>(null);
  
  searchForm: FormGroup;
  searchQuerySignal = signal('');

  filteredUsers = computed(() => {
    const query = this.searchQuerySignal().toLowerCase().trim();
    if (!query) return this.users();
    
    return this.users().filter(u => 
      this.getName(u).toLowerCase().includes(query) || 
      (u.email || '').toLowerCase().includes(query) ||
      (u.phoneNumber || '').toLowerCase().includes(query) ||
      (u.userId || u.id || '').toLowerCase().includes(query)
    );
  });

  // Stats
  countInvestors = computed(() => this.users().length);
  countVerified = computed(() => this.users().filter(u => u.kycStatus === 'VERIFIED' || u.kycStatus === 'APPROVED').length);
  totalInsuredValue = computed(() => {
    return this.policies().reduce((sum, p) => sum + (p.insuredValue || p.totalInsuredValue || 0), 0);
  });
  totalActivePolicies = computed(() => {
    return this.policies().filter(p => p.status === 'ACTIVE' || p.policyStatus === 'ACTIVE').length;
  });

  constructor(private fb: FormBuilder, private api: ApiService) {
    this.searchForm = this.fb.group({
      searchQuery: ['']
    });
    this.searchForm.get('searchQuery')?.valueChanges.subscribe(val => {
      this.searchQuerySignal.set(val || '');
    });
  }

  ngOnInit() {
    this.loadData();
  }

  isStaff(user: any): boolean {
    if (!user) return false;

    // 1. Check persistent localStorage staff registry (created by Admin in Create Staff)
    try {
      const registry = JSON.parse(localStorage.getItem('platform_staff_registry') || '{}');
      if (user.email && registry[user.email.toLowerCase().trim()]) return true;
    } catch {}

    // 2. Check DB-persisted phoneNumber staff marker (e.g. 'STAFF:UNDERWRITER')
    if (user.phoneNumber && (user.phoneNumber.startsWith('STAFF:') || user.phoneNumber === 'STAFF')) {
      return true;
    }
    
    // 3. Check role if present
    const role = (user.role || '').toUpperCase();
    const staffRoles = [
      'ROLE_ADMIN', 'ROLE_UNDERWRITER', 'ROLE_COMPLIANCE', 
      'ROLE_COMPLIANCE_OFFICER', 'ROLE_CLAIMS_ANALYST',
      'ADMIN', 'UNDERWRITER', 'COMPLIANCE', 'CLAIMS_ANALYST', 'STAFF'
    ];
    if (staffRoles.includes(role)) return true;

    // 4. Check email keywords and seed demo staff accounts
    const email = (user.email || '').toLowerCase().trim();
    if (
      email.includes('admin') || 
      email.includes('underwriter') || 
      email.includes('claims') || 
      email.includes('compliance')
    ) {
      return true;
    }

    // 5. Check user_id keywords
    const uid = (user.userId || user.id || '').toLowerCase();
    if (
      uid.includes('admin') || 
      uid.includes('underwriter') || 
      uid.includes('claims') || 
      uid.includes('compliance')
    ) {
      return true;
    }

    // 6. Check names
    const fullName = `${user.firstName || ''} ${user.lastName || ''} ${user.fullName || ''}`.toLowerCase();
    if (
      fullName.includes('admin') || 
      fullName.includes('underwriter') || 
      fullName.includes('claims') || 
      fullName.includes('compliance')
    ) {
      return true;
    }

    return false;
  }

  loadData() {
    this.loading.set(true);
    // Fetch users, policies, claims, and portfolios concurrently
    this.api.getAllUsers().subscribe({
      next: (usersList) => {
        // Filter OUT staff roles and demo staff accounts
        const investors = (usersList || []).filter(u => !this.isStaff(u));
        // Sort latest registered users first (newest to oldest)
        const sortedInvestors = investors.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          if (timeA !== timeB) return timeB - timeA;
          return (b.userId || b.id || '').localeCompare(a.userId || a.id || '');
        });
        this.users.set(sortedInvestors);
        
        // Also load policies, claims, and portfolios
        this.api.getAllPolicies().subscribe({
          next: pols => this.policies.set(pols || []),
          error: () => this.policies.set([])
        });
        this.api.getAllClaims().subscribe({
          next: cls => this.claims.set(cls || []),
          error: () => this.claims.set([])
        });
        this.api.getAllPortfolios().subscribe({
          next: ports => this.portfolios.set(ports || []),
          error: () => this.portfolios.set([])
        });
        
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getName(user: any): string {
    if (user.fullName) return user.fullName;
    if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return 'Investor';
  }

  getInitial(user: any): string {
    const name = this.getName(user);
    if (name && name !== 'Investor') {
      return name.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'I';
  }

  getKycBadgeClass(status: string): string {
    const base = 'px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ';
    if (status === 'VERIFIED' || status === 'APPROVED') return base + 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'REJECTED') return base + 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    if (status === 'PENDING' || status === 'PENDING_VERIFICATION' || status === 'SUBMITTED') return base + 'bg-accent-500/15 text-accent-400 border-accent-500/30';
    return base + 'bg-surface-800 text-surface-200 border-surface-700';
  }

  getUserPolicies(userId: string): PolicyDTO[] {
    return this.policies().filter((p: PolicyDTO) => p.userId === userId);
  }

  getUserActivePolicies(userId: string): PolicyDTO[] {
    return this.policies().filter((p: PolicyDTO) => p.userId === userId && (p.status === 'ACTIVE' || p.policyStatus === 'ACTIVE'));
  }

  getUserInsuredValue(userId: string): number {
    return this.getUserPolicies(userId).reduce((sum, p) => sum + (p.insuredValue || p.totalInsuredValue || 0), 0);
  }

  getUserPremium(userId: string): number {
    return this.getUserPolicies(userId).reduce((sum, p) => sum + (p.annualPremium || p.premiumAmount || 0), 0);
  }

  getUserRiskScore(userId: string): number {
    const userPolicies = this.getUserPolicies(userId);
    if (userPolicies.length === 0) return 0;
    const totalRisk = userPolicies.reduce((sum: number, p: PolicyDTO) => sum + (p.riskScore || 0), 0);
    return Math.round(totalRisk / userPolicies.length);
  }

  getRiskColor(score: number): string {
    if (!score) return 'text-surface-200';
    if (score <= 250) return 'text-emerald-400';
    if (score <= 500) return 'text-blue-400';
    if (score <= 750) return 'text-accent-400';
    return 'text-rose-400';
  }

  getUserClaims(userId: string): ClaimDTO[] {
    return this.claims().filter((c: ClaimDTO) => c.userId === userId);
  }

  getUserPortfolios(userId: string): PortfolioDTO[] {
    return this.portfolios().filter((p: PortfolioDTO) => p.userId === userId);
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('en-IN').format(Math.round(val || 0));
  }

  openInvestorModal(user: any): void {
    this.selectedInvestor.set(user);
  }

  closeInvestorModal(): void {
    this.selectedInvestor.set(null);
  }
}

