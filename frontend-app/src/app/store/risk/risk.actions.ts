import { createAction, props } from '@ngrx/store';
import { SchemeRatioReportDTO, ReserveTrancheDTO } from '@frontend/shared-models';

export const loadMerchantRisk = createAction(
  '[Risk] Load Merchant Risk',
  props<{ merchantId: string }>()
);

export const loadMerchantRiskSuccess = createAction(
  '[Risk] Load Merchant Risk Success',
  props<{ ratios: SchemeRatioReportDTO; tranches: ReserveTrancheDTO[] }>()
);

export const loadMerchantRiskFailure = createAction(
  '[Risk] Load Merchant Risk Failure',
  props<{ error: string }>()
);
