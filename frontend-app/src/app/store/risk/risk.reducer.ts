import { createReducer, on } from '@ngrx/store';
import { SchemeRatioReportDTO, ReserveTrancheDTO } from '@frontend/shared-models';
import * as RiskActions from './risk.actions';

export interface RiskState {
  ratios: SchemeRatioReportDTO | null;
  tranches: ReserveTrancheDTO[];
  loading: boolean;
  error: string | null;
}

export const initialState: RiskState = {
  ratios: null,
  tranches: [],
  loading: false,
  error: null
};

export const riskReducer = createReducer(
  initialState,
  on(RiskActions.loadMerchantRisk, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(RiskActions.loadMerchantRiskSuccess, (state, { ratios, tranches }) => ({
    ...state,
    ratios,
    tranches,
    loading: false
  })),
  on(RiskActions.loadMerchantRiskFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
