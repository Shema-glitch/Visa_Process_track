import { ArrowLeft, Shield, Lock, Eye, Database, Globe, Mail, Trash2, Cookie, Users, FileText, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

interface PrivacyPageProps {
  onBack: () => void;
}

const LAST_UPDATED = 'June 25, 2026';

const SECTIONS = [
  { id: 'collection', icon: Database, title: 'Information We Collect' },
  { id: 'usage', icon: Eye, title: 'How We Use Your Information' },
  { id: 'storage', icon: Lock, title: 'Data Storage and Security' },
  { id: 'third-party', icon: Globe, title: 'Third-Party Services' },
  { id: 'rights', icon: Users, title: 'Your Rights' },
  { id: 'retention', icon: Clock, title: 'Data Retention' },
  { id: 'cookies', icon: Cookie, title: 'Cookies and Tracking' },
  { id: 'children', icon: Shield, title: "Children's Privacy" },
  { id: 'changes', icon: FileText, title: 'Changes to This Policy' },
  { id: 'contact', icon: Mail, title: 'Contact Us' },
];

export function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-3xl mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-3xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-4 text-center mb-12">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-200">
              <Shield className="size-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Privacy Policy</h1>
              <p className="mt-2 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {/* Summary box */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-10">
            <h2 className="text-sm font-bold text-zinc-200 mb-3">In Summary</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Visa Vault helps you organize and track visa application documents. We collect minimal personal data — primarily your email address — and store document metadata (not file contents) on our servers. Your actual files are stored in your own Google Drive. We never sell your data, never read your files, and never share your information with third parties for marketing purposes.
            </p>
          </div>

          {/* Table of contents */}
          <nav className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5 mb-10">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Contents</h3>
            <ul className="space-y-1.5">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-1"
                  >
                    <span className="text-[11px] text-zinc-600 w-5 text-right tabular-nums">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Sections */}
          <div className="space-y-12">
            <Section id="collection" icon={Database} title="1. Information We Collect">
              <SubHeading>Information you provide:</SubHeading>
              <List>
                <li>Email address (used for authentication via one-time codes)</li>
                <li>Name (from your Google account, used for personalization)</li>
                <li>Document names, statuses, and phase assignments you create</li>
                <li>Support messages you send to us</li>
              </List>

              <SubHeading>Information collected automatically:</SubHeading>
              <List>
                <li>Device and browser information (used for security alerts on new logins)</li>
                <li>IP address and approximate location (for fraud prevention)</li>
                <li>Error logs and performance data (via Sentry, anonymized where possible)</li>
              </List>

              <SubHeading>Information we do NOT collect:</SubHeading>
              <List>
                <li>Passwords (we use passwordless authentication)</li>
                <li>File contents (your documents stay in your Google Drive)</li>
                <li>Payment or financial information</li>
                <li>Government-issued identification numbers</li>
              </List>
            </Section>

            <Section id="usage" icon={Eye} title="2. How We Use Your Information">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">We use your information solely to:</p>
              <List>
                <li>Authenticate your account and maintain security</li>
                <li>Display your document tracking roadmap</li>
                <li>Send transactional emails (sign-in codes, progress updates, security alerts)</li>
                <li>Respond to support requests</li>
                <li>Monitor and improve application reliability</li>
              </List>
              <p className="text-sm text-zinc-400 leading-relaxed mt-3">
                We do not use your data for advertising, profiling, or automated decision-making.
              </p>
            </Section>

            <Section id="storage" icon={Lock} title="3. Data Storage and Security">
              <List>
                <li>Account data is stored in Supabase (PostgreSQL) with row-level security — you can only access your own data</li>
                <li>Document files are stored in your personal Google Drive, not on our servers</li>
                <li>Authentication tokens are encrypted and stored securely</li>
                <li>All data transmission is encrypted via HTTPS/TLS</li>
              </List>
            </Section>

            <Section id="third-party" icon={Globe} title="4. Third-Party Services">
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">We use the following third-party services, each with their own privacy policies:</p>
              <div className="rounded-lg border border-zinc-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/50">
                      <th className="text-left px-4 py-2.5 font-semibold text-zinc-300">Service</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-zinc-300">Purpose</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-zinc-300">Data shared</th>
                    </tr>
                  </thead>
                  <tbody className="text-zinc-400">
                    <tr className="border-b border-zinc-800/50"><td className="px-4 py-2.5">Supabase</td><td className="px-4 py-2.5">Database & auth</td><td className="px-4 py-2.5">Email, session tokens</td></tr>
                    <tr className="border-b border-zinc-800/50"><td className="px-4 py-2.5">Google Drive</td><td className="px-4 py-2.5">File storage</td><td className="px-4 py-2.5">OAuth tokens</td></tr>
                    <tr className="border-b border-zinc-800/50"><td className="px-4 py-2.5">Brevo</td><td className="px-4 py-2.5">Transactional emails</td><td className="px-4 py-2.5">Email address, name</td></tr>
                    <tr><td className="px-4 py-2.5">Sentry</td><td className="px-4 py-2.5">Error monitoring</td><td className="px-4 py-2.5">Anonymized error data</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed mt-3">
                We do not sell, rent, or share your personal information with any third party for their marketing purposes.
              </p>
            </Section>

            <Section id="rights" icon={Users} title="5. Your Rights">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                Under GDPR (for EU users) and CCPA (for California users), you have the right to:
              </p>
              <div className="space-y-3">
                <RightItem title="Access" desc="Request a copy of all data we hold about you." />
                <RightItem title="Delete" desc="Request deletion of your account and all associated data." />
                <RightItem title="Correct" desc="Request correction of inaccurate data." />
                <RightItem title="Portability" desc="Receive your data in a structured, machine-readable format." />
                <RightItem title="Opt out" desc="Unsubscribe from non-essential emails (security emails cannot be opted out of)." />
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed mt-3">
                To exercise any of these rights, contact us via the Support page within the application.
              </p>
            </Section>

            <Section id="retention" icon={Clock} title="6. Data Retention">
              <List>
                <li>Account data is retained as long as your account is active</li>
                <li>Support tickets and messages are retained for 12 months after resolution</li>
                <li>Error logs are retained for 30 days</li>
                <li>Upon account deletion, all personal data is permanently removed within 30 days</li>
              </List>
            </Section>

            <Section id="cookies" icon={Cookie} title="7. Cookies and Tracking">
              <p className="text-sm text-zinc-400 leading-relaxed">
                We do not use cookies for tracking or advertising. We use local browser storage solely for theme preference (light/dark mode), session management, and security device fingerprinting (to detect new logins).
              </p>
            </Section>

            <Section id="children" icon={Shield} title="8. Children's Privacy">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Visa Vault is not intended for users under the age of 16. We do not knowingly collect personal information from children.
              </p>
            </Section>

            <Section id="changes" icon={FileText} title="9. Changes to This Policy">
              <p className="text-sm text-zinc-400 leading-relaxed">
                We may update this policy from time to time. Significant changes will be communicated via email. Continued use of the application after changes constitutes acceptance of the updated policy.
              </p>
            </Section>

            <Section id="contact" icon={Mail} title="10. Contact Us">
              <p className="text-sm text-zinc-400 leading-relaxed">
                For privacy-related inquiries or to exercise your data rights, use the Support page within the application or contact us at the email address provided in the application footer.
              </p>
            </Section>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-600">
              This policy is effective as of {LAST_UPDATED}. Last reviewed: {LAST_UPDATED}.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Section({ id, icon: Icon, title, children }: { id: string; icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-800/80 text-zinc-400">
          <Icon className="size-4.5" />
        </div>
        <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
      </div>
      <div className="pl-12">{children}</div>
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-zinc-300 mt-4 mb-2">{children}</h3>;
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">{children}</ul>;
}

function RightItem({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
      <span className="text-sm font-bold text-zinc-200 shrink-0 w-24">{title}</span>
      <span className="text-sm text-zinc-400">{desc}</span>
    </div>
  );
}
