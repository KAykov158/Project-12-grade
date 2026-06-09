import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Card, Badge } from '../components/ui';
import { usersService, supabase, totpService, notificationsService } from '../supabase';
import {
  User, Key, Sun, Moon, Mail, Camera, Trash2, Check, UserCircle,
  Palette, Smartphone, Copy, CheckCheck, Eye, EyeOff
} from 'lucide-react';
import { authenticator } from '@otplib/preset-browser';
import QRCode from 'qrcode';

type SettingsTab = 'profile' | 'security' | 'appearance';

export const SettingsPage: React.FC = () => {
  const { currentUser, userData, isRecoveryMode, updatePassword, resetPassword } = useAuth();
  const { dark, setDark } = useTheme();
  const [tab, setTab] = useState<SettingsTab>('profile');

  const [nickname, setNickname] = useState('');
  const [nickMsg, setNickMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [nickSaving, setNickSaving] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorQrUrl, setTwoFactorQrUrl] = useState<string | null>(null);
  const [twoFactorSetupCode, setTwoFactorSetupCode] = useState('');
  const [twoFactorMsg, setTwoFactorMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [twoFactorVerifying, setTwoFactorVerifying] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);

  useEffect(() => {
    if (userData) setNickname(userData.nickname || '');
  }, [userData]);

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
    if (!newEmail || !userData) return;
    setEmailSaving(true);
    setEmailMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      await usersService.update(userData.id, { email: newEmail }).catch(() => {});
      if (currentUser) {
        await notificationsService.create({
          userId: currentUser.id,
          title: 'Email Changed',
          message: `Your email was changed to ${newEmail}.`,
          read: false,
          createdAt: new Date(),
        });
      }
      setNewEmail('');
      setEmailMsg({ ok: true, text: 'Confirmation sent. Check both inboxes.' });
    } catch (err: any) {
      setEmailMsg({ ok: false, text: err.message || 'Failed.' });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleRecoveryPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    const errors: string[] = [];
    if (newPassword.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(newPassword)) errors.push('At least 1 uppercase letter');
    if (!/[0-9]/.test(newPassword)) errors.push('At least 1 number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) errors.push('At least 1 special character');
    if (errors.length > 0) {
      setPwMsg({ ok: false, text: 'Password requirements: ' + errors.join(', ') });
      return;
    }
    setPwSaving(true);
    try {
      await updatePassword(newPassword);
      setPwMsg({ ok: true, text: 'Password updated! You can now use your new password.' });
      setNewPassword('');
    } catch (err: any) {
      setPwMsg({ ok: false, text: err.message || 'Failed to update password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!currentPassword) {
      setPwMsg({ ok: false, text: 'Please enter your current password.' });
      return;
    }
    const errors: string[] = [];
    if (newPassword.length < 8) errors.push('At least 8 characters');
    if (!/[A-Z]/.test(newPassword)) errors.push('At least 1 uppercase letter');
    if (!/[0-9]/.test(newPassword)) errors.push('At least 1 number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) errors.push('At least 1 special character');
    if (errors.length > 0) {
      setPwMsg({ ok: false, text: 'Password requirements: ' + errors.join(', ') });
      return;
    }
    setPwSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userData!.email,
        password: currentPassword,
      });
      if (signInError) {
        setPwMsg({ ok: false, text: 'Current password is incorrect.' });
        setPwSaving(false);
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      if (currentUser) {
        await notificationsService.create({
          userId: currentUser.id,
          title: 'Password Changed',
          message: 'Your password was successfully updated.',
          read: false,
          createdAt: new Date(),
        });
      }
      setPwMsg({ ok: true, text: 'Password updated!' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setPwMsg({ ok: false, text: err.message || 'Failed to update password.' });
    } finally {
      setPwSaving(false);
    }
  };

  const sendPasswordReset = async () => {
    if (!userData) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      await resetPassword(userData.email);
      setPwMsg({ ok: true, text: 'Password reset link sent to your email.' });
    } catch (err: any) {
      setPwMsg({ ok: false, text: err.message || 'Failed to send reset link.' });
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

  const handleThemeToggle = () => {
    const newDark = !dark;
    setDark(newDark);
    if (userData) {
      usersService.update(userData.id, { theme: newDark ? 'dark' : 'light' }).catch(() => {});
    }
  };

  const startTwoFactorSetup = async () => {
    if (!userData) return;
    setTwoFactorMsg(null);
    try {
      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(userData.email, 'Referee Match Manager', secret);
      const qrUrl = await QRCode.toDataURL(otpauth, { width: 250, margin: 2 });
      await totpService.setSecret(userData.id, secret);
      setTwoFactorSecret(secret);
      setTwoFactorQrUrl(qrUrl);
      setShowTwoFactorSetup(true);
    } catch (err) {
      setTwoFactorMsg({ ok: false, text: 'Failed to start setup. Make sure the database has a totp_secret column.' });
    }
  };

  const verifyTwoFactorSetup = async () => {
    if (!userData || !twoFactorSecret || !twoFactorSetupCode) return;
    setTwoFactorVerifying(true);
    setTwoFactorMsg(null);
    try {
      const isValid = authenticator.check(twoFactorSetupCode, twoFactorSecret);
      if (isValid) {
        await usersService.update(userData.id, { twoFactorEnabled: true });
        if (currentUser) {
          await notificationsService.create({
            userId: currentUser.id,
            title: '2FA Enabled',
            message: 'Two-factor authentication has been enabled on your account.',
            read: false,
            createdAt: new Date(),
          });
        }
        setTwoFactorMsg({ ok: true, text: 'Two-factor authentication enabled successfully!' });
        setShowTwoFactorSetup(false);
        setTwoFactorSecret(null);
        setTwoFactorQrUrl(null);
        setTwoFactorSetupCode('');
      } else {
        setTwoFactorMsg({ ok: false, text: 'Invalid code. Please try again.' });
      }
    } catch {
      setTwoFactorMsg({ ok: false, text: 'Verification failed.' });
    } finally {
      setTwoFactorVerifying(false);
    }
  };

  const disableTwoFactor = async () => {
    if (!userData || !confirm('Disable two-factor authentication?')) return;
    try {
      await totpService.clearSecret(userData.id);
      await usersService.update(userData.id, { twoFactorEnabled: false });
      if (currentUser) {
        await notificationsService.create({
          userId: currentUser.id,
          title: '2FA Disabled',
          message: 'Two-factor authentication has been disabled on your account.',
          read: false,
          createdAt: new Date(),
        });
      }
      setTwoFactorMsg({ ok: true, text: 'Two-factor authentication disabled.' });
    } catch {
      setTwoFactorMsg({ ok: false, text: 'Failed to disable.' });
    }
  };

  const copySecret = () => {
    if (twoFactorSecret) {
      navigator.clipboard.writeText(twoFactorSecret).catch(() => {});
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="px-0">
      {isRecoveryMode ? (
        <div className="max-w-md mx-auto mt-12">
          <Card>
            <h2 className="text-lg font-bold mb-4 dark:text-gray-100">Set New Password</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter your new password below.</p>
            <form onSubmit={handleRecoveryPassword} className="space-y-4">
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 pr-10"
                  placeholder="New password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password requirements:</p>
                  <ul className="space-y-1">
                    {([
                      { check: newPassword.length >= 8, text: 'At least 8 characters' },
                      { check: /[A-Z]/.test(newPassword), text: 'At least 1 uppercase letter' },
                      { check: /[0-9]/.test(newPassword), text: 'At least 1 number' },
                      { check: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), text: 'At least 1 special character' },
                    ] as const).map(({ check, text }, i) => (
                      <li key={i} className={`flex items-center gap-1.5 text-xs ${check ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                        <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold ${check ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                          {check ? '✓' : ''}
                        </span>
                        {text}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="submit" disabled={pwSaving} className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-semibold">
                {pwSaving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
            {pwMsg && (
              <p className={`text-sm mt-3 ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</p>
            )}
          </Card>
        </div>
      ) : (
      <>
      <h1 className="text-2xl font-bold mb-6 dark:text-gray-100">Settings</h1>
      <div className="flex gap-6 flex-col md:flex-row">
        <div className="md:w-44 shrink-0 -ml-1">
          <nav className="space-y-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <t.icon className="w-5 h-5" />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex-1 min-w-0">
          {tab === 'profile' && (
            <Card>
              <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Profile</h2>

              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="relative">
                  <div
                    className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                  >
                    {userData?.photo ? (
                      <img src={userData.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-14 h-14 text-gray-400" />
                    )}
                  </div>
                  <button
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                    className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  {showPhotoMenu && (
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-700 rounded-lg shadow-lg border dark:border-gray-600 py-1 w-44 z-20">
                      <button
                        onClick={() => { fileRef.current?.click(); }}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 w-full text-left dark:text-gray-100"
                      >
                        <Camera className="w-4 h-4" /> Change Photo
                      </button>
                      {userData?.photo && (
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
              </div>

              <div className="space-y-4">
                <div className="flex justify-between py-3 border-b dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Name</span>
                  <span className="font-medium dark:text-gray-100">{userData?.name}</span>
                </div>
                <div className="flex justify-between py-3 border-b dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Email</span>
                  <span className="font-medium dark:text-gray-100">{userData?.email}</span>
                </div>
                <div className="flex justify-between py-3 border-b dark:border-gray-700 items-center">
                  <span className="text-gray-500 dark:text-gray-400">Nickname</span>
                  <div className="flex items-center gap-2">
                    <input
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      className="border rounded-lg px-3 py-1.5 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 w-40 text-right"
                      placeholder="Display name"
                    />
                    <button onClick={saveNickname} disabled={nickSaving} className="p-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                      {nickSaving ? '...' : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {nickMsg && (
                  <p className={`text-sm ${nickMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{nickMsg.text}</p>
                )}
                <div className="flex justify-between py-3 border-b dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">Role</span>
                  <Badge variant={userData?.role === 'admin' ? 'danger' : 'info'}>
                    {userData?.role?.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between py-3">
                  <span className="text-gray-500 dark:text-gray-400">Joined</span>
                  <span className="font-medium dark:text-gray-100">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {tab === 'security' && (
            <div className="space-y-6">
              <Card>
                <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Security</h2>
                <div className="space-y-6">
                  <div>
                    <label className="font-medium text-sm dark:text-gray-200 flex items-center gap-2 mb-2">
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
                      <button type="submit" disabled={emailSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        {emailSaving ? '...' : 'Update'}
                      </button>
                    </form>
                    {emailMsg && (
                      <p className={`text-xs mt-1 ${emailMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{emailMsg.text}</p>
                    )}
                  </div>

                  <div>
                    <label className="font-medium text-sm dark:text-gray-200 flex items-center gap-2 mb-2">
                      <Key className="w-4 h-4" /> Change Password
                    </label>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={e => setCurrentPassword(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 pr-10"
                          placeholder="Current password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 pr-10"
                          placeholder="New password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          tabIndex={-1}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {newPassword && (
                        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password requirements:</p>
                          <ul className="space-y-1">
                            {([
                              { check: newPassword.length >= 8, text: 'At least 8 characters' },
                              { check: /[A-Z]/.test(newPassword), text: 'At least 1 uppercase letter' },
                              { check: /[0-9]/.test(newPassword), text: 'At least 1 number' },
                              { check: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword), text: 'At least 1 special character' },
                            ] as const).map(({ check, text }, i) => (
                              <li key={i} className={`flex items-center gap-1.5 text-xs ${check ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center text-[8px] font-bold ${check ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                  {check ? '✓' : ''}
                                </span>
                                {text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <button type="submit" disabled={pwSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                        {pwSaving ? '...' : 'Update Password'}
                      </button>
                    </form>
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={sendPasswordReset}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Forgot your current password? Send reset link instead
                      </button>
                    </div>
                    {pwMsg && (
                      <p className={`text-xs mt-2 ${pwMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{pwMsg.text}</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-bold mb-6 dark:text-gray-100 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Two-Factor Authentication
                </h2>

                {userData?.twoFactorEnabled && !showTwoFactorSetup ? (
                  <div>
                    <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl mb-4">
                      <CheckCheck className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">2FA is enabled</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Your account is protected with two-factor authentication.</p>
                      </div>
                    </div>
                    <button
                      onClick={disableTwoFactor}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      Disable 2FA
                    </button>
                  </div>
                ) : showTwoFactorSetup ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Scan this QR code with Google Authenticator (or any TOTP app), then enter the 6-digit code below.
                    </p>
                    <div className="flex justify-center">
                      {twoFactorQrUrl && (
                        <img src={twoFactorQrUrl} alt="QR Code" className="rounded-xl border dark:border-gray-600" />
                      )}
                    </div>
                    <div className="flex justify-center">
                      <button
                        onClick={copySecret}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <Copy className="w-3 h-3" />
                        Copy secret manually
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={twoFactorSetupCode}
                        onChange={e => setTwoFactorSetupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm text-center text-lg font-bold tracking-widest dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                        placeholder="000000"
                      />
                      <button
                        onClick={verifyTwoFactorSetup}
                        disabled={twoFactorSetupCode.length !== 6 || twoFactorVerifying}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {twoFactorVerifying ? '...' : 'Verify'}
                      </button>
                    </div>
                    <button
                      onClick={() => { setShowTwoFactorSetup(false); setTwoFactorSecret(null); setTwoFactorQrUrl(null); setTwoFactorMsg(null); }}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      Cancel
                    </button>
                    {twoFactorMsg && (
                      <p className={`text-sm ${twoFactorMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{twoFactorMsg.text}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Add an extra layer of security by requiring a verification code from Google Authenticator or any TOTP app when signing in.
                    </p>
                    <button
                      onClick={startTwoFactorSetup}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <Smartphone className="w-4 h-4" />
                      Enable 2FA
                    </button>
                    {twoFactorMsg && (
                      <p className={`text-sm mt-2 ${twoFactorMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{twoFactorMsg.text}</p>
                    )}
                  </div>
                )}
              </Card>
            </div>
          )}

          {tab === 'appearance' && (
            <Card>
              <h2 className="text-lg font-bold mb-6 dark:text-gray-100">Appearance</h2>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium dark:text-gray-100">Theme</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {dark ? 'Dark mode is enabled' : 'Light mode is enabled'}
                  </p>
                </div>
                <button
                  onClick={handleThemeToggle}
                  className={`relative w-14 h-7 rounded-full transition-colors ${dark ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform flex items-center justify-center ${dark ? 'translate-x-7' : 'translate-x-0.5'}`}>
                    {dark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  </div>
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
};
