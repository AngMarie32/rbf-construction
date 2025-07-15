
import React, { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { addNotification } = useNotificationStore();

  useEffect(() => {
    // Add some sample notifications for demonstration
    const sampleNotifications = [
      {
        type: 'info' as const,
        title: 'Project Update',
        message: 'Downtown Office Building project is 75% complete'
      },
      {
        type: 'warning' as const,
        title: 'Equipment Maintenance',
        message: 'Excavator #2 needs scheduled maintenance'
      },
      {
        type: 'success' as const,
        title: 'Payment Received',
        message: 'Payment for Residential Complex has been processed'
      }
    ];

    // Add notifications with a delay to simulate real-time updates
    sampleNotifications.forEach((notification, index) => {
      setTimeout(() => {
        addNotification(notification);
      }, (index + 1) * 2000);
    });
  }, [addNotification]);

  return <>{children}</>;
};
