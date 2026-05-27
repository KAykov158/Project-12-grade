import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usersService, supabase } from '../supabase';
import { LayoutDashboard, Users, UserCircle, Calendar as CalendarIcon, Bell, LogOut, Moon, Sun, Settings, X, Camera, Trash2, Key, Mail, User, Check } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { userData, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [tab, setTab] = useState<'view' | 'edit'>('view');

  const [nickname, setNickname] = useState('');
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nickSaving, setNickSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openProfile = () => {
    setNickname(userData?.nickname || '');
    setNickMsg(null);
    setEmailMsg(null);
    setPwMsg(null);
    setTab('view');
    setShowProfile(true);
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { to: '/teams', icon: Users, label: 'Teams', roles: ['admin', 'coach'] },

    { to: '/matches', icon: CalendarIcon, label: 'Matches', roles: ['admin', 'referee', 'coach'] },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
  ];

  const visibleNav = navItems.filter(item => 
    !item.roles || (userData?.role && item.roles.includes(userData.role))
  );

  const saveNickname = async () => {
    if (!userData) return;
    setNickSaving(true);
    setNickMsg(null);
    try {
      await usersService.update(userData.id, { nickname });
      setNickMsg({ ok: true, text: 'Nickname updated!' });
    } catch {
      setNickMsg({ ok: false, text: 'Failed to update nickname.' });
    } finally {
      setNickSaving(false);
    }
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      setEmailMsg({ ok: true, text: 'Confirmation sent. Check your inbox.' });
      setNewEmail('');
    } catch (err: any) {
      setEmailMsg({ ok: false, text: err.message || 'Failed.' });
    } finally {
      setEmailSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwMsg({ ok: false, text: 'At least 8 characters.' });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg({ ok: true, text: 'Password updated!' });
      setNewPassword('');
    } catch (err: any) {
      setPwMsg({ ok: false, text: err.message || 'Failed.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData) return;
      const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const photo = reader.result as string;
        await usersService.update(userData.id, { photo });
      } catch (err) {
        console.error('Failed to update photo:', err);
      }
    };
    reader.readAsDataURL(file);
    setShowPhotoMenu(false);
  };

  const removePhoto = async () => {
    if (!userData) return;
    try {
      await usersService.update(userData.id, { photo: '' });
    } catch (err) {
      console.error('Failed to remove photo:', err);
    }
    setShowPhotoMenu(false);
  };

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
                onClick={toggle}
                className="p-2 hover:bg-green-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={dark ? 'Light mode' : 'Dark mode'}
              >
                {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button
                onClick={openProfile}
                className="p-2 hover:bg-green-700 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Profile"
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

      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowProfile(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md mx-4 shadow-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 pb-2 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-xl font-bold dark:text-gray-100">Profile</h2>
              <button onClick={() => setShowProfile(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6">
              {!userData ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Loading profile...</p>
              ) : tab === 'view' ? (
                <>
                  <div className="flex flex-col items-center gap-3 mb-6">
                    <div className="relative">
                      <div
                        className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                        onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                      >
                        {userData.photo ? (
                          <img src={userData.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                      <button
                        onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                        className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1.5 rounded-full hover:bg-blue-700"
                      >
                        <Camera className="w-3.5 h-3.5" />
                      </button>
                      {showPhotoMenu && (
                        <div className="absolute top-full mt-2 right-0 bg-white dark:bg-gray-700 rounded-lg shadow-lg border dark:border-gray-600 py-1 w-40 z-20">
                          <button
                            onClick={() => { fileRef.current?.click(); }}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left dark:text-gray-100"
                          >
                            <Camera className="w-4 h-4" /> Change Photo
                          </button>
                          {userData.photo && (
                            <button
                              onClick={removePhoto}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left text-red-600"
                            >
                              <Trash2 className="w-4 h-4" /> Remove Photo
                            </button>
                          )}
                        </div>
                      )}
                      <input type="file" accept="image/*" ref={fileRef} onChange={handlePhotoFile} className="hidden" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold dark:text-gray-100">{userData.nickname || userData.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{userData.email}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm mb-6">
                    <div className="flex justify-between py-2 border-b dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Name</span>
                      <span className="font-medium dark:text-gray-100">{userData.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Nickname</span>
                      <span className="font-medium dark:text-gray-100">{userData.nickname || '—'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Role</span>
                      <span className="font-medium uppercase text-xs dark:text-gray-100">{userData.role}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-500 dark:text-gray-400">Joined</span>
                      <span className="font-medium dark:text-gray-100">{new Date(userData.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setTab('edit')}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                  >
                    Edit Profile & Settings
                  </button>
                </>
              ) : (
                <div className="space-y-5">
                  <button onClick={() => setTab('view')} className="text-sm text-blue-600 hover:underline mb-2">&larr; Back</button>

                  {/* Nickname */}
                  <div>
                    <label className="font-medium text-sm dark:text-gray-200 flex items-center gap-2 mb-1">
                      <User className="w-4 h-4" /> Nickname
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={nickname}
                        onChange={e => setNickname(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        placeholder="Display name"
                      />
                      <button onClick={saveNickname} disabled={nickSaving} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        {nickSaving ? '...' : <Check className="w-4 h-4" />}
                      </button>
                    </div>
                    {nickMsg && (
                      <p className={`text-xs mt-1 ${nickMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{nickMsg.text}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="font-medium text-sm dark:text-gray-200 flex items-center gap-2 mb-1">
                      <Mail className="w-4 h-4" /> Change Email
                    </label>
                    <form onSubmit={changeEmail} className="flex gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        placeholder="new@example.com"
                        required
                      />
                      <button type="submit" disabled={emailSaving} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        {emailSaving ? '...' : <Mail className="w-4 h-4" />}
                      </button>
                    </form>
                    {emailMsg && (
                      <p className={`text-xs mt-1 ${emailMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{emailMsg.text}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="font-medium text-sm dark:text-gray-200 flex items-center gap-2 mb-1">
                      <Key className="w-4 h-4" /> Change Password
                    </label>
                    <form onSubmit={changePassword} className="flex gap-2">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        placeholder="New password (8+ chars)"
                        required
                      />
                      <button type="submit" disabled={pwSaving} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        {pwSaving ? '...' : <Key className="w-4 h-4" />}
                      </button>
                    </form>
                    {pwMsg && (
                      <p className={`text-xs mt-1 ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
