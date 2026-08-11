import { createReducer, on } from '@ngrx/store';
import { ToastNotification } from './ui.actions';
import * as UiActions from './ui.actions';

export interface UiState {
  toasts: ToastNotification[];
  loading: boolean;
}

export const initialUiState: UiState = {
  toasts: [],
  loading: false,
};

export const uiReducer = createReducer(
  initialUiState,
  on(UiActions.addToast, (state, { toast }) => ({
    ...state,
    toasts: [...state.toasts, toast],
  })),
  on(UiActions.removeToast, (state, { id }) => ({
    ...state,
    toasts: state.toasts.filter(t => t.id !== id),
  })),
  on(UiActions.setLoading, (state, { loading }) => ({
    ...state,
    loading,
  }))
);
