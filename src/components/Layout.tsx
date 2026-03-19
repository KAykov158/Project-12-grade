import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, UserCircle, Calendar as CalendarIcon, Bell, LogOut, Settings } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { to: '/teams', icon: Users, label: 'Teams', roles: ['admin', 'coach'] },
    { to: '/players', icon: UserCircle, label: 'Players', roles: ['admin', 'coach'] },
    { to: '/matches', icon: CalendarIcon, label: 'Matches', roles: ['admin', 'referee', 'coach'] },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const visibleNav = navItems.filter(item => 
    !item.roles || (userData?.role && item.roles.includes(userData.role))
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-green-800 text-white shadow-lg">
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
                        isActive ? 'bg-green-700' : 'hover:bg-green-700'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/profile')}
                className="flex items-center gap-2 px-3 py-2 hover:bg-green-700 rounded-lg transition-colors"
                title="My Profile"
              >
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center overflow-hidden">
                  {userData?.photo ? (
                    <img src={userData.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-6 h-6" />
                  )}
                </div>
                <span className="hidden lg:inline">{userData?.name}</span>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 hover:bg-green-700 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-green-700 rounded-lg transition-colors"
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
    </div>
  );
};
