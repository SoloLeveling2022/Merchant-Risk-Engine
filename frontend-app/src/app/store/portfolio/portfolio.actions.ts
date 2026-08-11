import { createAction, props } from '@ngrx/store';
import { PortfolioDTO } from '@frontend/shared-models';

export const loadPortfolios = createAction(
  '[Portfolio] Load Portfolios',
  props<{ userId: string }>()
);

export const loadPortfoliosSuccess = createAction(
  '[Portfolio] Load Portfolios Success',
  props<{ portfolios: PortfolioDTO[] }>()
);

export const loadPortfoliosFailure = createAction(
  '[Portfolio] Load Portfolios Failure',
  props<{ error: string }>()
);
