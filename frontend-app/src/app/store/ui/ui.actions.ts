import { createAction, props } from '@ngrx/store';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export const showToast = createAction(
  '[UI] Show Toast',
  props<{ toast: Omit<ToastNotification, 'id'> }>()
);

export const addToast = createAction(
  '[UI] Add Toast',
  props<{ toast: ToastNotification }>()
);

export const removeToast = createAction(
  '[UI] Remove Toast',
  props<{ id: string }>()
);

export const setLoading = createAction(
  '[UI] Set Loading',
  props<{ loading: boolean }>()
);
