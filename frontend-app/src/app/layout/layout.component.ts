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
    { label: 'KYC Verification', icon: '<span class="material-symbols-outlined align-middle">badge</span>', route: '/kyc', roles: ['ROLE_INVESTOR'] },
    { label: 'Overview', icon: '<span class="material-symbols-outlined align-middle">bar_chart</span>', route: '/investor/dashboard', roles: ['ROLE_INVESTOR'] },
    { label: 'My Portfolio', icon: '<span class="material-symbols-outlined align-middle">work</span>', route: '/investor/portfolio', roles: ['ROLE_INVESTOR'] },
    { label: 'Quotes & Risk', icon: '<span class="material-symbols-outlined align-middle">content_paste</span>', route: '/investor/quotes', roles: ['ROLE_INVESTOR'] },
    { label: 'My Policies', icon: '<span class="material-symbols-outlined align-middle">shield</span>', route: '/investor/policies', roles: ['ROLE_INVESTOR'] },
    { label: 'Claims', icon: '<span class="material-symbols-outlined align-middle">edit_document</span>', route: '/investor/claims', roles: ['ROLE_INVESTOR'] },
    { label: 'Documents', icon: '<span class="material-symbols-outlined align-middle">description</span>', route: '/investor/documents', roles: ['ROLE_INVESTOR'] },
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
    return 'User';
  });

  userInitial = computed(() => {
    const name = this.userName();
    return name ? name.charAt(0).toUpperCase() : 'U';
  });

  roleName = computed(() => {
    const role = this.authService.userRole();
    const map: Record<string, string> = {
      ROLE_INVESTOR: 'Investor',
      ROLE_UNDERWRITER: 'Underwriter',
      ROLE_CLAIMS_ANALYST: 'Claims Analyst',
      ROLE_COMPLIANCE: 'Compliance Officer',
      ROLE_COMPLIANCE_OFFICER: 'Compliance Officer',
      ROLE_ADMIN: 'Administrator',
    };
    return role ? map[role] ?? role : '';
  });

  pageTitle = computed(() => 'Stock Market Insurance Platform');

  kycBadgeClass = computed(() => {
    const status = this.authService.kycStatus();
    switch (status) {
      case 'VERIFIED':
      case 'APPROVED': return 'badge-success';
      case 'SUBMITTED':
      case 'PENDING': return 'badge-warning';
      case 'REJECTED': return 'badge-danger';
      default: return 'badge-info';
    }
  });

  constructor(
    public authService: AuthService,
    public notificationService: NotificationService,
  ) {
    // Connect SSE on layout init
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

