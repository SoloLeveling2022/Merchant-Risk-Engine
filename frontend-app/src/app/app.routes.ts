import { Routes } from '@angular/router';
import { authGuard, roleGuard, kycGuard, defaultRoleRedirectGuard, noAuthGuard } from '@frontend/shared-auth';
import { LayoutComponent } from './layout/layout.component';
import { StaffLayoutComponent } from './layout/staff-layout.component';

export const routes: Routes = [
  // ─── Public Routes ────────────────────
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent),
    pathMatch: 'full'
  },
  {
    path: 'login',
    redirectTo: 'auth/login',
    pathMatch: 'full'
  },
  {
    path: 'register',
    redirectTo: 'auth/register',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    children: [
      {
        path: 'login',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        canActivate: [noAuthGuard],
        loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ─── Protected Routes (inside Layout) ──
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      // KYC
      {
        path: 'kyc',
        loadComponent: () => import('./pages/kyc/kyc.component').then(m => m.KycComponent),
      },

      // ─── Investor Routes ─────────────
      {
        path: 'investor',
        canActivate: [roleGuard('ROLE_INVESTOR')],
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./pages/investor/dashboard/dashboard.component').then(m => m.InvestorDashboardComponent),
          },
          {
            path: 'portfolio',
            loadComponent: () => import('./pages/investor/portfolio/portfolio.component').then(m => m.PortfolioComponent),
          },
          {
            path: 'quotes',
            loadComponent: () => import('./pages/investor/quotes/quotes.component').then(m => m.QuotesComponent),
          },
          {
            path: 'policies',
            loadComponent: () => import('./pages/investor/policies/policies.component').then(m => m.PoliciesComponent),
          },
          {
            path: 'policies/:id',
            loadComponent: () => import('./pages/investor/policy-detail/policy-detail.component').then(m => m.PolicyDetailComponent),
          },
          {
            path: 'claims',
            loadComponent: () => import('./pages/investor/claims/claims.component').then(m => m.ClaimsComponent),
          },
          {
            path: 'documents',
            loadComponent: () => import('./pages/investor/documents/documents.component').then(m => m.DocumentsComponent),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },

      // Default redirect based on role
      { path: '', canActivate: [defaultRoleRedirectGuard], pathMatch: 'full', children: [] },
    ],
  },

  // ─── Protected Routes (Staff Layout) ──
  {
    path: '',
    component: StaffLayoutComponent,
    canActivate: [authGuard],
    children: [
      // ─── Underwriter Routes ──────────
      {
        path: 'underwriter',
        canActivate: [roleGuard('ROLE_UNDERWRITER', 'ROLE_ADMIN')],
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./pages/underwriter/dashboard/underwriter-dashboard.component').then(m => m.UnderwriterDashboardComponent),
          },
          {
            path: 'crm',
            loadComponent: () => import('./pages/admin/crm/admin-crm.component').then(m => m.AdminCrmComponent),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },

      // ─── Claims Analyst Routes ───────
      {
        path: 'claims-analyst',
        canActivate: [roleGuard('ROLE_CLAIMS_ANALYST', 'ROLE_ADMIN')],
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./pages/claims-analyst/dashboard/claims-analyst-dashboard.component').then(m => m.ClaimsAnalystDashboardComponent),
          },
          {
            path: 'crm',
            loadComponent: () => import('./pages/admin/crm/admin-crm.component').then(m => m.AdminCrmComponent),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },

      // ─── Compliance Routes ───────────
      {
        path: 'compliance',
        canActivate: [roleGuard('ROLE_COMPLIANCE', 'ROLE_COMPLIANCE_OFFICER', 'ROLE_ADMIN')],
        children: [
          {
            path: 'kyc',
            loadComponent: () => import('./pages/admin/kyc-management/admin-kyc-management.component').then(m => m.AdminKycManagementComponent),
          },
          {
            path: 'crm',
            loadComponent: () => import('./pages/admin/crm/admin-crm.component').then(m => m.AdminCrmComponent),
          },
          { path: '', redirectTo: 'kyc', pathMatch: 'full' },
        ],
      },

      // ─── Admin Routes ───────
      {
        path: 'admin',
        canActivate: [roleGuard('ROLE_ADMIN')],
        children: [
          {
            path: 'kyc',
            loadComponent: () => import('./pages/admin/kyc-management/admin-kyc-management.component').then(m => m.AdminKycManagementComponent),
          },
          {
            path: 'crm',
            loadComponent: () => import('./pages/admin/crm/admin-crm.component').then(m => m.AdminCrmComponent),
          },
          {
            path: 'create-staff',
            loadComponent: () => import('./pages/admin/create-staff/create-staff.component').then(m => m.CreateStaffComponent),
          }
        ]
      },

      // Default redirect based on role
      { path: '', canActivate: [defaultRoleRedirectGuard], pathMatch: 'full', children: [] },
    ],
  },

  // ─── Fallback ────────────────────────
  { path: 'unauthorized', loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent) },
  { path: '**', redirectTo: '' },
];
