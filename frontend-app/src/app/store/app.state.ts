import { ActionReducerMap } from '@ngrx/store';
import { AuthState, authReducer } from './auth/auth.reducer';
import { UiState, uiReducer } from './ui/ui.reducer';
import { PortfolioState, portfolioReducer } from './portfolio/portfolio.reducer';

export interface AppState {
  auth: AuthState;
  ui: UiState;
  portfolio: PortfolioState;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: authReducer,
  ui: uiReducer,
  portfolio: portfolioReducer,
};
