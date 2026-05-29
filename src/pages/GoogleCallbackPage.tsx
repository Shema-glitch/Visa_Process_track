import React, { useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { handleGoogleCallback } from '../lib/googleDrive';

export function GoogleCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('OAuth error:', error);
      window.location.href = '/';
      return;
    }

    if (code) {
      handleGoogleCallback(code)
        .then(() => {
          window.location.href = '/';
        })
        .catch((err) => {
          console.error('Callback error:', err);
          window.location.href = '/';
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-white border-t-blue-300 animate-spin mx-auto mb-4" />
        <h2 className="text-white text-xl font-semibold">Connecting Google Drive...</h2>
        <p className="text-blue-100 text-sm mt-2">Please wait while we set up your backup</p>
      </div>
    </div>
  );
}
