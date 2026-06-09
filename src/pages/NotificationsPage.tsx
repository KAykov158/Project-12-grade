import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Badge } from '../components/ui';
import { notificationsService, matchesService } from '../supabase';
import { Notification } from '../types';
import { Bell, Check, X } from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userData) return;
    setError(null);
    try {
      unsubRef.current = notificationsService.subscribe(userData.id, setNotifications);
    } catch (err) {
      setError(String(err));
    }
    notificationsService.getByUser(userData.id).then(setNotifications).catch((err) => {
      setError(String(err));
    });
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [userData]);

  const [responding, setResponding] = useState<string | null>(null);

  const markAsRead = async (id: string) => {
    try {
      await notificationsService.markAsRead(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const respondFromNotification = async (notification: Notification, status: 'accepted' | 'declined') => {
    if (!notification.matchId || !userData) return;
    setResponding(notification.id);
    try {
      await matchesService.updateRefereeStatus(notification.matchId, userData.id, status);
      await markAsRead(notification.id);
    } catch (err) {
      alert('Failed to respond: ' + (err instanceof Error ? err.message : JSON.stringify(err)));
    } finally {
      setResponding(null);
    }
  };

  const markAllAsRead = async () => {
    if (!userData) return;
    try {
      await notificationsService.markAllAsRead(userData.id);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (error) {
    return (
      <Card><p className="text-red-600">Error loading notifications: {error}</p></Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <>
              <Badge variant="warning">{unreadCount} unread</Badge>
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Mark all as read
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map(notification => (
          <Card 
            key={notification.id} 
            className={`flex items-start gap-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-750 ${!notification.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
            onClick={() => {
              if (!notification.read) markAsRead(notification.id);
              if (notification.matchId) navigate(`/matches?highlight=${notification.matchId}`);
            }}
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
              <div className="flex items-center gap-2 mt-2">
                {userData?.role === 'referee' && notification.matchId && !notification.read && (
                  <>
                    <button
                      disabled={responding === notification.id}
                      onClick={(e) => { e.stopPropagation(); respondFromNotification(notification, 'accepted'); }}
                      className="text-sm text-green-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Accept
                    </button>
                    <button
                      disabled={responding === notification.id}
                      onClick={(e) => { e.stopPropagation(); respondFromNotification(notification, 'declined'); }}
                      className="text-sm text-red-600 hover:underline flex items-center gap-1 disabled:opacity-50"
                    >
                      <X className="w-4 h-4" /> Decline
                    </button>
                  </>
                )}
                {!notification.read && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); markAsRead(notification.id); }}
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Mark as read
                  </button>
                )}
              </div>
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
