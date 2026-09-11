# Visa Readiness Hub — Session Handoff

> **Date:** 2026-06-03 | **Session end:** ~01:50 WAT

---

## Goal

Build a production-quality, fully frontend-driven **SaaS visa document tracker** called **Visa Readiness Hub**.

Users sign in via **Supabase OTP** (passwordless), connect **Google Drive** to store their documents, and track visa requirements across 4 locked phases. The app uses **Resend** for transactional emails, **Sentry** for error monitoring, and runs as a **React + Vite + TypeScript** SPA — no backend server, no Docker, no Edge Functions.

---

## Current State

The app is **functionally complete for MVP**. Core auth, document tracking, Google Drive upload, and email notifications all work. The login page is polished with a 3-step OTP flow, device fingerprinting, rate limiting, and security alerts.

**Remaining gap:** Supabase SMTP is not yet pointed at Resend. The user was mid-setup on the Resend dashboard during this session. Until SMTP is saved, OTP emails are still subject to Supabase's default **2 emails/hour** limit.

---

## Files in Flight

| File | Status |
|---|---|
| `src/pages/AuthPage.tsx` | ✅ Fully rewritten this session |
| `src/contexts/AuthContext.tsx` | ✅ Updated |
| `src/lib/resend.ts` | ✅ Created this session |
| `src/hooks/useRequirements.ts` | ✅ Updated |
| `src/components/LoginActivityBanner.tsx` | ✅ Created this session |
| `src/components/Dashboard.tsx` | ✅ Minor update |
| `src/index.css` | ✅ Updated |
| `.env` | ✅ Updated |
| `supabase/email_templates/otp_template.html` | ✅ Created this session |

---

## Changed

### `src/lib/resend.ts` — NEW
Six transactional email templates: Welcome, Phase Completed, Document Uploaded, All Done, Weekly Reminder, New Device Alert. All use a shared dark-themed HTML shell. Calls Resend REST API directly from the browser using `VITE_RESEND_API_KEY`.

### `src/pages/AuthPage.tsx` — FULL REWRITE
- **3-step flow:** Email → New Device consent → OTP entry
- **Step indicator** (Email / Security / Verify) with completed/active states
- **Corner toast system** (`CornerToastPortal`) — fixed `bottom-4 right-4`, never clusters inside card
- **`MaskedEmail` component** — shows `j***n@gmail.com`, hover-to-reveal with stable width (`minWidth: ${email.length}ch`) — no layout shift, no blur glitch
- **Auto-submit OTP** on 6th digit (180ms delay)
- **Shake animation** on wrong code; OTP clears automatically
- **Resend button** with smart contextual messages
- **`AuthApiError` "security purposes"** — regex parses `N seconds` from message and auto-starts countdown timer. Raw Supabase errors never shown to user
- **`AuthRetryableFetchError`** — mapped to "Connection issue" message; `console.error` added for DevTools visibility
- Simplified card subtitle copy; "New?" note hidden when error/cooldown is active

### `src/contexts/AuthContext.tsx`
- Sends Welcome email on first-ever sign-in (`created_at === last_sign_in_at`)
- Sends New Device Alert email via `sessionStorage` flag set by AuthPage
- Sets `vrh_device_alert_show` flag so `LoginActivityBanner` displays on Dashboard
- Handles `TOKEN_REFRESHED` and `SIGNED_OUT` events explicitly
- `AuthRetryableFetchError` on init → `console.warn` + graceful fallback (no blank screen)

### `src/hooks/useRequirements.ts`
- Phase Completed email fires when all docs in a phase reach `completed`
- All Done email fires when 100% complete
- `sessionStorage` flags prevent duplicate emails per session
- Exports `notifyDocumentUploaded()` helper for DocumentCard to call after upload

### `src/components/LoginActivityBanner.tsx` — NEW
Amber banner at top of Dashboard when `vrh_device_alert_show` session flag is set. Two CTAs: **"That was me"** (dismisses) and **"Sign out everywhere"** (calls `signOut()`).

### `.env`
Added `VITE_RESEND_API_KEY` and `VITE_APP_URL` (Vite requires `VITE_` prefix to expose to browser).

### `supabase/email_templates/otp_template.html` — NEW
Styled dark-mode HTML template ready to paste into **Supabase → Auth → Email Templates**. Uses `{{ .Token }}` (6-digit code), NOT `{{ .ConfirmationURL }}` (magic link).

---

## Failed Attempts

| Attempt | Why it failed |
|---|---|
| Auth0 integration | User explicitly rejected — stick with Supabase Auth |
| Supabase Edge Functions for Google Drive | No Docker available; all Drive logic rewritten as pure frontend calls |
| `shadcn` CLI (`npx shadcn@latest add`) | Always fails with `EPERM: operation not permitted, scandir 'C:\Users\HP\Documents\My Music'` on Windows — components must be created manually |
| CSS `blur()` on `MaskedEmail` | Caused repaint glitch + layout shift when text length changed between masked/revealed states. Replaced with `bg-muted` pill + `minWidth` fix |
| Inline toast stack inside card | Caused visual clustering when multiple toasts fired. Replaced with fixed-corner `CornerToastPortal` |

---

## Next Step

**Complete the Resend SMTP setup in Supabase Dashboard:**

1. Go to **Supabase → Project Settings → Authentication → SMTP Settings**
2. Fill in:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **Username:** `resend`
   - **Password:** Resend API key (`re_fpFYQCEj_...`)
   - **Sender name:** `Visa Readiness Hub`
   - **Sender email:** `onboarding@resend.dev` (or verified custom domain)
3. Go to **Supabase → Auth → Email Templates → Magic Link (OTP)**
4. Paste the contents of `supabase/email_templates/otp_template.html`
5. Set subject to: `Your Visa Readiness Hub sign-in code`
6. **Save** and test by signing out and signing back in — a styled 6-digit code email should arrive.
