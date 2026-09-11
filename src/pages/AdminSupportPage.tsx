import { useState, useCallback } from 'react';
import { ArrowLeft, Shield, LifeBuoy, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlowCard } from '@/components/ui/flow-card';
import { TicketList } from '@/components/support/TicketList';
import { ChatWindow } from '@/components/support/ChatWindow';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';

interface AdminSupportPageProps {
  onBack: () => void;
  initialTicketId?: string | null;
}

export function AdminSupportPage({ onBack, initialTicketId }: AdminSupportPageProps) {
  const { tickets, loading, updateTicketStatus } = useSupportTickets();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId || null);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleStatusChange = useCallback(
    async (ticketId: string, status: SupportTicket['status']) => {
      try {
        await updateTicketStatus(ticketId, status);
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    },
    [updateTicketStatus]
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      {/* Subtle background grid */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="relative z-10 flex min-h-screen flex-col items-center px-4 py-12 sm:px-8">
        {/* Inline header */}
        <div className="w-full max-w-2xl mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          className="flex flex-col items-center gap-4 text-center mb-10"
        >
          <div className="flex size-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-200">
            <LifeBuoy className="size-7" />
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">Support Dashboard</h1>
            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] font-bold h-5 px-2">
              <Shield className="size-3 mr-1" />
              Admin
            </Badge>
          </div>
        </motion.div>

        {/* Content */}
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {selectedTicketId ? (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="flex flex-col gap-4"
              >
                <button
                  onClick={() => setSelectedTicketId(null)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-200 transition-colors self-start"
                >
                  <ArrowLeft className="size-3.5" />
                  All tickets
                </button>

                {selectedTicket && (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-300">{selectedTicket.subject}</p>
                    <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                      {selectedTicket.category}
                    </Badge>
                  </div>
                )}

                <FlowCard animate={false} className="max-w-none overflow-hidden p-0">
                  <ChatWindow
                    ticketId={selectedTicketId}
                    ticketSubject={selectedTicket?.subject}
                    isAdmin={true}
                    onBack={() => setSelectedTicketId(null)}
                    embedded
                  />
                </FlowCard>

                {/* Status controls */}
                {selectedTicket && (
                  <div className="flex gap-2 justify-center">
                    {selectedTicket.status !== 'open' && (
                      <Button variant="outline" size="action" onClick={() => handleStatusChange(selectedTicketId, 'open')}>
                        Reopen
                      </Button>
                    )}
                    {selectedTicket.status !== 'in_progress' && (
                      <Button variant="outline" size="action" onClick={() => handleStatusChange(selectedTicketId, 'in_progress')}>
                        In Progress
                      </Button>
                    )}
                    {selectedTicket.status !== 'resolved' && (
                      <Button size="action" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusChange(selectedTicketId, 'resolved')}>
                        Resolve
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
              >
                <FlowCard animate={false} className="max-w-none p-6">
                  <TicketList
                    tickets={tickets}
                    loading={loading}
                    onSelect={setSelectedTicketId}
                    onStatusChange={handleStatusChange}
                  />
                </FlowCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
