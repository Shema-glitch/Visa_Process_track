import { ArrowLeft, FileText, Scale, UserCheck, Settings, AlertTriangle, Key, Shield, XCircle, Clock, Gavel, Mail } from 'lucide-react';
import { motion } from 'motion/react';

interface TermsPageProps {
  onBack: () => void;
}

const LAST_UPDATED = 'June 25, 2026';

const SECTIONS = [
  { id: 'acceptance', icon: Scale, title: 'Acceptance of Terms' },
  { id: 'description', icon: FileText, title: 'Description of Service' },
  { id: 'accounts', icon: UserCheck, title: 'User Accounts' },
  { id: 'responsibilities', icon: Settings, title: 'User Responsibilities' },
  { id: 'drive', icon: Key, title: 'Google Drive Integration' },
  { id: 'prohibited', icon: XCircle, title: 'Prohibited Activities' },
  { id: 'ip', icon: Shield, title: 'Intellectual Property' },
  { id: 'availability', icon: Clock, title: 'Service Availability' },
  { id: 'liability', icon: AlertTriangle, title: 'Limitation of Liability' },
  { id: 'disclaimer', icon: Shield, title: 'Disclaimer' },
  { id: 'termination', icon: XCircle, title: 'Termination' },
  { id: 'disputes', icon: Gavel, title: 'Dispute Resolution' },
  { id: 'changes', icon: FileText, title: 'Changes to Terms' },
  { id: 'contact', icon: Mail, title: 'Contact' },
];

export function TermsPage({ onBack }: TermsPageProps) {
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
              <FileText className="size-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Terms & Conditions</h1>
              <p className="mt-2 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>
            </div>
          </div>

          {/* Summary box */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 mb-10">
            <h2 className="text-sm font-bold text-zinc-200 mb-3">In Summary</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              By using Visa Vault, you agree to use the service for its intended purpose — tracking visa document requirements. You are responsible for the accuracy of your data and the security of your account. We provide the tool "as is" and are not liable for outcomes related to your visa application. You may delete your account at any time.
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
            <Section id="acceptance" icon={Scale} title="1. Acceptance of Terms">
              <p className="text-sm text-zinc-400 leading-relaxed">
                By accessing or using Visa Vault ("the Service"), you agree to be bound by these Terms and Conditions ("Terms"). If you do not agree, do not use the Service.
              </p>
            </Section>

            <Section id="description" icon={FileText} title="2. Description of Service">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">
                Visa Vault is a document tracking application that helps users organize and monitor the progress of visa application requirements. The Service:
              </p>
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li>Provides a customizable checklist of visa-related documents</li>
                <li>Tracks document status across defined phases</li>
                <li>Integrates with Google Drive for file storage</li>
                <li>Sends transactional notifications related to your progress</li>
              </ul>
              <p className="text-sm text-zinc-400 leading-relaxed mt-3">
                The Service is a tracking and organizational tool. It does not provide legal advice, immigration consulting, or guarantee any outcome related to visa applications.
              </p>
            </Section>

            <Section id="accounts" icon={UserCheck} title="3. User Accounts">
              <div className="space-y-3">
                <Definition term="Eligibility" def="You must be at least 16 years old to use the Service." />
                <Definition term="Authentication" def="Accounts are created via email-based one-time password (OTP). You are responsible for maintaining access to your registered email address." />
                <Definition term="Security" def='If you detect unauthorized access to your account, use the "Sign out everywhere" feature immediately and contact support.' />
                <Definition term="One account per person" def="You may not create multiple accounts or share account access." />
              </div>
            </Section>

            <Section id="responsibilities" icon={Settings} title="4. User Responsibilities">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">You agree to:</p>
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li>Provide accurate information when using the Service</li>
                <li>Use the Service only for lawful purposes</li>
                <li>Not attempt to access other users' data</li>
                <li>Not interfere with the Service's operation or security</li>
                <li>Not use automated tools to scrape, crawl, or extract data from the Service</li>
                <li>Comply with all applicable laws regarding visa applications in your jurisdiction</li>
              </ul>
            </Section>

            <Section id="drive" icon={Key} title="5. Google Drive Integration">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">When you connect Google Drive:</p>
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li>You authorize Visa Vault to create files in a dedicated "Visa Vault Archive" folder</li>
                <li>We request only <code className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">drive.file</code> scope — we cannot access, read, or modify your existing files</li>
                <li>You may disconnect Google Drive at any time</li>
                <li>Disconnecting does not delete files already uploaded to your Drive</li>
              </ul>
            </Section>

            <Section id="prohibited" icon={XCircle} title="6. Prohibited Activities">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">You may not:</p>
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li>Use the Service for any illegal or fraudulent purpose</li>
                <li>Upload malicious files or content that violates others' rights</li>
                <li>Attempt to reverse-engineer, decompile, or modify the Service</li>
                <li>Circumvent security measures or access controls</li>
                <li>Use the Service to transmit spam, phishing, or harmful content</li>
                <li>Impersonate another person or misrepresent your identity</li>
                <li>Resell, sublicense, or commercially exploit the Service without written permission</li>
              </ul>
            </Section>

            <Section id="ip" icon={Shield} title="7. Intellectual Property">
              <p className="text-sm text-zinc-400 leading-relaxed">
                The Service, including its design, code, and documentation, is the intellectual property of Visa Vault. You retain full ownership of the data and files you create and upload.
              </p>
            </Section>

            <Section id="availability" icon={Clock} title="8. Service Availability">
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li>The Service is provided "as is" and "as available"</li>
                <li>We do not guarantee uninterrupted or error-free operation</li>
                <li>We may temporarily suspend the Service for maintenance with reasonable notice</li>
                <li>We reserve the right to modify or discontinue features at any time</li>
              </ul>
            </Section>

            <Section id="liability" icon={AlertTriangle} title="9. Limitation of Liability">
              <p className="text-sm text-zinc-400 leading-relaxed mb-3">To the maximum extent permitted by law:</p>
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li>Visa Vault is not responsible for the outcome of any visa application</li>
                <li>We are not liable for data loss resulting from Google Drive disconnection, third-party service outages, or user error</li>
                <li>We are not liable for indirect, incidental, consequential, or punitive damages</li>
                <li>Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim (currently $0, as the Service is free)</li>
              </ul>
            </Section>

            <Section id="disclaimer" icon={Shield} title="10. Disclaimer">
              <p className="text-sm text-zinc-400 leading-relaxed">
                Visa Vault is an organizational tool, not a legal or immigration service. We do not guarantee that using the Service will result in a successful visa application. Users are responsible for verifying document requirements with the relevant embassy or consulate.
              </p>
            </Section>

            <Section id="termination" icon={XCircle} title="11. Termination">
              <div className="space-y-3">
                <Definition term="By you" def="You may delete your account at any time from the application settings. Upon deletion, your data is permanently removed within 30 days." />
                <Definition term="By us" def="We may suspend or terminate your account if you violate these Terms, engage in abusive behavior, or if required by law." />
              </div>
            </Section>

            <Section id="disputes" icon={Gavel} title="12. Dispute Resolution">
              <ul className="space-y-1.5 text-sm text-zinc-400 leading-relaxed">
                <li><strong className="text-zinc-300">Governing law:</strong> These Terms are governed by the laws of the jurisdiction where the Service operator is established</li>
                <li><strong className="text-zinc-300">Informal resolution:</strong> Before initiating formal proceedings, parties agree to attempt resolution through good-faith negotiation for a period of 30 days</li>
                <li><strong className="text-zinc-300">Arbitration:</strong> Unresolved disputes shall be settled by binding arbitration under applicable arbitration rules</li>
                <li><strong className="text-zinc-300">Class action waiver:</strong> You agree to resolve disputes individually and waive participation in class actions or collective proceedings</li>
              </ul>
            </Section>

            <Section id="changes" icon={FileText} title="13. Changes to Terms">
              <p className="text-sm text-zinc-400 leading-relaxed">
                We may update these Terms from time to time. Material changes will be communicated via email or in-app notification at least 14 days before taking effect. Continued use after changes take effect constitutes acceptance.
              </p>
            </Section>

            <Section id="contact" icon={Mail} title="14. Contact">
              <p className="text-sm text-zinc-400 leading-relaxed">
                For questions about these Terms, use the Support page within the application.
              </p>
            </Section>
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-600">
              These terms are effective as of {LAST_UPDATED}. Last reviewed: {LAST_UPDATED}.
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

function Definition({ term, def }: { term: string; def: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
      <span className="text-sm font-bold text-zinc-200 shrink-0 w-32">{term}</span>
      <span className="text-sm text-zinc-400">{def}</span>
    </div>
  );
}
