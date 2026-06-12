import React, { useEffect, useState } from 'react';
import { driveRepo } from '@/infrastructure/config/services';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export function GoogleCallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('❌ GoogleCallback: OAuth error:', error);
      setStatus('error');
      setErrorMessage(`Google returned an error: ${error}`);
      return;
    }

    if (code) {
      console.log('🔄 GoogleCallback: Received code, exchanging for tokens...');
      driveRepo.handleCallback(code)
        .then(() => {
          console.log('✅ GoogleCallback: Successfully connected!');
          setStatus('success');
          // We still want to eventually go home, but let the user see success first
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        })
        .catch((err) => {
          console.error('❌ GoogleCallback: Callback error:', err);
          setStatus('error');
          setErrorMessage(err instanceof Error ? err.message : 'Failed to exchange authentication code.');
        });
    } else {
      setStatus('error');
      setErrorMessage('No authentication code found in the URL.');
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-muted border-t-primary animate-spin mx-auto mb-4" />
            <h2 className="text-foreground text-2xl font-bold tracking-tight">Connecting Google Drive...</h2>
            <p className="text-muted-foreground font-medium">Please wait while we set up your secure backup.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-foreground text-2xl font-bold tracking-tight">Securely Connected!</h2>
              <p className="text-muted-foreground font-medium">Your documents will now be backed up to your Drive.</p>
            </div>
            <p className="text-xs text-muted-foreground animate-pulse pt-4">Redirecting you back to your hub...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto shadow-lg shadow-destructive/10">
              <XCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-foreground text-2xl font-bold tracking-tight">Connection Failed</h2>
              <p className="text-destructive font-semibold text-sm bg-destructive/5 p-3 rounded-lg border border-destructive/10">
                {errorMessage}
              </p>
            </div>
            <div className="pt-6">
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="gap-2 font-bold rounded-xl h-12 px-6"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
