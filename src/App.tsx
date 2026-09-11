import { useEffect, useRef, useState } from 'react';
import { useAuth } from './contexts/useAuth';
import { AuthPage } from './pages/AuthPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { Dashboard } from './components/Dashboard';
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow';
import { SupportPage } from './pages/SupportPage';
import { AdminSupportPage } from './pages/AdminSupportPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { requirementService } from '@/infrastructure/config/services';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckCircle2 } from 'lucide-react';

function useIsAdmin(user: import('@supabase/supabase-js').User | null): boolean {
  return !!(user?.user_metadata as Record<string, unknown>)?.is_admin;
}

function App() {
  const { user, loading } = useAuth();
  const [isGoogleCallback, setIsGoogleCallback] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [savingRequirements, setSavingRequirements] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const celebrationCount = useRef(0);

  // Guard: once the user has just completed onboarding in this session,
  // prevent the useEffect re-check from flipping showOnboarding back to true.
  // Root cause: after setupInitialRequirements(), the useEffect([user]) fires
  // again (auth token refresh changes user reference), queries the DB before
  // the write is visible, gets 0 rows, and sets showOnboarding(true) again.
  const onboardingJustCompleted = useRef(false);

  console.log('📱 App: Rendering...', { loading, checkingOnboarding, hasUser: !!user });

  // Detect Google OAuth callback (Drive connect) from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isCallback = params.has('code') || params.has('error');
    console.log('📱 App: Checking for Google callback...', { isCallback });
    setIsGoogleCallback(isCallback);
  }, []);

  // Page routing from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const isSupportPage = urlParams.has('support');
  const isAdminSupport = urlParams.get('admin') === 'support';
  const ticketIdFromUrl = urlParams.get('ticket');
  const isPrivacyPage = urlParams.has('privacy');
  const isTermsPage = urlParams.has('terms');

  // Check whether this user has completed onboarding (has requirements in DB)
  useEffect(() => {
    if (!user) {
      console.log('📱 App: No user, skipping onboarding check');
      setCheckingOnboarding(false);
      return;
    }

    // Skip re-check if onboarding was just completed — prevents the race condition
    // where the DB write isn't committed before the next SELECT runs.
    if (onboardingJustCompleted.current) {
      console.log('📱 App: Onboarding just completed — skipping re-check to avoid race.');
      setCheckingOnboarding(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      console.log('📱 App: Checking onboarding status for user:', user.id);
      try {
        const requirements = await requirementService.getRequirements(user.id);
        console.log('📱 App: Requirements fetched:', requirements.length);
        setShowOnboarding(requirements.length === 0);
      } catch (err) {
        console.error('📱 App: Error checking onboarding status:', err);
        // On DB error, default to dashboard — do NOT loop back to onboarding
        setShowOnboarding(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const handleOnboardingComplete = async (selectedRequirements: any[], country: string) => {
    if (!user) return;

    console.log('📱 App: Saving requirements...', { count: selectedRequirements.length, country });
    setSavingRequirements(true);

    // Set the guard BEFORE the async save so that any auth-state re-render
    // that fires during the network round-trip cannot trigger the re-check race.
    onboardingJustCompleted.current = true;

    try {
      await requirementService.setupInitialRequirements(
        user.id,
        selectedRequirements.map(req => ({
          name: req.name,
          category: req.category,
          mandatory: req.mandatory,
        })),
        country
      );
      console.log('📱 App: Requirements saved. Navigating to dashboard...');
      celebrationCount.current = selectedRequirements.length;
      setShowOnboarding(false);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2500);
    } catch (err) {
      console.error('📱 App: Error saving requirements:', err);
      // Release the guard so the user can retry
      onboardingJustCompleted.current = false;
      alert('There was a problem saving your setup. Please try again.');
    } finally {
      setSavingRequirements(false);
    }
  };

  // ── Render gates — ORDER MATTERS ─────────────────────────────────────────

  if (loading || checkingOnboarding || savingRequirements) {
    console.log('📱 App: Rendering loading state', { loading, checkingOnboarding, savingRequirements });
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-12 rounded-full border-4 border-zinc-800 border-t-zinc-200 animate-spin" />
          <div className="flex flex-col gap-1">
            <p className="text-lg font-bold tracking-tight text-zinc-100">
              {savingRequirements ? 'Preparing Your Hub' : 'Initializing Portal'}
            </p>
            <p className="animate-pulse text-sm text-zinc-500">
              {savingRequirements
                ? 'Generating your personalized roadmap...'
                : loading
                ? 'Authenticating secure session...'
                : 'Synchronizing roadmap...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Legal pages — accessible without auth
  if (isPrivacyPage) {
    return <PrivacyPage onBack={() => { window.location.href = '/'; }} />;
  }
  if (isTermsPage) {
    return <TermsPage onBack={() => { window.location.href = '/'; }} />;
  }

  // Google Drive OAuth callback — must be checked before !user guard
  if (isGoogleCallback) {
    console.log('📱 App: Rendering GoogleCallbackPage');
    return <GoogleCallbackPage />;
  }

  // No authenticated session → show login
  if (!user) {
    console.log('📱 App: No user — rendering AuthPage');
    return <AuthPage />;
  }

  // First-time user with no requirements saved → onboarding wizard
  if (showOnboarding) {
    console.log('📱 App: Rendering OnboardingFlow');
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Support page (user-facing)
  if (isSupportPage) {
    return <SupportPage onBack={() => { window.location.href = '/'; }} initialTicketId={ticketIdFromUrl} />;
  }

  // Admin support dashboard — only for users with is_admin in JWT metadata
  if (isAdminSupport && useIsAdmin(user)) {
    return <AdminSupportPage onBack={() => { window.location.href = '/'; }} initialTicketId={ticketIdFromUrl} />;
  }

  // Authenticated + requirements exist → dashboard
  console.log('📱 App: Rendering Dashboard');
  return (
    <>
      <Dashboard />
      {/* Onboarding celebration overlay */}
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent
          className="sm:max-w-sm text-center border-0 bg-card/95 backdrop-blur-xl shadow-2xl"
          aria-label="Setup complete celebration"
        >
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-[var(--status-complete)]/20" />
              <div className="relative flex size-20 items-center justify-center rounded-full bg-[var(--status-complete)]/10 ring-2 ring-[var(--status-complete)]/30">
                <CheckCircle2 className="size-10" style={{ color: 'var(--status-complete)' }} />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">You're all set!</h2>
              <p className="text-sm text-muted-foreground font-medium">
                You have {celebrationCount.current} documents to collect.<br />Let's get started.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default App;
