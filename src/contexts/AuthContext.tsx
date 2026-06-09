import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { authenticator } from '@otplib/preset-browser';
import { supabase, usersService, totpService, notificationsService } from '../supabase';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: SupabaseUser | null;
  userData: User | null;
  loading: boolean;
  pendingTwoFactor: boolean;
  needsEmailVerification: boolean;
  isRecoveryMode: boolean;
  updatePassword: (password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, nickname?: string) => Promise<string | undefined>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  verifyTwoFactorCode: (code: string) => Promise<boolean>;
  resendVerification: (email: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingTwoFactor, setPendingTwoFactor] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const userUnsubRef = useRef<(() => void) | null>(null);
  const resolvedRef = useRef(false);
  const pendingProfileRef = useRef<User | null>(null);
  const twoFactorVerifiedRef = useRef(false);

  const setupSubscription = useCallback((profile: User) => {
    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }
    setUserData(profile);
    userUnsubRef.current = usersService.subscribeById(profile.id, setUserData);
  }, []);

  const finishLoading = useCallback(() => {
    if (!resolvedRef.current) {
      resolvedRef.current = true;
      setLoading(false);
    }
  }, []);

  const resolveUser = useCallback(async (supabaseUser: SupabaseUser | null) => {
    setCurrentUser(supabaseUser);

    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }

    if (supabaseUser) {
      if (window.location.hash.includes('type=recovery')) {
        setIsRecoveryMode(true);
        window.location.hash = '';
      }

      try {
        let profile = await usersService.getById(supabaseUser.id);
        if (!profile) {
          profile = await usersService.getByEmail(supabaseUser.email!);
        }
        if (profile) {
          const meta = supabaseUser.user_metadata || {};
          const googlePhoto = meta.avatar_url || meta.picture || '';
          if (!profile.photo && googlePhoto) {
            await usersService.update(profile.id, { photo: googlePhoto }).catch(() => {});
            profile.photo = googlePhoto;
          }

          if (supabaseUser.email && profile.email !== supabaseUser.email) {
            await usersService.update(profile.id, { email: supabaseUser.email }).catch(() => {});
            profile.email = supabaseUser.email;
          }

          if (needsEmailVerification) setNeedsEmailVerification(false);

          if (window.location.hash.includes('type=recovery')) {
            pendingProfileRef.current = null;
            setPendingTwoFactor(false);
            setUserData(profile);
            return;
          }

          if (profile.twoFactorEnabled && !pendingProfileRef.current && !twoFactorVerifiedRef.current) {
            pendingProfileRef.current = profile;
            setPendingTwoFactor(true);
          } else {
            pendingProfileRef.current = null;
            setPendingTwoFactor(false);
            setupSubscription(profile);
          }
        } else {
          const meta = supabaseUser.user_metadata || {};
          const newProfile: User = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: meta.name || supabaseUser.email?.split('@')[0] || 'User',
            nickname: meta.nickname || '',
            photo: meta.avatar_url || meta.picture || '',
            role: 'referee',
            createdAt: new Date(),
          };
          await usersService.create(newProfile).catch(() => {});
          setupSubscription(newProfile);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setUserData(null);
      }
    } else {
      setUserData(null);
      setPendingTwoFactor(false);
    }
  }, [setupSubscription]);

  useEffect(() => {
    let mounted = true;
    let forceTimeout: ReturnType<typeof setTimeout>;

    const finish = () => {
      if (mounted && !resolvedRef.current) {
        resolvedRef.current = true;
        setLoading(false);
      }
    };

    if (window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    forceTimeout = setTimeout(finish, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(forceTimeout);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
      resolveUser(session?.user ?? null).then(finish);
    });

    return () => {
      mounted = false;
      resolvedRef.current = false;
      clearTimeout(forceTimeout);
      subscription.unsubscribe();
      if (userUnsubRef.current) {
        userUnsubRef.current();
      }
    };
  }, [resolveUser]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const register = async (email: string, password: string, name: string, role: UserRole, nickname?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, nickname: nickname || '', role },
        emailRedirectTo: window.location.origin,
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    if (!data.user.email_confirmed_at) {
      setNeedsEmailVerification(true);
      return email;
    }

    try {
      await usersService.create({
        id: data.user.id,
        email,
        name,
        nickname: nickname || '',
        photo: '',
        role,
        createdAt: new Date()
      });
    } catch (err) {
      console.warn('Client-side profile insert failed (server trigger may handle it):', err);
    }

    let profile: User | null = null;
    for (let i = 0; i < 10; i++) {
      profile = await usersService.getById(data.user.id);
      if (profile) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (profile) {
      setupSubscription(profile);
    }
  };

  const resendVerification = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/settings',
    });
    if (error) throw error;
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setIsRecoveryMode(false);
    window.location.hash = '';
    if (currentUser) {
      notificationsService.create({
        userId: currentUser.id,
        title: 'Password Changed',
        message: 'Your password was successfully updated.',
        read: false,
        createdAt: new Date(),
      }).catch(() => {});
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  };

  const logout = async () => {
    pendingProfileRef.current = null;
    twoFactorVerifiedRef.current = false;
    setPendingTwoFactor(false);
    await supabase.auth.signOut();
  };

  const verifyTwoFactorCode = async (code: string): Promise<boolean> => {
    const profile = pendingProfileRef.current;
    if (!profile) return false;

    try {
      const secret = await totpService.getSecret(profile.id);
      if (!secret) return false;

      const isValid = authenticator.check(code, secret);
      if (isValid) {
        twoFactorVerifiedRef.current = true;
        pendingProfileRef.current = null;
        setPendingTwoFactor(false);
        setupSubscription(profile);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, pendingTwoFactor, needsEmailVerification, isRecoveryMode, login, register, signInWithGoogle, logout, verifyTwoFactorCode, resendVerification, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
