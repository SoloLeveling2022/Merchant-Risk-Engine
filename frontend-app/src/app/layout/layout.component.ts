import { Component, computed, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Risk & Velocity Overview', icon: '<span class="material-symbols-outlined align-middle">speed</span>', route: '/merchant/dashboard', roles: ['ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE', 'ROLE_INVESTOR'] },
    { label: 'Rolling Reserve Tranches', icon: '<span class="material-symbols-outlined align-middle">account_balance</span>', route: '/merchant/reserves', roles: ['ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE', 'ROLE_INVESTOR'] },
    { label: 'Disputes & Chargebacks', icon: '<span class="material-symbols-outlined align-middle">gavel</span>', route: '/merchant/disputes', roles: ['ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE', 'ROLE_INVESTOR'] },
    { label: 'Payouts & Settlement', icon: '<span class="material-symbols-outlined align-middle">payments</span>', route: '/merchant/payouts', roles: ['ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE', 'ROLE_INVESTOR'] },
    { label: 'KYB & Business Profile', icon: '<span class="material-symbols-outlined align-middle">verified_user</span>', route: '/merchant/kyb', roles: ['ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE', 'ROLE_INVESTOR'] },
  ];

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
    return 'Acme Merchant';
  });

  userInitial = computed(() => {
    const name = this.userName();
    return name ? name.charAt(0).toUpperCase() : 'M';
  });

  roleName = computed(() => {
    const role = this.authService.userRole();
    const map: Record<string, string> = {
      ROLE_MERCHANT_OWNER: 'Merchant Owner',
      ROLE_MERCHANT_FINANCE: 'Merchant Finance',
      ROLE_RISK_ANALYST: 'Risk Analyst',
      ROLE_RISK_ADMIN: 'Risk Admin',
      ROLE_ADMIN: 'Administrator',
    };
    return role ? map[role] ?? role : 'Merchant Portal';
  });

  pageTitle = computed(() => 'Merchant Risk & Rolling Reserve Engine');

  kycBadgeClass = computed(() => {
    const status = this.authService.kycStatus();
    switch (status) {
      case 'VERIFIED':
      case 'APPROVED': return 'badge-success';
      case 'SUBMITTED':
      case 'PENDING': return 'badge-warning';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-success';
    }
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

  showNotifications = signal(false);
  @ViewChild('notificationBellContainer') notificationBellContainer?: ElementRef;

  unreadCount = computed(() => {
    return this.notificationService.notifications().length;
  });

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
