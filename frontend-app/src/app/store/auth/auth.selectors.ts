import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectCurrentUser = createSelector(
  selectAuthState,
  (state: AuthState) => state?.user ?? null
);

export const selectIsLoggedIn = createSelector(
  selectAuthState,
  (state: AuthState) => state?.isLoggedIn ?? false
);

export const selectUserRole = createSelector(
  selectAuthState,
  (state: AuthState) => state?.role ?? null
);

export const selectKycStatus = createSelector(
  selectAuthState,
  (state: AuthState) => state?.kycStatus ?? null
);

export const selectIsKycApproved = createSelector(
  selectKycStatus,
  (status) => status === 'VERIFIED' || status === 'APPROVED'
);

export const selectAuthToken = createSelector(
  selectAuthState,
  (state: AuthState) => state?.token ?? null
);
