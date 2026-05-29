import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthPage } from './pages/AuthPage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { Dashboard } from './components/Dashboard';
import { OnboardingFlow } from './pages/onboarding/OnboardingFlow';
import { supabase } from './lib/supabase';

interface VisaRequirement {
  id: string;
  name: string;
  mandatory: boolean;
  category: string;
}

function AppContent() {
  const { user, loading } = useAuth();
  const [isGoogleCallback, setIsGoogleCallback] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIsGoogleCallback(params.has('code') || params.has('error'));
  }, []);

  useEffect(() => {
    if (!user) {
      setCheckingOnboarding(false);
      return;
    }

    const checkOnboardingStatus = async () => {
      const { data } = await supabase
        .from('requirements')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      setShowOnboarding(!data);
      setCheckingOnboarding(false);
    };

    checkOnboardingStatus();
  }, [user]);

  const handleOnboardingComplete = async (requirements: VisaRequirement[], country: string) => {
    if (!user) return;

    const requirementsData = requirements.map((req, index) => ({
      user_id: user.id,
      name: req.name,
      phase: index < 3 ? 1 : index < 6 ? 2 : index < 9 ? 3 : 4,
      status: 'pending' as const,
      dependency_id: null,
    }));

    const { error } = await supabase
      .from('requirements')
      .insert(requirementsData);

    if (!error) {
      setShowOnboarding(false);
      window.location.reload();
    }
  };

  if (loading || checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-slate-300 border-t-slate-900 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isGoogleCallback) {
    return <GoogleCallbackPage />;
  }

  if (!user) {
    return <AuthPage />;
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
