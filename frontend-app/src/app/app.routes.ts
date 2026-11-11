import { Routes } from '@angular/router';
import { authGuard, roleGuard, defaultRoleRedirectGuard, noAuthGuard } from '@frontend/shared-auth';
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

  // ─── Protected Merchant Routes (LayoutComponent) ──
  {
    path: 'merchant',
    component: LayoutComponent,
    canActivate: [authGuard, roleGuard('ROLE_MERCHANT_OWNER', 'ROLE_MERCHANT_FINANCE')],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/merchant/dashboard/dashboard.component').then(m => m.MerchantDashboardComponent),
      },
      {
        path: 'reserves',
        loadComponent: () => import('./pages/merchant/reserves/reserves.component').then(m => m.MerchantReservesComponent),
      },
      {
        path: 'disputes',
        loadComponent: () => import('./pages/merchant/disputes/disputes.component').then(m => m.MerchantDisputesComponent),
      },
      {
        path: 'payouts',
        loadComponent: () => import('./pages/merchant/payouts/payouts.component').then(m => m.MerchantPayoutsComponent),
      },
      {
        path: 'kyb',
        loadComponent: () => import('./pages/merchant/kyb/kyb.component').then(m => m.MerchantKybComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // Backward compatibility alias for /kyb
  {
    path: 'kyb',
    redirectTo: 'merchant/kyb',
    pathMatch: 'full'
  },

  // ─── Protected Risk Ops Routes (StaffLayoutComponent) ──
  {
    path: 'risk-ops',
    component: StaffLayoutComponent,
    canActivate: [authGuard, roleGuard('ROLE_RISK_ANALYST', 'ROLE_RISK_ADMIN')],
    children: [
      {
        path: 'control-tower',
        loadComponent: () => import('./pages/risk-ops/control-tower/control-tower.component').then(m => m.RiskControlTowerComponent),
      },
      {
        path: 'underwriting',
        loadComponent: () => import('./pages/risk-ops/underwriting/underwriting.component').then(m => m.RiskUnderwritingComponent),
      },
      {
        path: 'disputes',
        loadComponent: () => import('./pages/risk-ops/disputes/disputes.component').then(m => m.RiskDisputesComponent),
      },
      {
        path: 'ledger',
        loadComponent: () => import('./pages/risk-ops/ledger/ledger.component').then(m => m.RiskLedgerComponent),
      },
      {
        path: 'merchants',
        loadComponent: () => import('./pages/risk-ops/merchants/merchants.component').then(m => m.RiskMerchantsComponent),
      },
      { path: '', redirectTo: 'control-tower', pathMatch: 'full' },
    ],
  },

  // ─── Legacy Route Aliases ──
  { path: 'investor', redirectTo: 'merchant/dashboard', pathMatch: 'prefix' },
  { path: 'underwriter', redirectTo: 'risk-ops/underwriting', pathMatch: 'prefix' },
  { path: 'claims-analyst', redirectTo: 'risk-ops/disputes', pathMatch: 'prefix' },
  { path: 'compliance', redirectTo: 'risk-ops/merchants', pathMatch: 'prefix' },
  { path: 'admin', redirectTo: 'risk-ops/control-tower', pathMatch: 'prefix' },

  // ─── Unauthorized & Fallback ──
  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent),
  },
  {
    path: '**',
    canActivate: [defaultRoleRedirectGuard],
    children: []
  }
];
