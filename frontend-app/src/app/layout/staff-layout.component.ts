import { Component, computed, signal, HostListener, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
import { UnderwritingQueueService } from '@frontend/shared-api';
import { UserRole } from '@frontend/shared-models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: UserRole[];
}

@Component({
  selector: 'app-staff-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './staff-layout.component.html',
  styleUrl: './staff-layout.component.css'
})
export class StaffLayoutComponent implements OnDestroy {
  private queueSub?: Subscription;
  sidebarCollapsed = signal(false);
  navItems: NavItem[] = [
    { label: 'KYC Management', icon: '<span class="material-symbols-outlined align-middle">badge</span>', route: '/admin/kyc', roles: ['ROLE_ADMIN'] },
    { label: 'KYC Management', icon: '<span class="material-symbols-outlined align-middle">badge</span>', route: '/compliance/kyc', roles: ['ROLE_COMPLIANCE', 'ROLE_COMPLIANCE_OFFICER'] },
    { label: 'Underwriting', icon: '<span class="material-symbols-outlined align-middle">analytics</span>', route: '/underwriter/dashboard', roles: ['ROLE_UNDERWRITER', 'ROLE_ADMIN'] },
    { label: 'Claims Queue', icon: '<span class="material-symbols-outlined align-middle">folder_special</span>', route: '/claims-analyst/dashboard', roles: ['ROLE_CLAIMS_ANALYST', 'ROLE_ADMIN'] },
    { label: 'Investor CRM', icon: '<span class="material-symbols-outlined align-middle">groups</span>', route: '/admin/crm', roles: ['ROLE_ADMIN'] },
    { label: 'Investor CRM', icon: '<span class="material-symbols-outlined align-middle">groups</span>', route: '/underwriter/crm', roles: ['ROLE_UNDERWRITER'] },
    { label: 'Investor CRM', icon: '<span class="material-symbols-outlined align-middle">groups</span>', route: '/compliance/crm', roles: ['ROLE_COMPLIANCE', 'ROLE_COMPLIANCE_OFFICER'] },
    { label: 'Investor CRM', icon: '<span class="material-symbols-outlined align-middle">groups</span>', route: '/claims-analyst/crm', roles: ['ROLE_CLAIMS_ANALYST'] },
    { label: 'Create Team Member', icon: '<span class="material-symbols-outlined align-middle">person_add</span>', route: '/admin/create-staff', roles: ['ROLE_ADMIN'] },
  ];

  showNotifications = signal(false);
  @ViewChild('notificationBellContainer') notificationBellContainer?: ElementRef;

  visibleNavItems = computed(() => {
    const role = this.authService.userRole();
    if (!role) return [];
    return this.navItems.filter(item => item.roles.includes(role));
  });

  userName = computed(() => {
    const u = this.authService.user();
    if (u?.fullName && u.fullName.trim() !== '') return u.fullName;
    if (u?.email) {
      const prefix = u.email.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return 'Staff';
  });

  userInitial = computed(() => {
    const name = this.userName();
    return name ? name.charAt(0).toUpperCase() : 'S';
  });

  roleName = computed(() => {
    const role = this.authService.userRole();
    const map: Record<string, string> = {
      ROLE_UNDERWRITER: 'Underwriter',
      ROLE_CLAIMS_ANALYST: 'Claims Analyst',
      ROLE_COMPLIANCE: 'Compliance Officer',
      ROLE_COMPLIANCE_OFFICER: 'Compliance Officer',
      ROLE_ADMIN: 'Administrator',
    };
    return role ? map[role] ?? role : '';
  });

  pageTitle = computed(() => {
    const role = this.authService.userRole();
    if (role === 'ROLE_UNDERWRITER') return 'Underwriting Workspace';
    if (role === 'ROLE_CLAIMS_ANALYST') return 'Claims Command Center';
    if (role === 'ROLE_COMPLIANCE' || role === 'ROLE_COMPLIANCE_OFFICER') return 'Compliance Dashboard';
    if (role === 'ROLE_ADMIN') return 'Global Administration';
    return 'Staff Portal';
  });

  unreadCount = computed(() => {
    // Basic unread count based on notifications (assume all are new for now since backend doesn't track read state per se)
    return this.notificationService.notifications().length;
  });

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
    private underwritingQueue: UnderwritingQueueService,
    private eRef: ElementRef
  ) {
    const userId = this.authService.userId();
    if (userId) {
      this.notificationService.connect(userId);
    }

    // Real-time listener for underwriting & endorsement events across all staff pages
    this.queueSub = this.underwritingQueue.events$.subscribe((event) => {
      const role = this.authService.userRole();
      const isUnderwriterOrAdmin = role === 'ROLE_UNDERWRITER' || role === 'ROLE_ADMIN';
      if (!isUnderwriterOrAdmin) return;

      if (event.type === 'ENDORSEMENT_REGISTERED') {
        const payload = event.payload;
        const pNum = payload?.policyNumber || (payload?.policyId ? `POL-${payload.policyId.substring(0, 8).toUpperCase()}` : 'POL');
        const score = payload?.newRiskScore || 620;
        this.notificationService.addNotification(
          'High-Risk Endorsement Pending',
          `Policy ${pNum} has submitted a portfolio revision requiring actuarial review (Risk: ${score}/1000).`,
          'WARNING'
        );
      } else if (event.type === 'APPLICATION_SUBMITTED' && event.payload) {
        const app = event.payload;
        this.notificationService.addNotification(
          'New High-Risk Policy Application',
          `Application ${app.applicationId} submitted for actuarial review (Risk: ${app.riskScore}/1000).`,
          'WARNING'
        );
      }
    });
  }

  ngOnDestroy(): void {
    if (this.queueSub) {
      this.queueSub.unsubscribe();
    }
  }

  toggleNotifications(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
    }
    this.showNotifications.update(v => !v);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.showNotifications()) return;
    const target = event.target as HTMLElement;
    if (this.notificationBellContainer && !this.notificationBellContainer.nativeElement.contains(target)) {
      this.showNotifications.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.showNotifications()) {
      this.showNotifications.set(false);
    }
  }
}

