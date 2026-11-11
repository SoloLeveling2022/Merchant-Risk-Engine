import { Component, computed, signal, HostListener, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '@frontend/shared-auth';
import { NotificationService } from '@frontend/shared-notifications';
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
    { label: 'Control Tower & Stream', icon: '<span class="material-symbols-outlined align-middle">radar</span>', route: '/risk-ops/control-tower', roles: ['ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN', 'ROLE_ADMIN'] },
    { label: 'Reserve Underwriting', icon: '<span class="material-symbols-outlined align-middle">analytics</span>', route: '/risk-ops/underwriting', roles: ['ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN', 'ROLE_ADMIN'] },
    { label: 'Dispute Arbitration', icon: '<span class="material-symbols-outlined align-middle">gavel</span>', route: '/risk-ops/disputes', roles: ['ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN', 'ROLE_ADMIN'] },
    { label: 'Double-Entry Ledger', icon: '<span class="material-symbols-outlined align-middle">account_balance</span>', route: '/risk-ops/ledger', roles: ['ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN', 'ROLE_ADMIN'] },
    { label: 'Merchant Portfolio', icon: '<span class="material-symbols-outlined align-middle">storefront</span>', route: '/risk-ops/merchants', roles: ['ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN', 'ROLE_ADMIN'] },
  ];

  showNotifications = signal(false);
  @ViewChild('notificationBellContainer') notificationBellContainer?: ElementRef;

  unreadCount = computed(() => {
    return this.notificationService.notifications().length;
  });

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
    return 'Risk Analyst';
  });

  userInitial = computed(() => {
    const name = this.userName();
    return name ? name.charAt(0).toUpperCase() : 'R';
  });

  roleName = computed(() => {
    const role = this.authService.userRole();
    const map: Record<string, string> = {
      ROLE_RISK_ANALYST: 'Risk Analyst',
      ROLE_RISK_ADMIN: 'Risk Admin',
      ROLE_ADMIN: 'Platform Administrator',
    };
    return role ? map[role] ?? role : 'Risk Operations';
  });

  pageTitle = computed(() => {
    const role = this.authService.userRole();
    if (role === 'ROLE_RISK_ADMIN' || role === 'ROLE_ADMIN') return 'Risk Operations Command Center';
    return 'Merchant Risk Ops Control Tower';
  });

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
  ) {
    const userId = this.authService.userId();
    if (userId) {
      this.notificationService.connect(userId);
    }
  }

  ngOnDestroy(): void {
    if (this.queueSub) {
      this.queueSub.unsubscribe();
    }
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.showNotifications.set(!this.showNotifications());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.showNotifications() &&
      this.notificationBellContainer &&
      !this.notificationBellContainer.nativeElement.contains(event.target)
    ) {
      this.showNotifications.set(false);
    }
  }
}
