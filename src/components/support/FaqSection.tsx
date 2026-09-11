import { HelpCircle } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQ_DATA = [
  {
    q: 'How do I connect my Google Drive?',
    a: 'Go to your Dashboard and click "Connect Google Drive" in the Cloud Storage card. You\'ll be redirected to Google to authorize access. We only request permission to create files — we never read or modify your existing files.',
  },
  {
    q: 'Why are some documents locked?',
    a: 'Documents are organized into 4 phases that must be completed in order. Phase 1 (DIY Documents) must be finished before Phase 2 (Bank & Notary) unlocks, and so on. This ensures you collect everything in the right sequence.',
  },
  {
    q: 'How do I upload a document?',
    a: 'Click on any unlocked document card and use the upload zone. You can drag and drop a file or click to browse. Supported formats: PDF, JPG, PNG, DOC, DOCX. Files are stored in your Google Drive in organized phase folders.',
  },
  {
    q: 'What is dual language support?',
    a: 'Some documents require versions in both English and Kinyarwanda. When a document has this requirement, you\'ll see two separate upload zones — one for each language.',
  },
  {
    q: 'I can\'t log in or didn\'t receive the code',
    a: 'We use passwordless login via OTP (one-time code). Enter your email and we\'ll send an 8-digit code. Check your spam folder. You can resend the code after the cooldown period. If the issue persists, contact support below.',
  },
  {
    q: 'How do I reconnect Google Drive?',
    a: 'Click the refresh icon next to "View Archive" in the Cloud Storage card, or go to Settings and select Reconnect Drive. This will re-authorize access without losing your uploaded files.',
  },
  {
    q: 'Can I add custom documents?',
    a: 'Yes! During onboarding, use the "Extra Documents" section to add documents unique to your situation. You can also add documents anytime from the Dashboard using the "Add document" button.',
  },
  {
    q: 'Where are my files stored?',
    a: 'All files are stored in your personal Google Drive under a "Visa Vault Archive" folder, organized into phase subfolders (e.g., Phase 1 - DIY Documents). We never store file contents on our servers.',
  },
];

export function FaqSection() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400">
          <HelpCircle className="size-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Frequently Asked Questions</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Quick answers to common questions</p>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {FAQ_DATA.map((item, i) => (
          <AccordionItem key={i} value={`item-${i}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
