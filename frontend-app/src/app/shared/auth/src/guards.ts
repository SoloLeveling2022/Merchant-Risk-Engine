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
      case 'ROLE_UNDERWRITER':
        return router.createUrlTree(['/underwriter/dashboard']);
      case 'ROLE_CLAIMS_ANALYST':
        return router.createUrlTree(['/claims-analyst/dashboard']);
      case 'ROLE_COMPLIANCE':
      case 'ROLE_COMPLIANCE_OFFICER':
        return router.createUrlTree(['/compliance/kyc']);
      case 'ROLE_ADMIN':
        return router.createUrlTree(['/underwriter/dashboard']);
      case 'ROLE_INVESTOR':
      default:
        return router.createUrlTree(['/investor/dashboard']);
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

    if (role && (allowedRoles.includes(role) || role === 'ROLE_ADMIN')) {
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
  return router.createUrlTree(['/kyc']);
};

export const defaultRoleRedirectGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Don't redirect on server as we don't have localstorage auth state
  if (isPlatformServer(platformId)) {
    // Only redirect if absolutely necessary on server, otherwise let it fall through
    return true; 
  }

  const role = authService.userRole();

  switch (role) {
    case 'ROLE_UNDERWRITER':
      return router.createUrlTree(['/underwriter/dashboard']);
    case 'ROLE_CLAIMS_ANALYST':
      return router.createUrlTree(['/claims-analyst/dashboard']);
    case 'ROLE_COMPLIANCE':
    case 'ROLE_COMPLIANCE_OFFICER':
      return router.createUrlTree(['/compliance/kyc']);
    case 'ROLE_ADMIN':
      return router.createUrlTree(['/underwriter/dashboard']);
    case 'ROLE_INVESTOR':
    default:
      return router.createUrlTree(['/investor/dashboard']);
  }
};
