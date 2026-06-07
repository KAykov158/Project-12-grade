import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../supabase';
import { Button } from '../components/ui';
import {
  Shield, Calendar, Users, ArrowRight, Eye, EyeOff,
  Mail, Lock, User, Sparkles, ChevronRight, ClipboardList, LogIn, UserPlus,

} from 'lucide-react';

interface ValidationError {
  type: 'length' | 'capital' | 'number' | 'special' | 'login';
  message: string;
}

const validatePassword = (password: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  if (password.length < 8) {
    errors.push({ type: 'length', message: 'At least 8 characters' });
  }
  if (!/[A-Z]/.test(password)) {
    errors.push({ type: 'capital', message: 'At least 1 uppercase letter' });
  }
  if (!/[0-9]/.test(password)) {
    errors.push({ type: 'number', message: 'At least 1 number' });
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push({ type: 'special', message: 'At least 1 special character (!@#$%^&* etc.)' });
  }
  return errors;
};

const features = [
  { icon: ClipboardList, title: 'Match Management', desc: 'Create, assign & track matches with detailed reports' },
  { icon: Calendar, title: 'Smart Calendar', desc: 'Monthly overview with filtering & important markers' },
  { icon: Users, title: 'Team Directory', desc: 'Manage teams, players & squad rosters' },
  { icon: Shield, title: 'Referee Hub', desc: 'Assignments, accept/decline & real-time notifications' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, login, register, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'admin' | 'referee' | 'coach'>('referee');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (emailOrNickname: string, password: string) => {
    let emailToUse = emailOrNickname;

    if (!emailOrNickname.includes('@')) {
      const user = await usersService.getByNickname(emailOrNickname);
      if (user) {
        emailToUse = user.email;
      } else {
        throw new Error('User not found');
      }
    }

    await login(emailToUse, password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setIsSubmitting(true);

    if (isRegister && password) {
      const validationErrors = validatePassword(password);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      if (isRegister) {
        await register(email, password, name, role, nickname);
      } else {
        await handleLogin(email, password);
      }
    } catch (err: any) {
      if (err.message === 'User not found') {
        setErrors([{ type: 'login', message: 'User not found. Check your email or nickname.' }]);
      } else if (isRegister) {
        setErrors([{ type: 'login', message: err.message || 'Registration failed. Please try again.' }]);
      } else {
        setErrors([{ type: 'login', message: 'Invalid credentials. Please try again.' }]);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setErrors([]);
  };

  const loginError = errors.find(e => e.type === 'login');

  return (
    <div className="min-h-screen flex">
      {/* Left - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-emerald-900 via-green-700 to-teal-600">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-300 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          {/* Brand */}
          <div className="animate-fade-in-left stagger-1">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center animate-pulse-glow">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Referee</h1>
                <p className="text-emerald-200 text-sm font-medium -mt-1">Match Manager</p>
              </div>
            </div>
          </div>

          <p className="text-emerald-100 text-lg mb-12 animate-fade-in-left stagger-2 leading-relaxed">
            Streamline your match officiating workflow — from assignments to reports, all in one place.
          </p>

          {/* Rotating feature highlight */}
          <div className="space-y-4 animate-fade-in-left stagger-3">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-500 cursor-pointer ${
                  idx === activeFeature
                    ? 'bg-white/15 shadow-lg scale-[1.02]'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
                onMouseEnter={() => setActiveFeature(idx)}
              >
                <div className={`p-2.5 rounded-lg transition-all duration-500 ${
                  idx === activeFeature ? 'bg-white/25' : 'bg-white/10'
                }`}>
                  <feature.icon className={`w-5 h-5 transition-all duration-500 ${
                    idx === activeFeature ? 'text-white' : 'text-emerald-200'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm transition-colors duration-500 ${
                    idx === activeFeature ? 'text-white' : 'text-emerald-100'
                  }`}>{feature.title}</h3>
                  <p className="text-emerald-200/70 text-xs mt-0.5">{feature.desc}</p>
                </div>
                {idx === activeFeature && (
                  <ChevronRight className="w-4 h-4 text-white/60 animate-fade-in-up shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex items-center gap-8 animate-fade-in-left stagger-4">
            <div>
              <p className="text-white text-2xl font-bold">500+</p>
              <p className="text-emerald-200/70 text-xs">Matches Managed</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-white text-2xl font-bold">120+</p>
              <p className="text-emerald-200/70 text-xs">Active Referees</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-white text-2xl font-bold">50+</p>
              <p className="text-emerald-200/70 text-xs">Teams</p>
            </div>
          </div>
        </div>

        {/* Bottom gradient fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-900/50 to-transparent" />
      </div>

      {/* Right - Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Referee</h1>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium -mt-0.5">Match Manager</p>
            </div>
          </div>

          {/* Header */}
          <div className="animate-fade-in-up stagger-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {isRegister
                ? 'Join the referee community'
                : 'Sign in to manage your matches'}
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1.5 animate-fade-in-up stagger-2 relative">
            <div
              className={`absolute top-1.5 bottom-1.5 w-1/2 rounded-lg bg-white dark:bg-gray-700 shadow-sm transition-all duration-300 ease-out`}
              style={{ left: isRegister ? 'calc(50% - 3px)' : '3px' }}
            />
            <button
              type="button"
              onClick={() => !isRegister ? null : toggleMode()}
              className={`relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-300 ${
                !isRegister
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <LogIn className="w-4 h-4 inline mr-2 -mt-0.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => isRegister ? null : toggleMode()}
              className={`relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-300 ${
                isRegister
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2 -mt-0.5" />
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5 animate-fade-in-up stagger-3">
            {isRegister && (
              <div className="space-y-5 animate-slide-down">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nickname
                  </label>
                  <div className="relative">
                    <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                      placeholder="Optional display name"
                    />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as any)}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 appearance-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="referee">Referee</option>
                      <option value="coach">Coach</option>
                    </select>
                    <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 rotate-90 pointer-events-none" />
                  </div>
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {isRegister ? 'Email' : 'Email or Nickname'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                <input
                  type={isRegister ? 'email' : 'text'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                  placeholder={isRegister ? 'email@example.com' : 'email@example.com or nickname'}
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-300"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {loginError && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-sm animate-slide-down">
                {loginError.message}
              </div>
            )}

            {/* Password requirements */}
            {isRegister && (
              <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-slide-down">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  Password requirements:
                </p>
                <ul className="space-y-1.5">
                  {([
                    { check: password.length >= 8, text: 'At least 8 characters' },
                    { check: /[A-Z]/.test(password), text: 'At least 1 uppercase letter' },
                    { check: /[0-9]/.test(password), text: 'At least 1 number' },
                    { check: /[!@#$%^&*(),.?":{}|<>]/.test(password), text: 'At least 1 special character' },
                  ] as const).map(({ check, text }, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-2 text-sm transition-all duration-300 ${
                        check
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                        check
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {check ? '✓' : ''}
                      </span>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 hover:shadow-xl hover:shadow-emerald-200 dark:hover:shadow-emerald-900/40 transition-all duration-300 font-semibold text-white rounded-xl flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isRegister ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
                </span>
              )}
            </Button>
          </form>

          {/* Toggle mode */}
          <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400 animate-fade-in-up stagger-4">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={toggleMode}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium hover:underline transition-colors duration-300"
            >
              {isRegister ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
