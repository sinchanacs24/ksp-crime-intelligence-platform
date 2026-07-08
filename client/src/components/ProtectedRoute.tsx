import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Gate that waits for the Catalyst-authenticated user's application
 * profile to resolve before rendering protected content. Actual login
 * (the credential entry screen) is handled by Catalyst's embedded
 * authentication widget on the Login page — this component only guards
 * everything *after* login.
 */
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, error } = useAuth();
  const { t } = useLanguage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950 text-slate-400">
        {t('loading')}
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-base-950 text-slate-300 gap-3">
        <p className="text-lg font-medium">Session not found</p>
        <p className="text-sm text-slate-500 max-w-md text-center">
          Please sign in through the KSP Crime Intelligence Platform login page. If you were signed in and see this
          message, your session may have expired.
        </p>
        <a href="/login" className="btn-primary mt-2">Go to Login</a>
      </div>
    );
  }

  return <>{children}</>;
}
