import { ActionReducerMap } from '@ngrx/store';
import { AuthState, authReducer } from './auth/auth.reducer';
import { UiState, uiReducer } from './ui/ui.reducer';
import { RiskState, riskReducer } from './risk/risk.reducer';

export interface AppState {
  auth: AuthState;
  ui: UiState;
  risk: RiskState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  ui: uiReducer,
  risk: riskReducer,
};
