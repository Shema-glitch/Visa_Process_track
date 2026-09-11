import { useState } from 'react';
import { ArrowLeft, Send, Loader2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TicketFormProps {
  onSubmit: (subject: string, category: string, message: string) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'drive', label: 'Google Drive connection' },
  { value: 'upload', label: 'File upload issues' },
  { value: 'account', label: 'Account & login' },
  { value: 'documents', label: 'Document tracking' },
  { value: 'bug', label: 'Bug report' },
];

export function TicketForm({ onSubmit, onCancel }: TicketFormProps) {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSubmit(subject.trim(), category, message.trim());
    } catch {
      setError('Failed to create ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onCancel}
          className="flex size-10 items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-zinc-100">Contact Support</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Describe your issue and we'll get back to you</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="ticket-subject" className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Subject
          </Label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What do you need help with?"
            className="h-11 border-zinc-700/60 bg-zinc-900/60 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-zinc-400/30"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Category
          </Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-11 border-zinc-700/60 bg-zinc-900/60 text-zinc-100 focus-visible:ring-zinc-400/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className="text-zinc-200 focus:bg-zinc-800 focus:text-zinc-100">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ticket-message" className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Message
          </Label>
          <textarea
            id="ticket-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your issue in detail..."
            className="min-h-[140px] w-full rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/30 resize-none"
            maxLength={2000}
            required
          />
          <p className="text-[11px] text-zinc-600 text-right">{message.length}/2000</p>
        </div>

        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-red-400" />
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            size="cta"
            disabled={submitting || !subject.trim() || !message.trim()}
            className="flex-1"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="size-4" />
                Send Request
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="cta"
            onClick={onCancel}
            disabled={submitting}
            className="text-zinc-500 hover:text-zinc-200"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
