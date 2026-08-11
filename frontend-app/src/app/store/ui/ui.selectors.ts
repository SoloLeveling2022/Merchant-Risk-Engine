import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UiState } from './ui.reducer';

export const selectUiState = createFeatureSelector<UiState>('ui');

export const selectToasts = createSelector(
  selectUiState,
  (state: UiState) => state?.toasts ?? []
);

export const selectIsLoading = createSelector(
  selectUiState,
  (state: UiState) => state?.loading ?? false
);
