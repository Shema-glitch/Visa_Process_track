import { useState, useCallback } from 'react';
import { ArrowLeft, LifeBuoy, MessageSquare, Send, Loader2, Star, CheckCircle2, Clock, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { FlowCard } from '@/components/ui/flow-card';
import { FaqSection } from '@/components/support/FaqSection';
import { TicketForm } from '@/components/support/TicketForm';
import { ChatWindow } from '@/components/support/ChatWindow';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/toast';
import { useActiveTickets, rateTicket, ActiveTicket } from '@/hooks/useSupportChat';
import { cn } from '@/lib/utils';

interface SupportPageProps {
  onBack: () => void;
  initialTicketId?: string | null;
}

type SupportView = 'faq' | 'form' | 'chat' | 'tickets';

const STATUS_CONFIG = {
  open: { icon: AlertCircle, color: 'text-amber-400', label: 'Open' },
  in_progress: { icon: Clock, color: 'text-blue-400', label: 'In progress' },
  resolved: { icon: CheckCircle2, color: 'text-emerald-400', label: 'Resolved — rate to close' },
};

export function SupportPage({ onBack, initialTicketId }: SupportPageProps) {
  const [view, setView] = useState<SupportView>(initialTicketId ? 'chat' : 'faq');
  const [ticketId, setTicketId] = useState<string | null>(initialTicketId || null);
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const { tickets, loading: ticketsLoading, fetchTickets } = useActiveTickets();

  const handleCreateTicket = useCallback(
    async (subject: string, category: string, message: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('create-support-ticket', {
        body: { subject, category, message },
      });
      if (error) throw error;

      setTicketId(data.ticketId);
      setTicketSubject(subject);
      setView('chat');
      fetchTickets();
      toast({
        title: 'Request sent!',
        description: 'We received your message and will respond soon.',
        variant: 'success',
      });
    },
    [fetchTickets]
  );

  const openTicket = (ticket: ActiveTicket) => {
    setTicketId(ticket.id);
    setTicketSubject(ticket.subject);
    setView('chat');
  };

  const goBackToMenu = () => {
    setView('faq');
    setTicketId(null);
    fetchTickets();
  };

  // Filter: show non-resolved tickets, plus resolved ones that need rating
  const activeTickets = tickets.filter((t) => t.status !== 'resolved');
  const resolvedTickets = tickets.filter((t) => t.status === 'resolved');

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-xl mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4 text-center mb-10"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-200">
            <LifeBuoy className="size-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Help & Support</h1>
            <p className="mt-2 text-base text-zinc-400">Find answers or get in touch with us</p>
          </div>
        </motion.div>

        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {view === 'faq' && (
              <motion.div
                key="faq"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-8"
              >
                {/* Active tickets */}
                {!ticketsLoading && (activeTickets.length > 0 || resolvedTickets.length > 0) && (
                  <FlowCard animate={false} className="max-w-none p-6">
                    <h3 className="text-sm font-bold text-zinc-200 mb-4">Your Support Tickets</h3>
                    <div className="space-y-2">
                      {activeTickets.map((ticket) => {
                        const config = STATUS_CONFIG[ticket.status];
                        const Icon = config.icon;
                        return (
                          <button
                            key={ticket.id}
                            onClick={() => openTicket(ticket)}
                            className="w-full flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-left hover:border-zinc-600 transition-colors"
                          >
                            <Icon className={cn('size-4 shrink-0', config.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-zinc-200 truncate">{ticket.subject}</p>
                              <p className="text-[11px] text-zinc-600">{config.label}</p>
                            </div>
                            {ticket.status === 'open' && (
                              <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
                            )}
                          </button>
                        );
                      })}
                      {resolvedTickets.map((ticket) => (
                        <button
                          key={ticket.id}
                          onClick={() => openTicket(ticket)}
                          className="w-full flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.03] px-4 py-3 text-left hover:border-emerald-500/40 transition-colors"
                        >
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-200 truncate">{ticket.subject}</p>
                            <p className="text-[11px] text-emerald-400">Resolved — tap to rate & close</p>
                          </div>
                          <Star className="size-4 text-emerald-400/50" />
                        </button>
                      ))}
                    </div>
                  </FlowCard>
                )}

                <FlowCard animate={false} className="max-w-none">
                  <FaqSection />
                </FlowCard>

                <FlowCard animate={false} className="max-w-none">
                  <div className="flex flex-col items-center gap-5 p-8 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                      <MessageSquare className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">Still need help?</h3>
                      <p className="mt-1 text-sm text-zinc-500">
                        Can't find what you're looking for? Start a conversation with our support team.
                      </p>
                    </div>
                    <Button size="cta" onClick={() => setView('form')}>
                      <Send className="size-4" />
                      Contact Support
                    </Button>
                  </div>
                </FlowCard>
              </motion.div>
            )}

            {view === 'form' && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <FlowCard animate={false} className="max-w-none">
                  <TicketForm
                    onSubmit={handleCreateTicket}
                    onCancel={() => setView('faq')}
                  />
                </FlowCard>
              </motion.div>
            )}

            {view === 'chat' && ticketId && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <FlowCard animate={false} className="max-w-none overflow-hidden p-0">
                  <ChatWindow
                    ticketId={ticketId}
                    ticketSubject={ticketSubject}
                    onBack={goBackToMenu}
                    embedded
                    showRating
                  />
                </FlowCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legal links */}
        <div className="flex items-center justify-center gap-3 mt-10 text-[11px] text-zinc-600">
          <button onClick={() => { window.location.href = '?privacy'; }} className="hover:text-zinc-400 transition-colors">Privacy Policy</button>
          <span className="text-zinc-800">·</span>
          <button onClick={() => { window.location.href = '?terms'; }} className="hover:text-zinc-400 transition-colors">Terms & Conditions</button>
        </div>
      </div>
    </div>
  );
}
