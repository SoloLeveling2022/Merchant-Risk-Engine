import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const role = authService.userRole() || 'ROLE_INVESTOR';
  const userId = authService.userId() || 'usr-investor-001';

  const headers: Record<string, string> = {
    'X-User-Role': role,
    'X-User-Id': userId,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cloned = req.clone({ setHeaders: headers });
  return next(cloned);
};
