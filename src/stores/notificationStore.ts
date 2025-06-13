
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  dismissed: boolean;
}

class NotificationStore {
  private notifications: Notification[] = [];
  private deletedNotifications: Set<string> = new Set();

  constructor() {
    // Load dismissed notifications from localStorage
    const dismissed = localStorage.getItem('dismissed_notifications');
    if (dismissed) {
      this.deletedNotifications = new Set(JSON.parse(dismissed));
    }
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'dismissed'>) {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      dismissed: false
    };

    // Don't add if already dismissed
    if (this.deletedNotifications.has(newNotification.id)) {
      return;
    }

    this.notifications.push(newNotification);
  }

  getNotifications(): Notification[] {
    return this.notifications.filter(n => !this.deletedNotifications.has(n.id));
  }

  dismissNotification(id: string) {
    this.deletedNotifications.add(id);
    localStorage.setItem('dismissed_notifications', JSON.stringify([...this.deletedNotifications]));
    this.notifications = this.notifications.filter(n => n.id !== id);
  }

  clearAll() {
    this.notifications.forEach(n => this.deletedNotifications.add(n.id));
    localStorage.setItem('dismissed_notifications', JSON.stringify([...this.deletedNotifications]));
    this.notifications = [];
  }
}

export const notificationStore = new NotificationStore();
