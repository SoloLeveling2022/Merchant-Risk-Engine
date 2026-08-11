import { createReducer, on } from '@ngrx/store';
import { PortfolioDTO } from '@frontend/shared-models';
import * as PortfolioActions from './portfolio.actions';

export interface PortfolioState {
  portfolios: PortfolioDTO[];
  loading: boolean;
  error: string | null;
}

export const initialState: PortfolioState = {
  portfolios: [],
  loading: false,
  error: null
};

export const portfolioReducer = createReducer(
  initialState,
  on(PortfolioActions.loadPortfolios, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(PortfolioActions.loadPortfoliosSuccess, (state, { portfolios }) => ({
    ...state,
    portfolios,
    loading: false
  })),
  on(PortfolioActions.loadPortfoliosFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
