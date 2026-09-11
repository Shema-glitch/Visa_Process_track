import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, ArrowLeft, User, Shield, Star, CheckCircle2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { useSupportChat, rateTicket, SupportMessage } from '@/hooks/useSupportChat';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/toast';

interface ChatWindowProps {
  ticketId: string;
  ticketSubject?: string;
  isAdmin?: boolean;
  onBack?: () => void;
  embedded?: boolean;
  /** When true and ticket is resolved, show rating prompt instead of chat input */
  showRating?: boolean;
}

function MessageBubble({ message, isOwn }: { message: SupportMessage; isOwn: boolean }) {
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={cn('flex gap-2.5 max-w-[85%]', isOwn ? 'ml-auto flex-row-reverse' : '')}>
      <div className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full',
        message.isAdmin ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500'
      )}>
        {message.isAdmin ? <Shield className="size-3.5" /> : <User className="size-3.5" />}
      </div>
      <div>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isOwn ? 'bg-zinc-100 text-zinc-950 rounded-br-md' : 'bg-zinc-800/80 text-zinc-200 rounded-bl-md border border-zinc-700/40'
        )}>
          {message.message}
        </div>
        <p className={cn('mt-1 text-[10px] text-zinc-600', isOwn ? 'text-right' : 'text-left')}>
          {message.isAdmin ? 'Support' : 'You'} · {time}
        </p>
      </div>
    </div>
  );
}

function RatingPrompt({ ticketId, onDone }: { ticketId: string; onDone: () => void }) {
  const [rating, setRating] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      await rateTicket(ticketId, rating);
      setSubmitted(true);
      toast({ title: 'Thanks for your feedback!', variant: 'success' });
      setTimeout(onDone, 1500);
    } catch {
      toast({ title: 'Failed to submit rating', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <CheckCircle2 className="size-12 text-emerald-400" />
        </motion.div>
        <p className="text-sm font-bold text-zinc-200">Thank you!</p>
        <p className="text-xs text-zinc-500">Your feedback helps us improve.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="size-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-zinc-200">Issue resolved!</p>
        <p className="text-xs text-zinc-500 mt-1">How was your support experience?</p>
      </div>

      {/* Stars */}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setRating(star)}
            className="p-1 transition-transform hover:scale-110"
          >
            <Star
              className={cn(
                'size-7 transition-colors',
                (hovered !== null ? star <= hovered : star <= (rating || 0))
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-zinc-700'
              )}
            />
          </button>
        ))}
      </div>

      {rating && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 w-full"
        >
          <p className="text-xs text-zinc-500">
            {rating <= 2 ? "We're sorry to hear that. We'll work on improving." :
             rating === 3 ? "Thanks! We'll keep improving." :
             "Glad we could help!"}
          </p>
          <Button
            size="action"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            {submitting ? 'Closing...' : 'Submit & Close Ticket'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export function ChatWindow({ ticketId, ticketSubject, isAdmin = false, onBack, embedded, showRating }: ChatWindowProps) {
  const { messages, ticketStatus, loading, sending, sendMessage } = useSupportChat(ticketId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    inputRef.current?.focus();
    try {
      await sendMessage(text, isAdmin);
    } catch {
      setInput(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isResolved = ticketStatus === 'resolved';
  const showRatingUI = showRating && isResolved && !isAdmin;

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
        {onBack && (
          <button
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="size-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-zinc-100 truncate">{ticketSubject || 'Support Chat'}</p>
          <p className="text-[11px] text-zinc-600">
            {isResolved ? 'Resolved' : isAdmin ? 'Replying as support' : 'Chat with support'}
          </p>
        </div>
        {isResolved && !isAdmin && (
          <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full py-12">
            <Loader2 className="size-5 animate-spin text-zinc-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex size-10 items-center justify-center rounded-full bg-zinc-800 text-zinc-600 mb-3">
              <Send className="size-4" />
            </div>
            <p className="text-sm text-zinc-500">Start the conversation below</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = isAdmin ? msg.isAdmin : !msg.isAdmin;
            return <MessageBubble key={msg.id} message={msg} isOwn={isOwn} />;
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area — replaced by rating when resolved */}
      <AnimatePresence mode="wait">
        {showRatingUI ? (
          <motion.div
            key="rating"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-zinc-800"
          >
            <RatingPrompt ticketId={ticketId} onDone={onBack || (() => {})} />
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 border-t border-zinc-800"
          >
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="flex-1 min-h-[40px] max-h-[120px] resize-none rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400/30"
                rows={1}
              />
              <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending} className="shrink-0 rounded-xl">
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (embedded) {
    return <div className="flex flex-col h-[65vh] sm:h-[560px]">{content}</div>;
  }

  return (
    <div className="flex flex-col h-[65vh] sm:h-[560px] rounded-2xl border border-zinc-800/80 bg-zinc-950/75 backdrop-blur-xl overflow-hidden">
      {content}
    </div>
  );
}
