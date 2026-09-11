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
  ClipboardPaste,
  Key,
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import * as Sentry from "@sentry/react"
import { useAuth } from "../contexts/useAuth"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/toast"
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

type Step = "email" | "new-device" | "otp" | "admin" | "reset"

const STEPS = [
  { key: "email", label: "Email" },
  { key: "new-device", label: "Security" },
  { key: "otp", label: "Verify" },
] as const

const stepIndex: Record<Step, number> = {
  email: 0,
  "new-device": 1,
  otp: 2,
  admin: 2,
  reset: 2,
}

export function AuthPage() {
  // Check for ?admin=login or ?admin=reset in URL
  const urlParams = new URLSearchParams(window.location.search)
  const adminParam = urlParams.get('admin')
  const initialStep: Step = adminParam === 'login' ? 'admin' : adminParam === 'reset' ? 'reset' : 'email'

  const [step, setStep] = useState<Step>(initialStep)
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [isNewDevice, setIsNewDevice] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [resendCount, setResendCount] = useState(0)
  const [otpShake, setOtpShake] = useState(false)
  const [adminSecret, setAdminSecret] = useState("")
  const [adminLoading, setAdminLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
    setAdminSecret("")
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !adminSecret.trim()) return

    setAdminLoading(true)
    setError("")

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ email: email.trim(), secret: adminSecret.trim() }),
      })

      const data = await res.json()
      console.log("Admin auth response:", res.status, data)

      if (!res.ok || !data?.session) {
        setError(data?.error || `Server error (${res.status}). Check console for details.`)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })

      if (sessionError) {
        setError("Failed to establish session. Please try again.")
        return
      }

      toast({ title: "Admin access granted", variant: "success" })
    } catch (err) {
      console.error("Admin login error:", err)
      setError("Connection issue — please try again.")
    } finally {
      setAdminLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminSecret.trim() || !newPassword.trim()) return

    setResetLoading(true)
    setError("")
    setResetSuccess(false)

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string

      const res = await fetch(`${supabaseUrl}/functions/v1/reset-admin-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: adminSecret.trim(), newPassword: newPassword.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || "Failed to reset password.")
        return
      }

      setResetSuccess(true)
      toast({ title: "Password updated!", description: "You can now log in with the new password.", variant: "success" })
    } catch (err) {
      setError("Connection issue — please try again.")
    } finally {
      setResetLoading(false)
    }
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
      toast({ title: "Code sent!", description: "Check your inbox and spam folder.", variant: "success", duration: 6000 })
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
        toast({ title: "Too many requests", description: "Please wait before trying again.", variant: "warning" })
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
      toast({ title: "Please wait", description: `Try again in ${formatCooldown(remaining)}.`, variant: "warning" })
      return
    }

    setLoading(true)
    setError("")
    try {
      recordAttempt()
      await sendOtp(email)
      setResendCount((c) => c + 1)
      toast({
        title: resendCount >= 1 ? "Code resent again" : "Code sent!",
        description: resendCount >= 1 ? "Make sure to check your spam folder." : "A fresh code has been sent to your inbox.",
        variant: "success",
        duration: 7000,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ""
      const name = (err as { name?: string })?.name ?? ""
      console.error("❌ AuthPage.resend error:", err)

      const securityMatch = msg.match(/(\d+)\s*second/i)
      if (securityMatch) {
        const waitSecs = parseInt(securityMatch[1], 10)
        startCooldownTimer(waitSecs)
        toast({ title: "Please wait", description: `Try again in ${waitSecs}s.`, variant: "warning", duration: 4000 })
      } else if (msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("exceeded")) {
        startCooldownTimer(getRemainingCooldownSeconds() || 60)
        toast({ title: "Resend limit reached", description: "Please wait before trying again.", variant: "warning" })
      } else if (name === "AuthRetryableFetchError" || msg.toLowerCase().includes("fetch")) {
        toast({ title: "Connection issue", description: "Check your internet and try again.", variant: "destructive" })
      } else {
        toast({ title: "Could not resend code", description: "Please try again in a moment.", variant: "destructive" })
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

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const clean = sanitizeOtp(text)
      if (clean.length > 0) {
        setOtp(clean)
        setError("")
        if (clean.length === 8 && !loading && !verifyingRef.current) {
          setTimeout(() => handleVerifyOtp(clean), 180)
        }
      }
    } catch {
      // Clipboard API denied or unavailable — silently ignore
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
      toast({ title: "Verified!", description: "Signing you in…", variant: "success", duration: 3000 })
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
    admin: "Admin access",
    reset: "Reset admin password",
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
    admin: "Enter your admin credentials to access the support dashboard.",
    reset: "Set a new password for the admin account.",
  }

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        {step !== "email" && step !== "admin" && (
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
                    size="cta"
                    className="w-full border border-zinc-700 bg-zinc-100 text-zinc-950 shadow-lg shadow-black/20 hover:bg-white"
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
                        className="border-amber-700/60 text-[10px] font-semibold text-amber-300"
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
                    size="cta"
                    className="w-full border border-zinc-700 bg-zinc-100 text-zinc-950 hover:bg-white"
                  >
                    <ShieldCheck className="size-4" />
                    Continue — Enter Code
                  </Button>

                  <Button
                    variant="ghost"
                    size="action"
                    onClick={goBack}
                    className="w-full text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
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
                      <div className="flex items-center justify-center gap-3">
                        <p className="text-center text-xs text-zinc-500">
                          Code auto-submits when all 8 digits are entered
                        </p>
                        <button
                          type="button"
                          onClick={handlePasteFromClipboard}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                          <ClipboardPaste className="size-3.5" />
                          Paste
                        </button>
                      </div>
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
                        size="action"
                        onClick={handleResend}
                        disabled={loading || cooldown > 0}
                        className="text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white"
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
                    size="action"
                    onClick={goBack}
                    disabled={loading}
                    className="w-full text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                  >
                    <ArrowLeft className="size-3.5" /> Back to email
                  </Button>
                </motion.div>
              )}

              {step === "admin" && (
                <motion.div
                  key="admin"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                      <ShieldCheck className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">Admin Login</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Enter your admin credentials</p>
                    </div>
                  </div>

                  <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="admin-email" className="text-xs font-medium text-zinc-400">
                        Admin email
                      </Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="admin-secret" className="text-xs font-medium text-zinc-400">
                        Admin secret
                      </Label>
                      <Input
                        id="admin-secret"
                        type="password"
                        value={adminSecret}
                        onChange={(e) => setAdminSecret(e.target.value)}
                        placeholder="Enter admin secret"
                        className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600"
                        required
                      />
                    </div>

                    {error && (
                      <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                        <AlertCircle className="mt-0.5 size-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      size="cta"
                      className="w-full"
                      disabled={adminLoading || !email.trim() || !adminSecret.trim()}
                    >
                      {adminLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Authenticating...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-4" />
                          Sign in as Admin
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="ghost"
                      size="action"
                      onClick={goBack}
                      className="text-zinc-500 hover:text-zinc-200"
                    >
                      <ArrowLeft className="size-3.5" />
                      Back to email
                    </Button>
                    <Button
                      variant="ghost"
                      size="action"
                      onClick={() => { setStep("reset"); setError(""); setResetSuccess(false); }}
                      className="text-zinc-600 hover:text-zinc-400"
                    >
                      Reset password
                    </Button>
                  </div>
                </motion.div>
              )}

              {step === "reset" && (
                <motion.div
                  key="reset"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  className="flex flex-col gap-5"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                      <Key className="size-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-100">Reset Password</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Set a new password for the admin account</p>
                    </div>
                  </div>

                  {resetSuccess ? (
                    <div className="flex flex-col items-center gap-4 py-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <CheckCircle2 className="size-12 text-emerald-400" />
                      </motion.div>
                      <p className="text-sm font-bold text-zinc-200">Password updated!</p>
                      <p className="text-xs text-zinc-500">You can now log in with your new password.</p>
                      <Button
                        size="cta"
                        onClick={() => { setStep("admin"); setError(""); }}
                        className="w-full"
                      >
                        Go to Admin Login
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-secret" className="text-xs font-medium text-zinc-400">
                          Current admin secret
                        </Label>
                        <Input
                          id="reset-secret"
                          type="password"
                          value={adminSecret}
                          onChange={(e) => setAdminSecret(e.target.value)}
                          placeholder="Enter current secret"
                          className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600"
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="new-password" className="text-xs font-medium text-zinc-400">
                          New password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password (min 6 chars)"
                          className="h-11 border-zinc-700 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-600"
                          minLength={6}
                          required
                        />
                      </div>

                      {error && (
                        <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 text-sm text-red-300">
                          <AlertCircle className="mt-0.5 size-4 shrink-0" />
                          <span>{error}</span>
                        </div>
                      )}

                      <Button
                        type="submit"
                        size="cta"
                        className="w-full"
                        disabled={resetLoading || !adminSecret.trim() || newPassword.length < 6}
                      >
                        {resetLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Key className="size-4" />
                            Update Password
                          </>
                        )}
                      </Button>
                    </form>
                  )}

                  <Button
                    variant="ghost"
                    size="action"
                    onClick={() => { setStep("admin"); setError(""); }}
                    className="w-full text-zinc-500 hover:text-zinc-200"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to admin login
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FlowCard>

        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-[11px] text-zinc-600 leading-relaxed">
            By signing in, you agree to our{" "}
            <button onClick={() => { window.location.href = '?terms'; }} className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors">
              Terms & Conditions
            </button>{" "}
            and{" "}
            <button onClick={() => { window.location.href = '?privacy'; }} className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors">
              Privacy Policy
            </button>.
          </p>
        </div>
      </div>
    </AuthShell>
  )
}
