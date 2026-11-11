import { CanActivateFn, Router } from '@angular/router';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { AuthService } from './auth.service';
import { UserRole } from '@frontend/shared-models';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) return true;

  if (authService.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/auth/login']);
};

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) return true;

  if (authService.isLoggedIn()) {
    const role = authService.userRole();
    switch (role) {
      case 'ROLE_RISK_ANALYST':
      case 'ROLE_RISK_ADMIN':
      case 'ROLE_ADMIN':
      case 'ROLE_UNDERWRITER':
      case 'ROLE_CLAIMS_ANALYST':
      case 'ROLE_COMPLIANCE':
        return router.createUrlTree(['/risk-ops/control-tower']);
      case 'ROLE_MERCHANT_FINANCE':
      case 'ROLE_MERCHANT_OWNER':
      case 'ROLE_INVESTOR':
      default:
        return router.createUrlTree(['/merchant/dashboard']);
    }
  }
  return true;
};

export const roleGuard = (...allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const platformId = inject(PLATFORM_ID);

    if (isPlatformServer(platformId)) return true;
    
    const role = authService.userRole();

    if (role && (allowedRoles.includes(role) || role === 'ROLE_ADMIN' || role === 'ROLE_RISK_ADMIN')) {
      return true;
    }
    return router.createUrlTree(['/unauthorized']);
  };
};

export const kycGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) return true;

  if (authService.isKycApproved()) {
    return true;
  }
  return router.createUrlTree(['/merchant/kyb']);
};

export const defaultRoleRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformServer(platformId)) return true;

  const role = authService.userRole();
  switch (role) {
    case 'ROLE_RISK_ANALYST':
    case 'ROLE_RISK_ADMIN':
    case 'ROLE_ADMIN':
      return router.createUrlTree(['/risk-ops/control-tower']);
    case 'ROLE_MERCHANT_OWNER':
    case 'ROLE_MERCHANT_FINANCE':
    default:
      return router.createUrlTree(['/merchant/dashboard']);
  }
};
