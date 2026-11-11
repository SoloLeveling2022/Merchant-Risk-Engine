import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RiskState } from './risk.reducer';

export const selectRiskState = createFeatureSelector<RiskState>('risk');

export const selectSchemeRatios = createSelector(
  selectRiskState,
  state => state.ratios
);

export const selectReserveTranches = createSelector(
  selectRiskState,
  state => state.tranches
);

export const selectRiskLoading = createSelector(
  selectRiskState,
  state => state.loading
);
