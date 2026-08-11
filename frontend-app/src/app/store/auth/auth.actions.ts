import { createAction, props } from '@ngrx/store';
import { AuthResponseDTO, UserRole, KycStatus } from '@frontend/shared-models';

export const login = createAction(
  '[Auth] Login',
  props<{ rawResponse: AuthResponseDTO; overrideRole?: UserRole }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: AuthResponseDTO }>()
);

export const logout = createAction('[Auth] Logout');

export const updateKycStatus = createAction(
  '[Auth] Update KYC Status',
  props<{ status: KycStatus }>()
);
