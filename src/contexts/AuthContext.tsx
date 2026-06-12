import React, { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthContext } from './AuthContextInstance';
import { sendWelcomeEmail, sendNewDeviceAlertEmail } from '../lib/resend';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  console.log('🔐 AuthProvider: Rendering...');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔐 AuthProvider: Initializing auth state...', { currentLoading: loading });
    
    let isMounted = true;

    // Safety timeout: If auth hasn't resolved in 10 seconds, force clear loading
    // to prevent a permanent blank screen.
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('🔐 AuthProvider: Auth resolution timed out. Forcing UI load.');
        setLoading(false);
      }
    }, 10000);

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        clearTimeout(timeout);

        if (error) {
          const errName = (error as { name?: string })?.name ?? '';
          if (errName === 'AuthRetryableFetchError' || error.message?.toLowerCase().includes('fetch')) {
            console.warn('🔐 AuthProvider: Network issue fetching session — proceeding as logged out.', error);
          } else {
            console.error('❌ AuthProvider: getSession error:', error);
          }
        }
        
        console.log('🔐 AuthProvider: Session fetched:', session ? 'User logged in' : 'No session');
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        const errName = (err as { name?: string })?.name ?? '';
        if (errName === 'AuthRetryableFetchError') {
          console.warn('🔐 AuthProvider: AuthRetryableFetchError on init — network unavailable, rendering app as logged out.');
        } else {
          console.error('❌ AuthProvider: getSession exception:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 AuthProvider: Auth state changed:', event, session ? 'User exists' : 'No session');
      if (isMounted) {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // ── Token refresh events ──────────────────────────────────────────────
        if (event === 'TOKEN_REFRESHED') {
          console.log('🔐 AuthProvider: Token refreshed successfully.');
        }

        if (event === 'SIGNED_OUT') {
          // Clear any stale session flags
          console.log('🔐 AuthProvider: User signed out.');
        }

        // ── Email triggers ───────────────────────────────────────────────────
        if (event === 'SIGNED_IN' && session?.user) {
          const email = session.user.email!;
          const firstName = session.user.user_metadata?.full_name?.split(' ')[0];

          // Welcome email — only on very first sign-in (no previous last_sign_in)
          const isFirstSignIn = !session.user.last_sign_in_at ||
            session.user.last_sign_in_at === session.user.created_at;
          if (isFirstSignIn) {
            sendWelcomeEmail({ to: email, firstName }).catch(console.warn);
          }

          // New device alert — fires when AuthPage detected a new device and set a flag
          const newDeviceFlag = sessionStorage.getItem('vrh_new_device_alert');
          if (newDeviceFlag === 'pending') {
            sessionStorage.removeItem('vrh_new_device_alert');
            // Also set a show flag for the dashboard banner
            sessionStorage.setItem('vrh_device_alert_show', '1');
            sendNewDeviceAlertEmail({
              to: email,
              firstName,
              browser: navigator.userAgent.split(' ').slice(-1)[0],
              time: new Date().toLocaleString(),
            }).catch(console.warn);
          }
        }
      }
    });

    return () => {
      console.log('🔐 AuthProvider: Unmounting and unsubscribing');
      isMounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array — runs once on mount only. 'loading' must NOT be here.

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw error;
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'magiclink' });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  try {
    console.log('🔐 AuthProvider: Returning Provider component with children:', !!children);
    return (
      <AuthContext.Provider value={{ user, session, loading, sendOtp, verifyOtp, signOut }}>
        {children}
      </AuthContext.Provider>
    );
  } catch (err) {
    console.error('❌ AuthProvider: Render error:', err);
    throw err;
  }
}
