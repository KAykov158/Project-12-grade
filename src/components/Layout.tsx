import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { notificationsService, usersService } from '../supabase';
import { Notification } from '../types';
import { LayoutDashboard, Trophy, Users, UserCircle, Calendar as CalendarIcon, Bell, LogOut, Moon, Sun, Settings, BellRing } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const unsubRef = useRef<(() => void) | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userData) {
      unsubRef.current = notificationsService.subscribe(userData.id, setNotifications);
    }
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [userData]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { to: '/scoreboard', icon: Trophy, label: 'Scoreboard' },
    { to: '/teams', icon: Users, label: userData?.role === 'coach' ? 'Squad' : 'Teams', roles: ['admin', 'coach'] },
    { to: '/matches', icon: CalendarIcon, label: 'Matches', roles: ['admin', 'referee', 'coach'] },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const visibleNav = navItems.filter(item => 
    !item.roles || (userData?.role && item.roles.includes(userData.role))
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 dark:text-gray-100 transition-colors">
      <nav className="bg-green-800 dark:bg-gray-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Referee Manager</h1>
              <div className="hidden md:flex ml-10 space-x-1">
                {visibleNav.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        isActive ? 'bg-green-700 dark:bg-gray-700' : 'hover:bg-green-700 dark:hover:bg-gray-700'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toggle();
                  if (userData) {
                    const newTheme = !dark ? 'dark' : 'light';
                    usersService.update(userData.id, { theme: newTheme }).catch(() => {});
                  }
                }}
                className="p-2 hover:bg-green-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="p-2 hover:bg-green-700 dark:hover:bg-gray-700 rounded-lg transition-colors relative"
                  title="Notifications"
                >
                  {unreadCount > 0 ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-full sm:mt-2 w-auto sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border dark:border-gray-600 z-50 overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 border-b dark:border-gray-600">
                      <h3 className="font-semibold text-sm dark:text-gray-100">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{unreadCount} unread</span>
                      )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {recentNotifications.length > 0 ? (
                        recentNotifications.map(n => (
                          <button
                            key={n.id}
                            onClick={() => { navigate('/notifications'); setShowNotifDropdown(false); }}
                            className={`w-full text-left px-4 py-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!n.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          >
                            <p className="text-sm font-medium dark:text-gray-100 truncate">{n.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </p>
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">No notifications</p>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={() => { navigate('/notifications'); setShowNotifDropdown(false); }}
                        className="w-full text-center py-2.5 text-sm text-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium"
                      >
                        View All
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => navigate('/settings')}
                className="p-2 hover:bg-green-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-green-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </div>
      <ChatWidget />
    </div>
  );
};
