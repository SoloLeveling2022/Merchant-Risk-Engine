import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError } from 'rxjs/operators';
import { ApiService } from '@frontend/shared-api';
import * as PortfolioActions from './portfolio.actions';

@Injectable()
export class PortfolioEffects {
  private actions$ = inject(Actions);
  private apiService = inject(ApiService);

  loadPortfolios$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PortfolioActions.loadPortfolios),
      mergeMap(action =>
        this.apiService.getPortfoliosByUser(action.userId).pipe(
          map(portfolios => PortfolioActions.loadPortfoliosSuccess({ portfolios })),
          catchError(error => of(PortfolioActions.loadPortfoliosFailure({ error: error.message })))
        )
      )
    )
  );
}
