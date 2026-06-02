import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersService } from '../supabase';
import { Button, Input, Card } from '../components/ui';

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

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState<'admin' | 'referee' | 'coach'>('referee');
  const [errors, setErrors] = useState<ValidationError[]>([]);

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

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
    
    if (isRegister && password) {
      const validationErrors = validatePassword(password);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
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
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-600 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 dark:text-gray-100">
          {isRegister ? 'Create Account' : 'Referee Match Manager'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Optional display name"
              />
              <div className="flex flex-col gap-1">
                <label className="font-medium dark:text-gray-200">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="border rounded-lg px-3 py-2 border-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
                >
                  <option value="admin">Admin</option>
                  <option value="referee">Referee</option>
                  <option value="coach">Coach</option>
                </select>
              </div>
            </>
          )}
          
          <Input
            label={isRegister ? "Email" : "Email or Nickname"}
            type={isRegister ? "email" : "text"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isRegister ? "email@example.com" : "email@example.com or nickname"}
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {errors.some(e => e.type === 'login') && (
            <div className="bg-red-50 dark:bg-red-900/50 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm">
              {errors.find(e => e.type === 'login')?.message}
            </div>
          )}

          {isRegister && (
            <div className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="font-medium mb-1">Password requirements:</p>
              <ul className="space-y-1">
                <li className={password.length >= 8 ? 'text-green-600' : 'text-red-500'}>
                  {password.length >= 8 ? '✓' : '✗'} At least 8 characters
                </li>
                <li className={/[A-Z]/.test(password) ? 'text-green-600' : 'text-red-500'}>
                  {/[A-Z]/.test(password) ? '✓' : '✗'} At least 1 uppercase letter
                </li>
                <li className={/[0-9]/.test(password) ? 'text-green-600' : 'text-red-500'}>
                  {/[0-9]/.test(password) ? '✓' : '✗'} At least 1 number
                </li>
                <li className={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-green-600' : 'text-red-500'}>
                  {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '✗'} At least 1 special character (!@#$%^&* etc.)
                </li>
              </ul>
            </div>
          )}

          <Button type="submit" className="w-full">
            {isRegister ? 'Register' : 'Login'}
          </Button>
        </form>

        <p className="text-center mt-4 text-gray-600 dark:text-gray-400">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setErrors([]);
            }}
            className="text-blue-600 hover:underline"
          >
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>
      </Card>
    </div>
  );
};
