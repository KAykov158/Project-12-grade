import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';

export const AuthConfirmPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState('Processing...');

  useEffect(() => {
    const handleConfirmation = async () => {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') as 'email' | 'recovery' | 'invite' | undefined;
      const next = searchParams.get('next') || '/';

      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) {
          setMsg('Confirmation failed. Please try again.');
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate(next, { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    };

    handleConfirmation();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300">{msg}</p>
      </div>
    </div>
  );
};
