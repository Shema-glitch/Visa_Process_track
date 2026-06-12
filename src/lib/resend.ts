/**
 * Resend Email Service
 * -------------------
 * Sends transactional emails via the Resend REST API for every key user action
 * in the Visa Readiness Hub.
 *
 * ⚠️  SECURITY NOTE:
 *   The Resend API key is exposed on the client side (Vite VITE_ prefix).
 *   Resend's default domain restrictions mitigate abuse, but for production
 *   you should proxy this through a Supabase Edge Function or server endpoint.
 *   This approach is acceptable for the current development phase.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY as string;

/** The verified sender address. Update to your custom domain once verified. */
const FROM_ADDRESS = 'Visa Readiness Hub <onboarding@resend.dev>';

/** App base URL for deep links in emails */
const APP_URL = import.meta.env.VITE_APP_URL ?? 'http://localhost:5173';

/**
 * Escapes a string for safe interpolation into HTML.
 * Prevents XSS if user-controlled metadata (name, userAgent) contains HTML/script tags.
 */
const esc = (s: string | undefined | null): string =>
  (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ─── Types ────────────────────────────────────────────────────────────────────

interface SendEmailPayload {
  to: string;
  subject: string;
  html: string;
}

interface ResendError {
  statusCode: number;
  message: string;
  name: string;
}

// ─── Core Send Helper ─────────────────────────────────────────────────────────

/**
 * Sends a single transactional email via Resend.
 * Returns `{ ok: true }` on success or `{ ok: false, error }` on failure.
 * Never throws — all errors are caught and returned.
 */
async function sendEmail(
  payload: SendEmailPayload
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  Resend: VITE_RESEND_API_KEY is not set. Email suppressed.');
    return { ok: false, error: 'Resend API key not configured.' };
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
      }),
    });

    const data = (await res.json()) as { id?: string } & Partial<ResendError>;

    if (!res.ok) {
      const msg = data.message ?? `HTTP ${res.status}`;
      console.error('❌ Resend send failed:', msg);
      return { ok: false, error: msg };
    }

    console.log('✅ Resend email sent:', data.id);
    return { ok: true, id: data.id! };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Resend fetch error:', msg);
    return { ok: false, error: msg };
  }
}

// ─── Shared HTML Helpers ──────────────────────────────────────────────────────

const emailShell = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Visa Readiness Hub</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0f0f0f; font-family: 'Segoe UI', Arial, sans-serif; color: #e4e4e7; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #18181b; border-radius: 16px; overflow: hidden; border: 1px solid #27272a; }
    .header { background: linear-gradient(135deg, #6d28d9 0%, #4f46e5 100%); padding: 32px 40px; }
    .header h1 { color: #fff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .header p { color: rgba(255,255,255,0.7); font-size: 13px; margin-top: 4px; font-weight: 500; }
    .body { padding: 36px 40px; }
    .body h2 { font-size: 20px; font-weight: 700; color: #f4f4f5; margin-bottom: 8px; }
    .body p { font-size: 15px; color: #a1a1aa; line-height: 1.7; margin-bottom: 16px; }
    .body p strong { color: #e4e4e7; }
    .cta { display: inline-block; background: linear-gradient(135deg, #6d28d9, #4f46e5); color: #fff !important; font-weight: 700; font-size: 15px; padding: 14px 28px; border-radius: 10px; text-decoration: none; margin: 8px 0 24px; }
    .badge { display: inline-block; background: #27272a; color: #a1a1aa; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 999px; letter-spacing: 0.05em; text-transform: uppercase; border: 1px solid #3f3f46; }
    .badge.green { background: #052e16; color: #4ade80; border-color: #166534; }
    .badge.yellow { background: #1c1409; color: #fbbf24; border-color: #92400e; }
    .divider { height: 1px; background: #27272a; margin: 28px 0; }
    .stat-row { display: flex; gap: 12px; margin: 20px 0; }
    .stat { flex: 1; background: #09090b; border: 1px solid #27272a; border-radius: 10px; padding: 16px; text-align: center; }
    .stat .number { font-size: 28px; font-weight: 900; color: #f4f4f5; display: block; }
    .stat .label { font-size: 11px; color: #71717a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .step-list { list-style: none; padding: 0; }
    .step-list li { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #27272a; font-size: 14px; color: #a1a1aa; line-height: 1.5; }
    .step-list li:last-child { border-bottom: none; }
    .step-num { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; background: #6d28d9; color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .footer { background: #09090b; padding: 24px 40px; border-top: 1px solid #27272a; text-align: center; }
    .footer p { font-size: 12px; color: #52525b; line-height: 1.6; }
    .footer a { color: #6d28d9; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🗂️ Visa Readiness Hub</h1>
      <p>Precision Document Tracker</p>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>You received this email because you have an account on Visa Readiness Hub.<br/>
      Questions? <a href="mailto:support@visareadinesshub.com">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
`;

// ─── Email Templates ──────────────────────────────────────────────────────────

/**
 * 1. WELCOME EMAIL
 * Sent when a new user signs in for the first time (first OTP verification).
 */
export async function sendWelcomeEmail(params: {
  to: string;
  firstName?: string;
}) {
  const name = params.firstName ?? 'there';
  return sendEmail({
    to: params.to,
    subject: '🎉 Welcome to Visa Readiness Hub!',
    html: emailShell(`
      <h2>Welcome, ! 👋</h2>
      <p>You've just joined <strong>Visa Readiness Hub</strong> — your personal command center for organizing and tracking every document in your visa application journey.</p>

      <a href="${APP_URL}" class="cta">Open Your Dashboard →</a>

      <div class="divider"></div>

      <p style="font-size:14px; font-weight:700; color:#f4f4f5; margin-bottom:12px;">Here's what to do next:</p>
      <ul class="step-list">
        <li><span class="step-num">1</span> Complete the quick onboarding setup to personalize your roadmap.</li>
        <li><span class="step-num">2</span> Connect your Google Drive to store and access documents from anywhere.</li>
        <li><span class="step-num">3</span> Start Phase 1 — mark each document as you collect it.</li>
        <li><span class="step-num">4</span> Use the download feature to keep copies of uploaded files on your phone.</li>
      </ul>

      <div class="divider"></div>
      <p>If you ever get stuck, reply to this email and we'll help you out. Good luck on your visa journey! 🌍</p>
    `),
  });
}

/**
 * 2. PHASE COMPLETED EMAIL
 * Sent when a user marks all documents in a phase as completed.
 */
export async function sendPhaseCompletedEmail(params: {
  to: string;
  firstName?: string;
  phaseNumber: number;
  phaseName: string;
  nextPhaseName?: string;
  completedCount: number;
  totalCount: number;
}) {
  const name = params.firstName ?? 'there';
  const progressPct = Math.round((params.completedCount / params.totalCount) * 100);

  return sendEmail({
    to: params.to,
    subject: `✅ Phase ${params.phaseNumber} Complete — `,
    html: emailShell(`
      <span class="badge green">Phase ${params.phaseNumber} Complete</span>
      <h2 style="margin-top:16px;">Excellent work, ! 🎉</h2>
      <p>You've successfully completed <strong>Phase ${params.phaseNumber}: </strong>. Every document in this phase has been collected and verified.</p>

      <div class="stat-row">
        <div class="stat">
          <span class="number">${params.completedCount}</span>
          <span class="label">Documents Done</span>
        </div>
        <div class="stat">
          <span class="number">${progressPct}%</span>
          <span class="label">Overall Progress</span>
        </div>
        <div class="stat">
          <span class="number">${params.totalCount - params.completedCount}</span>
          <span class="label">Remaining</span>
        </div>
      </div>

      ${params.nextPhaseName ? `
      <div class="divider"></div>
      <p><strong>Up next:</strong> Phase ${params.phaseNumber + 1} —  has now unlocked. Head to your dashboard to continue.</p>
      <a href="${APP_URL}" class="cta">Start Phase ${params.phaseNumber + 1} →</a>
      ` : `
      <div class="divider"></div>
      <p>🏆 <strong>You've completed all phases!</strong> Your visa application documents are fully organized. Make sure to double-check everything before submission.</p>
      <a href="${APP_URL}" class="cta">View Full Roadmap →</a>
      `}
    `),
  });
}

/**
 * 3. DOCUMENT UPLOADED EMAIL
 * Sent when a user uploads a file to Google Drive for a requirement.
 */
export async function sendDocumentUploadedEmail(params: {
  to: string;
  firstName?: string;
  documentName: string;
  fileName: string;
  phase: number;
}) {
  const name = params.firstName ?? 'there';
  return sendEmail({
    to: params.to,
    subject: `📎 Document Uploaded — `,
    html: emailShell(`
      <span class="badge green">Upload Successful</span>
      <h2 style="margin-top:16px;">Document saved, !</h2>
      <p>Your file has been securely uploaded to Google Drive and linked to your visa requirement.</p>

      <div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:20px; margin:20px 0;">
        <p style="margin:0; font-size:13px; color:#71717a; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">Requirement</p>
        <p style="margin:6px 0 0; font-size:17px; font-weight:700; color:#f4f4f5;"></p>
        <p style="margin:4px 0 0; font-size:13px; color:#6d28d9; font-weight:600;">Phase ${params.phase}</p>
        <div class="divider"></div>
        <p style="margin:0; font-size:13px; color:#71717a; font-weight:700; text-transform:uppercase; letter-spacing:0.05em;">File</p>
        <p style="margin:6px 0 0; font-size:15px; font-weight:600; color:#e4e4e7;">📄 </p>
      </div>

      <p>You can view, download or manage this file anytime from your <a href="${APP_URL}" style="color:#6d28d9; font-weight:700;">dashboard</a>.</p>
    `),
  });
}

/**
 * 4. ALL DONE EMAIL
 * Sent when progress reaches 100%.
 */
export async function sendAllCompleteEmail(params: {
  to: string;
  firstName?: string;
  totalDocuments: number;
}) {
  const name = params.firstName ?? 'there';
  return sendEmail({
    to: params.to,
    subject: '🏆 All Documents Complete — Visa Readiness Hub',
    html: emailShell(`
      <h2 style="font-size:26px;">You did it, ! 🏆</h2>
      <p>Every single document in your visa application roadmap has been collected and marked as complete. You are <strong>100% ready</strong>.</p>

      <div class="stat-row">
        <div class="stat">
          <span class="number" style="color:#4ade80;">${params.totalDocuments}</span>
          <span class="label">Documents Complete</span>
        </div>
        <div class="stat">
          <span class="number" style="color:#4ade80;">100%</span>
          <span class="label">Roadmap Done</span>
        </div>
      </div>

      <div class="divider"></div>
      <p><strong>Next steps:</strong></p>
      <ul class="step-list">
        <li><span class="step-num">1</span> Double-check that all uploaded files are clearly legible and not expired.</li>
        <li><span class="step-num">2</span> Download a local copy of everything from your dashboard as a backup.</li>
        <li><span class="step-num">3</span> Submit your visa application with confidence!</li>
      </ul>

      <a href="${APP_URL}" class="cta">View Final Checklist →</a>
    `),
  });
}

/**
 * 5. WEEKLY REMINDER EMAIL
 * Can be triggered manually or via a Resend Automation on a schedule.
 */
export async function sendWeeklyReminderEmail(params: {
  to: string;
  firstName?: string;
  completedCount: number;
  totalCount: number;
  pendingDocuments: string[];
}) {
  const name = params.firstName ?? 'there';
  const progressPct = Math.round((params.completedCount / params.totalCount) * 100);
  const pendingList = params.pendingDocuments.slice(0, 5);

  return sendEmail({
    to: params.to,
    subject: `⏰ Weekly Check-in — ${progressPct}% of your documents done`,
    html: emailShell(`
      <span class="badge yellow">Weekly Check-in</span>
      <h2 style="margin-top:16px;">How's your progress, ?</h2>
      <p>You're at <strong>${progressPct}%</strong> — ${params.completedCount} out of ${params.totalCount} documents collected. Keep going!</p>

      <div class="stat-row">
        <div class="stat">
          <span class="number">${params.completedCount}</span>
          <span class="label">Complete</span>
        </div>
        <div class="stat">
          <span class="number">${progressPct}%</span>
          <span class="label">Progress</span>
        </div>
        <div class="stat">
          <span class="number">${params.totalCount - params.completedCount}</span>
          <span class="label">Remaining</span>
        </div>
      </div>

      ${pendingList.length > 0 ? `
      <div class="divider"></div>
      <p style="font-size:14px; font-weight:700; color:#f4f4f5; margin-bottom:12px;">Up next to complete:</p>
      <ul class="step-list">
        ${pendingList.map((doc, i) => `<li><span class="step-num">${i + 1}</span>${doc}</li>`).join('')}
      </ul>
      ` : ''}

      <a href="${APP_URL}" class="cta">Continue Your Roadmap →</a>
    `),
  });
}

/**
 * 6. NEW DEVICE ALERT EMAIL
 * Sent when a login is detected from an unrecognized device.
 */
export async function sendNewDeviceAlertEmail(params: {
  to: string;
  firstName?: string;
  browser?: string;
  time: string;
}) {
  const name = params.firstName ?? 'there';
  return sendEmail({
    to: params.to,
    subject: '🔐 New Device Sign-In Detected — Visa Readiness Hub',
    html: emailShell(`
      <span class="badge" style="background:#1a0a0a; color:#f87171; border-color:#991b1b;">Security Alert</span>
      <h2 style="margin-top:16px;">New Sign-In, </h2>
      <p>We detected a sign-in to your account from a new device or browser.</p>

      <div style="background:#09090b; border:1px solid #27272a; border-radius:12px; padding:20px; margin:20px 0;">
        <p style="margin:0; font-size:13px; color:#71717a; font-weight:700; text-transform:uppercase;">Time</p>
        <p style="margin:6px 0 16px; font-size:15px; font-weight:600; color:#e4e4e7;"></p>
        ${params.browser ? `
        <p style="margin:0; font-size:13px; color:#71717a; font-weight:700; text-transform:uppercase;">Browser</p>
        <p style="margin:6px 0 0; font-size:15px; font-weight:600; color:#e4e4e7;"></p>
        ` : ''}
      </div>

      <p>If this was <strong>you</strong>, no action is needed.</p>
      <p>If this was <strong>not you</strong>, please sign in immediately and change your access credentials.</p>
      <a href="${APP_URL}" class="cta">Secure My Account →</a>
    `),
  });
}
