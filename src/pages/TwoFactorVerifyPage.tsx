import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, LogOut, Smartphone } from 'lucide-react';

export const TwoFactorVerifyPage: React.FC = () => {
  const { pendingTwoFactor, verifyTwoFactorCode, logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!pendingTwoFactor) {
      navigate('/', { replace: true });
    }
  }, [pendingTwoFactor, navigate]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  if (!pendingTwoFactor) return null;

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newCode = ['', '', '', '', '', ''];
      digits.split('').forEach((d, i) => { if (i < 6) newCode[i] = d; });
      setCode(newCode);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      if (digits.length === 6) {
        submitCode(digits);
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    if (!digit && value !== '') return;

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    const fullCode = newCode.join('');
    if (fullCode.length === 6) {
      submitCode(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const digits = text.replace(/\D/g, '').slice(0, 6);
    if (digits.length > 0) {
      const newCode = ['', '', '', '', '', ''];
      digits.split('').forEach((d, i) => { if (i < 6) newCode[i] = d; });
      setCode(newCode);
      const nextIndex = Math.min(digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      if (digits.length === 6) {
        submitCode(digits);
      }
    }
  };

  const submitCode = async (fullCode?: string) => {
    const c = fullCode || code.join('');
    if (c.length !== 6) return;

    setVerifying(true);
    setError('');

    const valid = await verifyTwoFactorCode(c);
    if (valid) {
      navigate('/', { replace: true });
    } else {
      setError('Invalid code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    setVerifying(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-2xl mb-4">
              <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold dark:text-gray-100">Two-Factor Authentication</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
              Enter the 6-digit code from your authenticator app
            </p>
            {currentUser?.email && (
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{currentUser.email}</p>
            )}
          </div>

          <div className="flex justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className={`w-11 h-12 text-center text-lg font-bold border-2 rounded-xl transition-colors dark:bg-gray-700 dark:text-gray-100 ${
                  digit
                    ? 'border-blue-500 dark:border-blue-400'
                    : 'border-gray-300 dark:border-gray-600'
                } focus:outline-none focus:border-blue-500 dark:focus:border-blue-400`}
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <button
            onClick={() => submitCode()}
            disabled={code.join('').length !== 6 || verifying}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors mb-4"
          >
            {verifying ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Verify
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </button>

          <button
            onClick={handleLogout}
            className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center justify-center gap-1 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};
