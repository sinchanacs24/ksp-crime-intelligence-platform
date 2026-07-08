import React, { useEffect } from 'react';
import { Shield } from 'lucide-react';

declare global {
  interface Window {
    catalyst: any;
  }
}

export default function Login() {
  useEffect(() => {
    if (window.catalyst && window.catalyst.auth) {
      const config = {
        service_url: '/app/index.html'
      };
      window.catalyst.auth.signIn('loginDivElementId', config);
    }
  }, []);

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-accent/10 p-4 rounded-2xl mb-4">
            <Shield className="text-accent" size={36} />
          </div>
          <h1 className="text-xl font-semibold text-slate-100">KSP Crime Intelligence Platform</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">
            Karnataka State Police — Authorized personnel only
          </p>
        </div>

        <div className="card">
          <div id="loginDivElementId" className="min-h-[280px]">
            {/* Catalyst's embedded login form renders here at runtime */}
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          Access is restricted to investigators, analysts, and officers of the Karnataka State Police.
          This system is not for public/citizen use.
        </p>
      </div>
    </div>
  );
}