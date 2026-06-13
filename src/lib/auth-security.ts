export const sanitizeEmail = (raw: string): string =>
  raw.trim().toLowerCase().replace(/[<>"'`;\\]/g, "")

export const isValidEmail = (email: string): boolean =>
  /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)

export const sanitizeOtp = (raw: string): string => raw.replace(/\D/g, "").slice(0, 8)

export const getDeviceFingerprint = (): string => {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]
  return btoa(parts.join("|")).slice(0, 28)
}

const KNOWN_DEVICE_KEY = "vrh_known_device"

export const isKnownDevice = (): boolean => {
  try {
    return localStorage.getItem(KNOWN_DEVICE_KEY) === getDeviceFingerprint()
  } catch {
    return false
  }
}

export const markDeviceAsTrusted = () => {
  try {
    localStorage.setItem(KNOWN_DEVICE_KEY, getDeviceFingerprint())
  } catch {
    /* localStorage may be unavailable */
  }
}

const RATE_LIMIT_KEY = "vrh_otp_timestamps"
const RATE_WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 3

export const getRecentAttempts = (): number[] => {
  try {
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY)
    if (!raw) return []
    const timestamps: number[] = JSON.parse(raw)
    const cutoff = Date.now() - RATE_WINDOW_MS
    return timestamps.filter((t) => t > cutoff)
  } catch {
    return []
  }
}

export const recordAttempt = () => {
  try {
    const existing = getRecentAttempts()
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify([...existing, Date.now()]))
  } catch {
    /* noop */
  }
}

export const getRemainingCooldownSeconds = (): number => {
  const attempts = getRecentAttempts()
  if (attempts.length < MAX_ATTEMPTS) return 0
  const oldest = Math.min(...attempts)
  const releaseAt = oldest + RATE_WINDOW_MS
  return Math.max(0, Math.ceil((releaseAt - Date.now()) / 1000))
}

export const formatCooldown = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
