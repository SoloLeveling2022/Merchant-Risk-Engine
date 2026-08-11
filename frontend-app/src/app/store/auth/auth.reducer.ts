import { createReducer, on } from '@ngrx/store';
import { AuthResponseDTO, UserRole, KycStatus } from '@frontend/shared-models';
import * as AuthActions from './auth.actions';

export interface AuthState {
  user: AuthResponseDTO | null;
  isLoggedIn: boolean;
  role: UserRole | null;
  kycStatus: KycStatus | null;
  token: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  isLoggedIn: false,
  role: null,
  kycStatus: null,
  token: null,
};

export const authReducer = createReducer(
  initialAuthState,
  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    isLoggedIn: true,
    role: (user.role || (user.roles && user.roles[0]) || 'ROLE_INVESTOR') as UserRole,
    kycStatus: user.kycStatus || null,
    token: user.token || user.accessToken || null,
  })),
  on(AuthActions.logout, () => ({
    ...initialAuthState,
  })),
  on(AuthActions.updateKycStatus, (state, { status }) => ({
    ...state,
    kycStatus: status,
    user: state.user ? { ...state.user, kycStatus: status } : null,
  }))
);
