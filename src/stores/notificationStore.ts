
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  deletedNotificationIds: string[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  getUnreadCount: () => number;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      deletedNotificationIds: [],
      
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
          read: false,
        };
        
        // Don't add notification if it was previously deleted
        const { deletedNotificationIds } = get();
        if (deletedNotificationIds.includes(newNotification.id)) {
          return;
        }
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50), // Keep only latest 50
        }));
      },
      
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      
      deleteNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
          deletedNotificationIds: [...state.deletedNotificationIds, id],
        })),
      
      clearAll: () =>
        set((state) => ({
          notifications: [],
          deletedNotificationIds: [
            ...state.deletedNotificationIds,
            ...state.notifications.map(n => n.id)
          ],
        })),
      
      getUnreadCount: () => {
        const { notifications } = get();
        return notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'notification-store',
    }
  )
);
