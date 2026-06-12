import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cloud, AlertCircle, Mail, ArrowLeft, Monitor, CheckCircle2,
  ShieldCheck, Smartphone, Laptop, Clock, XCircle, RefreshCw,
  Loader2, ArrowRight, Info,
} from 'lucide-react';
import * as Sentry from '@sentry/react';
import { useAuth } from '../contexts/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Badge } from '@/components/ui/badge';

// ─────────────────────────────────────────────
// SECURITY UTILITIES
// ─────────────────────────────────────────────

/** Sanitize an email input: trim, lowercase, strip dangerous chars. */
const sanitizeEmail = (raw: string): string =>
  raw.trim().toLowerCase().replace(/[<>"'`;\\]/g, '');

/** Validate email with a strict RFC-5321-inspired regex. */
const isValidEmail = (email: string): boolean =>
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);

/** Only allow digits in the OTP slot. Strip everything else. */
const sanitizeOtp = (raw: string): string => raw.replace(/\D/g, '').slice(0, 8);

const getDeviceFingerprint = (): string => {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return btoa(parts.join('|')).slice(0, 28);
};

const KNOWN_DEVICE_KEY = 'vrh_known_device';

const isKnownDevice = (): boolean => {
  try {
    return localStorage.getItem(KNOWN_DEVICE_KEY) === getDeviceFingerprint();
  } catch {
    return false;
  }
};

const markDeviceAsTrusted = () => {
  try {
    localStorage.setItem(KNOWN_DEVICE_KEY, getDeviceFingerprint());
  } catch {
    /* localStorage may be unavailable in strict private-browsing mode */
  }
};

// ─────────────────────────────────────────────
// CLIENT-SIDE RATE LIMITER
// ─────────────────────────────────────────────
const RATE_LIMIT_KEY = 'vrh_otp_timestamps';
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 3;

const getRecentAttempts = (): number[] => {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return [];
    const timestamps: number[] = JSON.parse(raw);
    const cutoff = Date.now() - RATE_WINDOW_MS;
    return timestamps.filter((t) => t > cutoff);
  } catch {
    return [];
  }
};

const recordAttempt = () => {
  try {
    const existing = getRecentAttempts();
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([...existing, Date.now()]));
  } catch { /* noop */ }
};

const getRemainingCooldownSeconds = (): number => {
  const attempts = getRecentAttempts();
  if (attempts.length < MAX_ATTEMPTS) return 0;
  const oldest = Math.min(...attempts);
  const releaseAt = oldest + RATE_WINDOW_MS;
  return Math.max(0, Math.ceil((releaseAt - Date.now()) / 1000));
};

// ─────────────────────────────────────────────
// INLINE TOAST NOTIFICATION
// Shows a non-blocking success or info message that auto-dismisses
// ─────────────────────────────────────────────
// CORNER TOAST SYSTEM
// Fixed bottom-right overlay — never clusters inside the card.
// ─────────────────────────────────────────────
type ToastType = 'success' | 'info' | 'error' | 'warning';

interface InlineToast {
  message: string;
  type: ToastType;
  id: number;
}

function CornerToastItem({ toast, onDismiss }: { toast: InlineToast; onDismiss: () => void }) {
  const config: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
    success: {
      icon: <CheckCircle2 className="size-4 text-emerald-500 flex-shrink-0" />,
      classes: 'bg-card border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
    },
    info: {
      icon: <Info className="size-4 text-blue-500 flex-shrink-0" />,
      classes: 'bg-card border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    },
    error: {
      icon: <AlertCircle className="size-4 text-red-500 flex-shrink-0" />,
      classes: 'bg-card border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    },
    warning: {
      icon: <Clock className="size-4 text-amber-500 flex-shrink-0" />,
      classes: 'bg-card border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    },
  };
  const { icon, classes } = config[toast.type];

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border shadow-lg shadow-black/10
        px-4 py-3 text-sm font-medium w-80 max-w-[calc(100vw-2rem)]
        animate-in slide-in-from-bottom-2 fade-in duration-300 ${classes}`}
      role="alert"
      aria-live="polite"
    >
      {icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
        aria-label="Dismiss notification"
      >
        <XCircle className="size-3.5" />
      </button>
    </div>
  );
}

/** Fixed corner overlay — rendered outside card flow via absolute positioning */
function CornerToastPortal({ toasts, onDismiss }: { toasts: InlineToast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 items-end pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <CornerToastItem toast={t} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MASKED EMAIL
// Shows asterisked email. Hover (or focus) to reveal full address.
// Keeps sensitive PII off the screen at a glance.
// ─────────────────────────────────────────────
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked =
    local.length <= 2
      ? '*'.repeat(local.length)
      : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
  return `${masked}@${domain}`;
}

function MaskedEmail({ email, className = '' }: { email: string; className?: string }) {
  const [revealed, setRevealed] = React.useState(false);

  return (
    <span
      className={`inline-flex items-center gap-0 cursor-default rounded-md
        px-1.5 py-0.5 font-mono text-xs transition-colors duration-150
        ring-1 ring-inset select-none
        ${revealed
          ? 'ring-primary/30 bg-primary/5 text-foreground'
          : 'ring-border bg-muted text-muted-foreground hover:ring-primary/40 hover:bg-primary/5'
        } ${className}`}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      tabIndex={0}
      aria-label={`Email address: ${email}`}
      title={revealed ? email : 'Hover to reveal email'}
    >
      {/* Fixed-width container prevents layout shift between masked/revealed */}
      <span className="inline-block" style={{ minWidth: `${email.length}ch` }}>
        {revealed ? email : maskEmail(email)}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────
// FEATURE PILL (left panel)
// ─────────────────────────────────────────────
function FeaturePill({ icon: Icon, label, delay }: { icon: React.ElementType; label: string; delay: string }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10 backdrop-blur
        hover:bg-white/10 transition-colors duration-200"
      style={{ animationDelay: delay }}
    >
      <Icon className="size-4 text-primary flex-shrink-0" />
      <span className="text-sm text-slate-300">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────
type Step = 'email' | 'new-device' | 'otp';

const STEPS: { key: Step; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'new-device', label: 'Security' },
  { key: 'otp', label: 'Verify' },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-0 mb-1">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center gap-1">
            <div
              className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300
                ${i < idx ? 'bg-emerald-500 text-white' :
                  i === idx ? 'bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20' :
                  'bg-muted text-muted-foreground'}`}
            >
              {i < idx ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </div>
            <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors duration-300
              ${i === idx ? 'text-primary' : i < idx ? 'text-emerald-500' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 mb-4 mx-1 transition-colors duration-500
              ${i < idx ? 'bg-emerald-500' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export function AuthPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isNewDevice, setIsNewDevice] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [toasts, setToasts] = useState<InlineToast[]>([]);
  const [resendCount, setResendCount] = useState(0);
  const [otpShake, setOtpShake] = useState(false);

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastIdRef = useRef(0);
  const verifyingRef = useRef(false);
  const { sendOtp, verifyOtp } = useAuth();

  useEffect(() => {
    setIsNewDevice(!isKnownDevice());
    const remaining = getRemainingCooldownSeconds();
    if (remaining > 0) startCooldownTimer(remaining);
    return () => { 
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      verifyingRef.current = false;
    };
  }, []);

  // ── Toast helpers ──
  const addToast = useCallback((message: string, type: ToastType = 'info', durationMs = 5000) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { message, type, id }]);
    if (durationMs > 0) {
      setTimeout(() => dismissToast(id), durationMs);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Cooldown timer ──
  const startCooldownTimer = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const formatCooldown = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Shake animation on OTP error ──
  const triggerOtpShake = () => {
    setOtpShake(true);
    setTimeout(() => setOtpShake(false), 600);
  };

  // ── Go back ──
  const goBack = () => {
    setStep('email');
    setOtp('');
    setError('');
    setToasts([]);
  };

  // ── Email validation on blur ──
  const handleEmailBlur = () => {
    const clean = sanitizeEmail(email);
    if (clean && !isValidEmail(clean)) {
      setEmailError('Please enter a valid email address (e.g. name@example.com).');
    } else {
      setEmailError('');
    }
  };

  // ── Send OTP ──
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();

    const clean = sanitizeEmail(email);

    if (!isValidEmail(clean)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    const remaining = getRemainingCooldownSeconds();
    if (remaining > 0) {
      startCooldownTimer(remaining);
      return;
    }

    setError('');
    setEmailError('');
    setLoading(true);

    Sentry.addBreadcrumb({
      category: 'auth',
      message: `OTP requested (new device: ${isNewDevice})`,
      level: 'info',
    });

    try {
      recordAttempt();
      await sendOtp(clean);
      setEmail(clean);
      setResendCount(0);
      addToast('Code sent! Check your inbox and spam folder.', 'success', 6000);
      setStep(isNewDevice ? 'new-device' : 'otp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const name = (err as { name?: string })?.name ?? '';

      console.error('❌ AuthPage.sendOtp error:', err);

      // "For security purposes, you can only request this after N seconds"
      // Extract the wait time and start the countdown timer automatically.
      const securityMatch = msg.match(/(\d+)\s*second/i);
      if (securityMatch) {
        const waitSecs = parseInt(securityMatch[1], 10);
        startCooldownTimer(waitSecs);
        setError('');
        // No toast needed — the countdown timer in the UI is self-explanatory
      } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('exceeded')) {
        startCooldownTimer(getRemainingCooldownSeconds() || 60);
        setError('');
        addToast('Too many requests — please wait before trying again.', 'warning');
      } else if (
        name === 'AuthRetryableFetchError' ||
        msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('network') ||
        msg.toLowerCase().includes('failed to fetch')
      ) {
        setError('Connection issue — please check your internet and try again.');
      } else if (msg.toLowerCase().includes('invalid')) {
        setError('That email address was rejected. Please double-check it.');
      } else {
        setError(msg || 'Failed to send code. Please try again.');
      }

      Sentry.captureException(err, { tags: { source: 'AuthPage.sendOtp' } });
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (cooldown > 0 || loading) return;

    const remaining = getRemainingCooldownSeconds();
    if (remaining > 0) {
      startCooldownTimer(remaining);
      addToast(`Please wait ${formatCooldown(remaining)} before resending.`, 'warning');
      return;
    }

    setLoading(true);
    setError('');
    try {
      recordAttempt();
      await sendOtp(email);
      setResendCount((c) => c + 1);
      addToast(
        resendCount >= 1
          ? 'Code resent again. Make sure to check your spam folder.'
          : 'A fresh code has been sent to your inbox.',
        'success',
        7000,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const name = (err as { name?: string })?.name ?? '';
      console.error('❌ AuthPage.resend error:', err);

      // Parse Supabase "For security purposes, you can only request this after N seconds"
      const securityMatch = msg.match(/(\d+)\s*second/i);
      if (securityMatch) {
        const waitSecs = parseInt(securityMatch[1], 10);
        startCooldownTimer(waitSecs);
        // Subtle toast so user knows why the button locked
        addToast(`Please wait ${waitSecs}s before resending again.`, 'warning', 4000);
      } else if (msg.toLowerCase().includes('rate') || msg.toLowerCase().includes('exceeded')) {
        startCooldownTimer(getRemainingCooldownSeconds() || 60);
        addToast('Resend limit reached — please wait before trying again.', 'warning');
      } else if (name === 'AuthRetryableFetchError' || msg.toLowerCase().includes('fetch')) {
        addToast('Connection issue while resending — check your internet.', 'error');
      } else {
        addToast('Could not resend code. Please try again in a moment.', 'error');
      }
      Sentry.captureException(err, { tags: { source: 'AuthPage.resend' } });
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP — auto-submit when 8 digits entered ──
  const handleOtpChange = (v: string) => {
    const clean = sanitizeOtp(v);
    setOtp(clean);
    setError('');
    if (clean.length === 8 && !loading && !verifyingRef.current) {
      // Small delay so user sees all 8 slots fill before submission
      setTimeout(() => handleVerifyOtp(clean), 180);
    }
  };

  const handleVerifyOtp = async (codeOverride?: string) => {
    const cleanOtp = sanitizeOtp(codeOverride ?? otp);
    if (cleanOtp.length < 8 || loading || verifyingRef.current) return;

    setError('');
    setLoading(true);
    verifyingRef.current = true;

    try {
      if (isNewDevice) {
        sessionStorage.setItem('vrh_new_device_alert', 'pending');
      }
      await verifyOtp(email, cleanOtp);
      markDeviceAsTrusted();
      addToast('Verified! Signing you in…', 'success', 3000);
      Sentry.addBreadcrumb({ category: 'auth', message: 'OTP verified successfully', level: 'info' });
    } catch (err) {
      sessionStorage.removeItem('vrh_new_device_alert');

      const msg = err instanceof Error ? err.message : '';
      const name = (err as { name?: string })?.name ?? '';

      console.error('❌ AuthPage.verifyOtp error:', err);
      triggerOtpShake();
      setOtp('');

      if (
        name === 'AuthRetryableFetchError' ||
        msg.toLowerCase().includes('fetch') ||
        msg.toLowerCase().includes('network')
      ) {
        setError('Connection issue — please check your internet and try again.');
      } else if (
        name === 'AuthApiError' ||
        msg.toLowerCase().includes('token has expired') ||
        msg.toLowerCase().includes('otp expired') ||
        msg.toLowerCase().includes('expired') ||
        msg.toLowerCase().includes('invalid')
      ) {
        // AuthApiError: token expired or already used — must request a fresh code
        setError('This code has expired or was already used. Request a fresh one below.');
      } else {
        setError(msg || 'Invalid or expired code. Please try again.');
      }

      Sentry.captureException(err, { tags: { source: 'AuthPage.verifyOtp' } });
    } finally {
      setLoading(false);
      verifyingRef.current = false;
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">

      {/* ── Left decorative panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-slate-900 via-slate-800 to-primary/30
        flex-col items-center justify-center p-12 gap-10 relative overflow-hidden">

        {/* Animated background grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Floating glow orbs */}
        <div className="absolute top-1/4 left-1/4 size-48 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 size-32 rounded-full bg-violet-500/15 blur-2xl animate-pulse"
          style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 text-center space-y-5 max-w-sm">
          <div className="mx-auto flex size-18 items-center justify-center rounded-2xl bg-primary/20
            backdrop-blur ring-1 ring-primary/30 shadow-xl shadow-primary/20">
            <Laptop className="size-9 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white tracking-tight">Visa Readiness Hub</h2>
            <p className="text-slate-400 text-sm leading-relaxed mt-2">
              Track every document, upload securely to Google Drive, and stay
              fully organised for your visa journey.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 gap-3 w-full max-w-xs">
          {[
            { icon: ShieldCheck, label: 'Passwordless — no password to steal' },
            { icon: Cloud, label: 'Google Drive integration' },
            { icon: CheckCircle2, label: 'Phase-locked document tracking' },
            { icon: Monitor, label: 'Device recognition & security alerts' },
          ].map(({ icon, label }, i) => (
            <FeaturePill key={label} icon={icon} label={label} delay={`${i * 80}ms`} />
          ))}
        </div>

        {/* Bottom trust note */}
        <p className="relative z-10 text-xs text-slate-500 text-center max-w-xs">
          Secured with Supabase OTP — no passwords stored, ever.
        </p>
      </div>

      {/* ── Right: Auth form ── */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8 relative">

        {/* Mobile banner */}
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <Smartphone className="size-5 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight">Visa Readiness Hub</span>
        </div>

        <div className="w-full max-w-sm space-y-4">

          {/* Step indicator */}
          {step !== 'email' && <StepIndicator current={step} />}

          {/* Corner toast overlay — rendered outside card, fixed to viewport */}
          <CornerToastPortal toasts={toasts} onDismiss={dismissToast} />

          {/* ── Main card ── */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5
            overflow-hidden animate-in fade-in duration-300">

            {/* Card header */}
            <div className="px-6 pt-6 pb-4 text-center border-b border-border/50">
              <h1 className="text-xl font-bold tracking-tight">
                {step === 'email' && 'Sign in or create account'}
                {step === 'new-device' && 'New device detected'}
                {step === 'otp' && 'Check your inbox'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">
                {step === 'email' && 'Enter your email to sign in or create an account.'}
                {step === 'new-device' && (
                  <span>New browser detected for{' '}
                    <MaskedEmail email={email} />
                  </span>
                )}
                {step === 'otp' && (
                  <span>Code sent to{' '}
                    <MaskedEmail email={email} />
                  </span>
                )}
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* ─── STEP 1: Email ─── */}
              {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-4" noValidate>
                  <div className="space-y-1.5">
                    <Label htmlFor="email-input" className="text-sm font-medium">Email address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground
                        pointer-events-none transition-colors group-focus-within:text-primary" />
                      <Input
                        id="email-input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          setEmail(sanitizeEmail(e.target.value));
                          if (emailError) setEmailError('');
                          if (error) setError('');
                        }}
                        onBlur={handleEmailBlur}
                        placeholder="name@example.com"
                        className={`pl-9 h-11 transition-all duration-200
                          ${emailError
                            ? 'border-destructive focus-visible:ring-destructive/30'
                            : 'focus-visible:ring-primary/30 focus-visible:border-primary/50'
                          }`}
                        required
                        disabled={loading || cooldown > 0}
                        maxLength={254}
                        aria-describedby={emailError ? 'email-error' : undefined}
                        aria-invalid={!!emailError}
                      />
                    </div>
                    {emailError && (
                      <p id="email-error" role="alert" className="text-xs text-destructive flex items-center gap-1.5 animate-in fade-in duration-200">
                        <XCircle className="size-3 flex-shrink-0" /> {emailError}
                      </p>
                    )}
                  </div>

                  {/* Rate-limit banner */}
                  {cooldown > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800
                      bg-amber-50 dark:bg-amber-900/20 px-4 py-3 animate-in fade-in duration-200"
                      role="status" aria-live="polite">
                      <Clock className="size-4 text-amber-500 flex-shrink-0 animate-pulse" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Too many requests</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                          Try again in <strong className="tabular-nums">{formatCooldown(cooldown)}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Generic error */}
                  {error && !cooldown && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30
                      bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* New device notice */}
                  {isNewDevice && !cooldown && !error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 dark:border-blue-800
                      bg-blue-50 dark:bg-blue-900/20 px-4 py-3 animate-in fade-in duration-300">
                      <Monitor className="size-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                        First time from this browser — you'll confirm via a 6-digit code before accessing your account.
                      </p>
                    </div>
                  )}

                  <Button
                    id="send-otp-btn"
                    type="submit"
                    className="w-full h-11 font-semibold gap-2 shadow-md shadow-primary/10
                      transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px active:translate-y-0"
                    disabled={loading || cooldown > 0 || !!emailError}
                  >
                    {loading
                      ? <><Loader2 className="size-4 animate-spin" /> Sending…</>
                      : cooldown > 0
                        ? <><Clock className="size-4" /> Wait {formatCooldown(cooldown)}</>
                        : <><ArrowRight className="size-4" /> Continue with email</>
                    }
                  </Button>

                  {/* Account note — only shown when no errors or cooldown are active */}
                  {!error && !cooldown && (
                    <p className="text-center text-xs text-muted-foreground">
                      New? Just enter your email — we'll create your account.
                    </p>
                  )}
                </form>
              )}

              {/* ─── STEP 2: New device consent ─── */}
              {step === 'new-device' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* Device card */}
                  <div className="rounded-xl border border-amber-200/60 dark:border-amber-800/60
                    bg-gradient-to-b from-amber-50 to-amber-50/40 dark:from-amber-900/25 dark:to-amber-900/10
                    p-4 space-y-4 shadow-sm">

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                          <Monitor className="size-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                          New device
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs border-amber-300 dark:border-amber-700
                        text-amber-700 dark:text-amber-300 font-bold uppercase tracking-wide">
                        Verification required
                      </Badge>
                    </div>

                    <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                      An <strong>8-digit code</strong> has been sent to{' '}
                      <MaskedEmail email={email} className="bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded" />.
                      Enter it on the next screen to confirm your identity.
                    </p>

                    <ul className="space-y-2">
                      {[
                        'Code expires in 10 minutes',
                        'Never share your code with anyone',
                        'This device will be remembered after sign-in',
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                          <CheckCircle2 className="size-3.5 flex-shrink-0 text-amber-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    id="continue-otp-btn"
                    onClick={() => setStep('otp')}
                    className="w-full h-11 gap-2 font-semibold shadow-md shadow-primary/10
                      transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-px"
                  >
                    <ShieldCheck className="size-4" />
                    Continue — Enter Code
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="w-full text-muted-foreground gap-1.5 hover:text-foreground"
                  >
                    <ArrowLeft className="size-4" /> Use a different email
                  </Button>
                </div>
              )}

              {/* ─── STEP 3: OTP entry ─── */}
              {step === 'otp' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

                  {/* OTP input */}
                  <div className="space-y-4">
                    <Label htmlFor="otp-input" className="sr-only">One-Time Password</Label>
                    <div
                      className={`flex justify-center transition-transform duration-200
                        ${otpShake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                    >
                      <InputOTP
                        id="otp-input"
                        maxLength={8}
                        value={otp}
                        onChange={handleOtpChange}
                        disabled={loading}
                        autoFocus
                        inputMode="numeric"
                        aria-label="Enter the 8-digit code from your email"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                          <InputOTPSlot index={6} />
                          <InputOTPSlot index={7} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {/* Auto-verify hint */}
                    {!loading && !error && otp.length < 8 && (
                      <p className="text-center text-xs text-muted-foreground animate-in fade-in duration-200">
                        Code auto-submits when all 8 digits are entered
                      </p>
                    )}

                    {/* Loading state */}
                    {loading && (
                      <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                        <Loader2 className="size-3 animate-spin" /> Verifying…
                      </p>
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-destructive/30
                      bg-destructive/5 px-4 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                      <AlertCircle className="size-4 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Resend section */}
                  <div className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Didn't receive the email?</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        id="resend-btn"
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={loading || cooldown > 0}
                        className="h-7 px-2 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 font-semibold"
                      >
                        {loading
                          ? <><Loader2 className="size-3 animate-spin" /> Resending…</>
                          : cooldown > 0
                            ? <><Clock className="size-3" /> Wait {formatCooldown(cooldown)}</>
                            : <><RefreshCw className="size-3" /> Resend code</>
                        }
                      </Button>
                      <span className="text-xs text-muted-foreground">· Also check your spam folder</span>
                    </div>
                    {resendCount >= 2 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Still nothing? Make sure <strong>{email}</strong> is correct.{' '}
                        <button onClick={goBack} className="text-primary underline underline-offset-2 hover:no-underline">
                          Change email
                        </button>
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Card footer — back button on OTP step */}
            {step === 'otp' && (
              <div className="px-6 pb-5 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  disabled={loading}
                  className="w-full text-muted-foreground gap-1.5 hover:text-foreground text-xs"
                >
                  <ArrowLeft className="size-3.5" /> Back to email
                </Button>
              </div>
            )}
          </div>

          {/* Bottom note */}
          <p className="text-center text-xs text-muted-foreground px-4">
            Secured with <span className="font-medium text-foreground">Supabase OTP</span> — no passwords stored, ever.
          </p>
        </div>
      </div>
    </div>
  );
}
