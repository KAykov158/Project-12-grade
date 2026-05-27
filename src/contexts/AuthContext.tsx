import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase, usersService } from '../supabase';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: SupabaseUser | null;
  userData: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: UserRole, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userUnsubRef = useRef<(() => void) | null>(null);
  const resolvedRef = useRef(false);

  const setupSubscription = useCallback((profile: User) => {
    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }
    setUserData(profile);
    userUnsubRef.current = usersService.subscribeById(profile.id, setUserData);
  }, []);

  const resolveUser = useCallback(async (supabaseUser: SupabaseUser | null) => {
    setCurrentUser(supabaseUser);

    if (userUnsubRef.current) {
      userUnsubRef.current();
      userUnsubRef.current = null;
    }

    if (supabaseUser) {
      try {
        let profile = await usersService.getById(supabaseUser.id);
        if (!profile) {
          profile = await usersService.getByEmail(supabaseUser.email!);
        }
        if (profile) {
          setupSubscription(profile);
        } else {
          console.warn('No profile found for user:', supabaseUser.email);
          setUserData(null);
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        setUserData(null);
      }
    } else {
      setUserData(null);
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

    forceTimeout = setTimeout(finish, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(forceTimeout);
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
        data: { name, nickname: nickname || '', role }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error('Registration failed');

    await usersService.create({
      id: data.user.id,
      email,
      name,
      nickname: nickname || '',
      photo: '',
      role,
      createdAt: new Date()
    });

    const profile = await usersService.getById(data.user.id);
    if (profile) {
      setupSubscription(profile);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
