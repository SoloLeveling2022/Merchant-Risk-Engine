import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PortfolioState } from './portfolio.reducer';

export const selectPortfolioState = createFeatureSelector<PortfolioState>('portfolio');

export const selectAllPortfolios = createSelector(
  selectPortfolioState,
  (state: PortfolioState) => state.portfolios
);

export const selectPortfolioLoading = createSelector(
  selectPortfolioState,
  (state: PortfolioState) => state.loading
);

export const selectPortfolioError = createSelector(
  selectPortfolioState,
  (state: PortfolioState) => state.error
);
