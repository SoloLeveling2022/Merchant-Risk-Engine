import { Injectable, signal } from '@angular/core';
import { NotificationEventDTO } from '@frontend/shared-models';

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private eventSource: EventSource | null = null;
  private _notifications = signal<NotificationEventDTO[]>([]);
  readonly notifications = this._notifications.asReadonly();

  private _toasts = signal<ToastNotification[]>([]);
  readonly toasts = this._toasts.asReadonly();

  connect(userId: string): void {
    if (this.eventSource) this.eventSource.close();

    this.eventSource = new EventSource(`/api/notifications/stream/${userId}`);

    this.eventSource.onmessage = (event) => {
      try {
        const notif: NotificationEventDTO = JSON.parse(event.data);
        if (notif.title === 'Connected' || notif.message?.includes('Real-time alerts connected')) {
          return;
        }
        this._notifications.update((prev) => [notif, ...prev]);
        this.addToast(notif.title, notif.message, notif.type);
      } catch (e) {
        console.error('Failed to parse SSE notification', e);
      }
    };
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  private toastCounter = 0;

  addToast(title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO'): void {
    const toast: ToastNotification = { id: `toast-${++this.toastCounter}-${Date.now()}`, title, message, type };
    this._toasts.update((prev) => [...prev, toast]);
    
    const notif: NotificationEventDTO = {
      id: `notif-${toast.id}`,
      userId: '',
      title,
      message,
      type,
      timestamp: new Date().toISOString(),
      read: false
    };
    this._notifications.update((prev) => [notif, ...prev]);

    setTimeout(() => this.dismissToast(toast.id), 5000);
  }

  addNotification(title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO'): void {
    this.addToast(title, message, type);
  }

  dismissToast(id: string): void {
    this._toasts.update((prev) => prev.filter((t) => t.id !== id));
  }
}
