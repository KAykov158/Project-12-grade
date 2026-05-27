import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge } from '../components/ui';
import { notificationsService } from '../supabase';
import { Notification } from '../types';
import { Bell, Check } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { userData } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (userData) {
      unsubRef.current = notificationsService.subscribe(userData.id, setNotifications);
    }
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [userData]);

  const markAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Badge variant="warning">{unreadCount} unread</Badge>
        )}
      </div>

      <div className="space-y-3">
        {notifications.map(notification => (
          <Card 
            key={notification.id} 
            className={`flex items-start gap-3 ${!notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
          >
            <div className="p-2 bg-blue-100 rounded-full">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h3 className="font-semibold">{notification.title}</h3>
                <span className="text-xs text-gray-500">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 mt-1">{notification.message}</p>
              {!notification.read && (
                <button 
                  onClick={() => markAsRead(notification.id)}
                  className="text-sm text-blue-600 hover:underline mt-2 flex items-center gap-1"
                >
                  <Check className="w-4 h-4" /> Mark as read
                </button>
              )}
            </div>
          </Card>
        ))}
        {notifications.length === 0 && (
          <Card>
            <p className="text-center text-gray-500 py-8">No notifications</p>
          </Card>
        )}
      </div>
    </div>
  );
};
