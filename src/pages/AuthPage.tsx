import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  AlertCircle,
  Mail,
  ArrowLeft,
  Monitor,
  CheckCircle2,
  ShieldCheck,
  Clock,
  XCircle,
  RefreshCw,
  Loader2,
  ArrowRight,
  Info,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import * as Sentry from "@sentry/react"
import { useAuth } from "../contexts/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { AuthShell } from "@/components/ui/auth-shell"
import { FlowCard } from "@/components/ui/flow-card"
import { FlowStepIndicator } from "@/components/ui/flow-step-indicator"
import { AuthOtpInput, AuthOtpGroup, AuthOtpSlot } from "@/components/ui/auth-otp-slots"
import {
  sanitizeEmail,
  isValidEmail,
  sanitizeOtp,
  isKnownDevice,
  markDeviceAsTrusted,
  getRemainingCooldownSeconds,
  recordAttempt,
  formatCooldown,
} from "@/lib/auth-security"

type ToastType = "success" | "info" | "error" | "warning"

interface InlineToast {
  message: string
  type: ToastType
  id: number
}

function CornerToastItem({ toast, onDismiss }: { toast: InlineToast; onDismiss: () => void }) {
  const config: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
    success: {
      icon: <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />,
      classes: "border-emerald-800/60 bg-zinc-900/95 text-emerald-200",
    },
    info: {
      icon: <Info className="size-4 shrink-0 text-blue-400" />,
      classes: "border-blue-800/60 bg-zinc-900/95 text-blue-200",
    },
    error: {
      icon: <AlertCircle className="size-4 shrink-0 text-red-400" />,
      classes: "border-red-800/60 bg-zinc-900/95 text-red-200",
    },
    warning: {
      icon: <Clock className="size-4 shrink-0 text-amber-400" />,
      classes: "border-amber-800/60 bg-zinc-900/95 text-amber-200",
    },
  }
  const { icon, classes } = config[toast.type]

  return (
    <div
      className={`flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg shadow-black/30 animate-in slide-in-from-bottom-2 fade-in duration-300 ${classes}`}
      role="alert"
      aria-live="polite"
    >
      {icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 opacity-40 transition-opacity hover:opacity-100"
        aria-label="Dismiss notification"
      >
        <XCircle className="size-3.5" />
      </button>
    </div>
  )
}

function CornerToastPortal({ toasts, onDismiss }: { toasts: InlineToast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-[200] flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <CornerToastItem toast={t} onDismiss={() => onDismiss(t.id)} />
        </div>
      ))}
    </div>
  )
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  const masked =
    local.length <= 2
      ? "*".repeat(local.length)
      : local[0] + "*".repeat(local.length - 2) + local[local.length - 1]
  return `${masked}@${domain}`
}

function MaskedEmail({ email, className = "" }: { email: string; className?: string }) {
  const [revealed, setRevealed] = React.useState(false)

  return (
    <span
      className={`inline-flex cursor-default select-none items-center gap-0 rounded-md px-1.5 py-0.5 font-mono text-xs ring-1 ring-inset transition-colors duration-150 ${
        revealed
          ? "bg-zinc-800 text-zinc-100 ring-zinc-600"
          : "bg-zinc-900 text-zinc-400 ring-zinc-700 hover:bg-zinc-800 hover:ring-zinc-500"
      } ${className}`}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      tabIndex={0}
      aria-label={`Email address: ${email}`}
      title={revealed ? email : "Hover to reveal email"}
    >
      <span className="inline-block" style={{ minWidth: `${email.length}ch` }}>
        {revealed ? email : maskEmail(email)}
      </span>
    </span>
  )
}

type Step = "email" | "new-device" | "otp"

const STEPS = [
  { key: "email", label: "Email" },
  { key: "new-device", label: "Security" },
  { key: "otp", label: "Verify" },
] as const

const stepIndex: Record<Step, number> = {
  email: 0,
  "new-device": 1,
  otp: 2,
}

export function AuthPage() {
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isNewDevice, setIsNewDevice] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [toasts, setToasts] = useState<InlineToast[]>([])
  const [resendCount, setResendCount] = useState(0)
  const [otpShake, setOtpShake] = useState(false)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const toastIdRef = useRef(0)
  const verifyingRef = useRef(false)
  const { sendOtp, verifyOtp } = useAuth()

  useEffect(() => {
    setIsNewDevice(!isKnownDevice())
    const remaining = getRemainingCooldownSeconds()
    if (remaining > 0) startCooldownTimer(remaining)
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
      verifyingRef.current = false
    }
  }, [])

  const addToast = useCallback((message: string, type: ToastType = "info", durationMs = 5000) => {
    const id = ++toastIdRef.current
    setToasts((prev) => [...prev, { message, type, id }])
    if (durationMs > 0) setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), durationMs)
    return id
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const startCooldownTimer = useCallback((seconds: number) => {
    setCooldown(seconds)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const triggerOtpShake = () => {
    setOtpShake(true)
    setTimeout(() => setOtpShake(false), 600)
  }

  const goBack = () => {
    setStep("email")
    setOtp("")
    setError("")
    setToasts([])
  }

  const handleEmailBlur = () => {
    const clean = sanitizeEmail(email)
    if (clean && !isValidEmail(clean)) {
      setEmailError("Please enter a valid email address (e.g. name@example.com).")
    } else {
      setEmailError("")
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = sanitizeEmail(email)

    if (!isValidEmail(clean)) {
      setEmailError("Please enter a valid email address.")
      return
    }

    const remaining = getRemainingCooldownSeconds()
    if (remaining > 0) {
      startCooldownTimer(remaining)
      return
    }

    setError("")
    setEmailError("")
    setLoading(true)

    Sentry.addBreadcrumb({
      category: "auth",
      message: `OTP requested (new device: ${isNewDevice})`,
      level: "info",
    })

    try {
      recordAttempt()
      await sendOtp(clean)
      setEmail(clean)
      setResendCount(0)
      addToast("Code sent! Check your inbox and spam folder.", "success", 6000)
      setStep(isNewDevice ? "new-device" : "otp")
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      const name = (err as { name?: string })?.name ?? ""
      console.error("❌ AuthPage.sendOtp error:", err)

      const securityMatch = msg.match(/(\d+)\s*second/i)
      if (securityMatch) {
        startCooldownTimer(parseInt(securityMatch[1], 10))
        setError("")
      } else if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("exceeded")) {
        startCooldownTimer(getRemainingCooldownSeconds() || 60)
        setError("")
        addToast("Too many requests — please wait before trying again.", "warning")
      } else if (
        name === "AuthRetryableFetchError" ||
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("failed to fetch")
      ) {
        setError("Connection issue — please check your internet and try again.")
      } else if (msg.toLowerCase().includes("invalid")) {
        setError("That email address was rejected. Please double-check it.")
      } else {
        setError(msg || "Failed to send code. Please try again.")
      }

      Sentry.captureException(err, { tags: { source: "AuthPage.sendOtp" } })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || loading) return

    const remaining = getRemainingCooldownSeconds()
    if (remaining > 0) {
      startCooldownTimer(remaining)
      addToast(`Please wait ${formatCooldown(remaining)} before resending.`, "warning")
      return
    }

    setLoading(true)
    setError("")
    try {
      recordAttempt()
      await sendOtp(email)
      setResendCount((c) => c + 1)
      addToast(
        resendCount >= 1
          ? "Code resent again. Make sure to check your spam folder."
          : "A fresh code has been sent to your inbox.",
        "success",
        7000
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      const name = (err as { name?: string })?.name ?? ""
      console.error("❌ AuthPage.resend error:", err)

      const securityMatch = msg.match(/(\d+)\s*second/i)
      if (securityMatch) {
        const waitSecs = parseInt(securityMatch[1], 10)
        startCooldownTimer(waitSecs)
        addToast(`Please wait ${waitSecs}s before resending again.`, "warning", 4000)
      } else if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("exceeded")) {
        startCooldownTimer(getRemainingCooldownSeconds() || 60)
        addToast("Resend limit reached — please wait before trying again.", "warning")
      } else if (name === "AuthRetryableFetchError" || msg.toLowerCase().includes("fetch")) {
        addToast("Connection issue while resending — check your internet.", "error")
      } else {
        addToast("Could not resend code. Please try again in a moment.", "error")
      }
      Sentry.captureException(err, { tags: { source: "AuthPage.resend" } })
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (v: string) => {
    const clean = sanitizeOtp(v)
    setOtp(clean)
    setError("")
    if (clean.length === 8 && !loading && !verifyingRef.current) {
      setTimeout(() => handleVerifyOtp(clean), 180)
    }
  }

  const handleVerifyOtp = async (codeOverride?: string) => {
    const cleanOtp = sanitizeOtp(codeOverride ?? otp)
    if (cleanOtp.length < 8 || loading || verifyingRef.current) return

    setError("")
    setLoading(true)
    verifyingRef.current = true

    try {
      if (isNewDevice) {
        sessionStorage.setItem("vrh_new_device_alert", "pending")
      }
      await verifyOtp(email, cleanOtp)
      markDeviceAsTrusted()
      addToast("Verified! Signing you in…", "success", 3000)
      Sentry.addBreadcrumb({ category: "auth", message: "OTP verified successfully", level: "info" })
    } catch (err) {
      sessionStorage.removeItem("vrh_new_device_alert")

      const msg = err instanceof Error ? err.message : ""
      const name = (err as { name?: string })?.name ?? ""

      console.error("❌ AuthPage.verifyOtp error:", err)
      triggerOtpShake()
      setOtp("")

      if (
        name === "AuthRetryableFetchError" ||
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("network")
      ) {
        setError("Connection issue — please check your internet and try again.")
      } else if (
        name === "AuthApiError" ||
        msg.toLowerCase().includes("token has expired") ||
        msg.toLowerCase().includes("otp expired") ||
        msg.toLowerCase().includes("expired") ||
        msg.toLowerCase().includes("invalid")
      ) {
        setError("This code has expired or was already used. Request a fresh one below.")
      } else {
        setError(msg || "Invalid or expired code. Please try again.")
      }

      Sentry.captureException(err, { tags: { source: "AuthPage.verifyOtp" } })
    } finally {
      setLoading(false)
      verifyingRef.current = false
    }
  }

  const titles: Record<Step, string> = {
    email: "Sign in or create account",
    "new-device": "New device detected",
    otp: "Check your inbox",
  }

  const subtitles: Record<Step, React.ReactNode> = {
    email: "Enter your email — we'll send a one-time code. No password needed.",
    "new-device": (
      <>
        New browser detected for <MaskedEmail email={email} />
      </>
    ),
    otp: (
      <>
        Code sent to <MaskedEmail email={email} />
      </>
    ),
  }

  return (
    <AuthShell>
      <CornerToastPortal toasts={toasts} onDismiss={dismissToast} />

      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {step !== "email" && (
          <FlowStepIndicator steps={[...STEPS]} currentIndex={stepIndex[step]} />
        )}

        <FlowCard>
          <div className="border-b border-zinc-800/80 px-6 pb-4 pt-6 text-center">
            <motion.h1
              key={step}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold tracking-tight text-zinc-50"
            >
              {titles[step]}
            </motion.h1>
            <p className="mt-1.5 text-sm leading-snug text-zinc-400">{subtitles[step]}</p>
          </div>

          <div className="px-6 py-5">
            <AnimatePresence mode="wait">
              {step === "email" && (
                <motion.form
                  key="email"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleSendOtp}
                  className="flex flex-col gap-4"
                  noValidate
                >
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email-input" className="text-sm font-medium text-zinc-300">
                      Email address
                    </Label>
                    <div className="group relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-zinc-200" />
                      <Input
                        id="email-input"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => {
                          setEmail(sanitizeEmail(e.target.value))
                          if (emailError) setEmailError("")
                          if (error) setError("")
                        }}
                        onBlur={handleEmailBlur}
                        placeholder="name@example.com"
                        className={`h-11 border-zinc-700 bg-zinc-900/80 pl-9 text-zinc-50 placeholder:text-zinc-600 ${
                          emailError
                            ? "border-red-500/60 focus-visible:ring-red-500/30"
                            : "focus-visible:border-zinc-500 focus-visible:ring-zinc-400/20"
                        }`}
                        required
                        disabled={loading || cooldown > 0}
                        maxLength={254}
                        aria-describedby={emailError ? "email-error" : undefined}
                        aria-invalid={!!emailError}
                      />
                    </div>
                    {emailError && (
                      <p id="email-error" role="alert" className="flex items-center gap-1.5 text-xs text-red-400">
                        <XCircle className="size-3 shrink-0" /> {emailError}
                      </p>
                    )}
                  </div>

                  {cooldown > 0 && (
                    <div
                      className="flex items-center gap-3 rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3"
                      role="status"
                      aria-live="polite"
                    >
                      <Clock className="size-4 shrink-0 animate-pulse text-amber-400" />
                      <div className="flex flex-col gap-0.5">
                        <p className="text-xs font-semibold text-amber-300">Too many requests</p>
                        <p className="text-xs text-amber-400/90">
                          Try again in <strong className="tabular-nums">{formatCooldown(cooldown)}</strong>
                        </p>
                      </div>
                    </div>
                  )}

                  {error && !cooldown && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-300"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {isNewDevice && !cooldown && !error && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-800/40 bg-blue-950/20 px-4 py-3">
                      <Monitor className="mt-0.5 size-4 shrink-0 text-blue-400" />
                      <p className="text-xs leading-relaxed text-blue-300/90">
                        First time from this browser — you'll confirm via an 8-digit code before accessing your account.
                      </p>
                    </div>
                  )}

                  <Button
                    id="send-otp-btn"
                    type="submit"
                    className="h-11 w-full gap-2 border border-zinc-700 bg-zinc-100 font-semibold text-zinc-950 shadow-lg shadow-black/20 hover:bg-white"
                    disabled={loading || cooldown > 0 || !!emailError}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Sending…
                      </>
                    ) : cooldown > 0 ? (
                      <>
                        <Clock className="size-4" /> Wait {formatCooldown(cooldown)}
                      </>
                    ) : (
                      <>
                        <ArrowRight className="size-4" /> Continue with email
                      </>
                    )}
                  </Button>

                  {!error && !cooldown && (
                    <p className="text-center text-xs text-zinc-500">
                      New? Just enter your email — we'll create your account.
                    </p>
                  )}
                </motion.form>
              )}

              {step === "new-device" && (
                <motion.div
                  key="new-device"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-4 rounded-xl border border-amber-800/40 bg-gradient-to-b from-amber-950/30 to-amber-950/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-lg bg-amber-900/40">
                          <Monitor className="size-4 text-amber-400" />
                        </div>
                        <span className="text-sm font-semibold text-amber-200">New device</span>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-amber-700/60 text-[10px] font-bold uppercase tracking-wide text-amber-300"
                      >
                        Verification required
                      </Badge>
                    </div>

                    <p className="text-sm leading-relaxed text-amber-100/90">
                      An <strong>8-digit code</strong> has been sent to{" "}
                      <MaskedEmail email={email} className="bg-amber-900/40" />.
                      Enter it on the next screen to confirm your identity.
                    </p>

                    <ul className="flex flex-col gap-2">
                      {[
                        "Code expires in 10 minutes",
                        "Never share your code with anyone",
                        "This device will be remembered after sign-in",
                      ].map((item) => (
                        <li key={item} className="flex items-center gap-2 text-xs text-amber-300/80">
                          <CheckCircle2 className="size-3.5 shrink-0 text-amber-500" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    id="continue-otp-btn"
                    onClick={() => setStep("otp")}
                    className="h-11 w-full gap-2 border border-zinc-700 bg-zinc-100 font-semibold text-zinc-950 hover:bg-white"
                  >
                    <ShieldCheck className="size-4" />
                    Continue — Enter Code
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={goBack}
                    className="w-full gap-1.5 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                  >
                    <ArrowLeft className="size-4" /> Use a different email
                  </Button>
                </motion.div>
              )}

              {step === "otp" && (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col items-center gap-4">
                    <Label htmlFor="otp-input" className="sr-only">
                      One-Time Password
                    </Label>
                    <div className="flex justify-center">
                      <AuthOtpInput
                        id="otp-input"
                        maxLength={8}
                        value={otp}
                        onChange={handleOtpChange}
                        disabled={loading}
                        shake={otpShake}
                        autoFocus
                        inputMode="numeric"
                        aria-label="Enter the 8-digit code from your email"
                      >
                        <AuthOtpGroup>
                          {Array.from({ length: 8 }).map((_, i) => (
                            <AuthOtpSlot key={i} index={i} />
                          ))}
                        </AuthOtpGroup>
                      </AuthOtpInput>
                    </div>

                    {!loading && !error && otp.length < 8 && (
                      <p className="text-center text-xs text-zinc-500">
                        Code auto-submits when all 8 digits are entered
                      </p>
                    )}

                    {loading && (
                      <p className="flex items-center justify-center gap-1.5 text-xs text-zinc-400">
                        <Loader2 className="size-3 animate-spin" /> Verifying…
                      </p>
                    )}
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-2.5 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-300"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-1 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
                    <p className="text-xs font-medium text-zinc-400">Didn't receive the email?</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        id="resend-btn"
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={loading || cooldown > 0}
                        className="h-7 gap-1.5 px-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-3 animate-spin" /> Resending…
                          </>
                        ) : cooldown > 0 ? (
                          <>
                            <Clock className="size-3" /> Wait {formatCooldown(cooldown)}
                          </>
                        ) : (
                          <>
                            <RefreshCw className="size-3" /> Resend code
                          </>
                        )}
                      </Button>
                      <span className="text-xs text-zinc-600">· Also check your spam folder</span>
                    </div>
                    {resendCount >= 2 && (
                      <p className="mt-1 text-[11px] text-zinc-500">
                        Still nothing? Make sure <strong className="text-zinc-300">{email}</strong> is correct.{" "}
                        <button
                          onClick={goBack}
                          className="text-zinc-200 underline underline-offset-2 hover:no-underline"
                        >
                          Change email
                        </button>
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBack}
                    disabled={loading}
                    className="w-full gap-1.5 text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                  >
                    <ArrowLeft className="size-3.5" /> Back to email
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FlowCard>

        <p className="text-center text-xs text-zinc-600">
          Secured with <span className="font-medium text-zinc-400">Supabase OTP</span> — no passwords stored, ever.
        </p>
      </div>
    </AuthShell>
  )
}
