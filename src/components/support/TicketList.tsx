import { Loader2, MessageSquare, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SupportTicket } from '@/hooks/useSupportTickets';
import { cn } from '@/lib/utils';

interface TicketListProps {
  tickets: SupportTicket[];
  loading: boolean;
  onSelect: (ticketId: string) => void;
  onStatusChange: (ticketId: string, status: SupportTicket['status']) => void;
}

const STATUS_CONFIG = {
  open: {
    label: 'Open',
    icon: AlertCircle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  in_progress: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  resolved: {
    label: 'Resolved',
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  drive: 'Google Drive',
  upload: 'File Upload',
  account: 'Account',
  documents: 'Documents',
  bug: 'Bug Report',
};

export function TicketList({ tickets, loading, onSelect, onStatusChange }: TicketListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <MessageSquare className="size-10 text-zinc-700 mb-4" />
        <p className="text-sm font-semibold text-zinc-400">No support tickets yet</p>
        <p className="text-xs text-zinc-600 mt-1">Tickets will appear here when users request help</p>
      </div>
    );
  }

  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2">
          <AlertCircle className="size-4 text-amber-400" />
          <span className="text-sm font-bold text-amber-400">{openCount}</span>
          <span className="text-xs text-amber-400/70">open</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
          <Clock className="size-4 text-blue-400" />
          <span className="text-sm font-bold text-blue-400">{inProgressCount}</span>
          <span className="text-xs text-blue-400/70">in progress</span>
        </div>
      </div>

      {/* Ticket cards */}
      <div className="space-y-3">
        {tickets.map((ticket) => {
          const config = STATUS_CONFIG[ticket.status];
          const StatusIcon = config.icon;
          const timeAgo = getTimeAgo(ticket.updatedAt);

          return (
            <div
              key={ticket.id}
              className={cn(
                'group rounded-xl border p-4 transition-all hover:border-zinc-600 cursor-pointer',
                ticket.status === 'open'
                  ? 'border-amber-500/20 bg-amber-500/[0.02]'
                  : 'border-zinc-800 bg-zinc-900/50'
              )}
              onClick={() => onSelect(ticket.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={cn('text-[10px] font-bold', config.bg, config.color, config.border, 'border')}
                    >
                      <StatusIcon className="size-3 mr-1" />
                      {config.label}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-zinc-500 border-zinc-700">
                      {CATEGORY_LABELS[ticket.category] || ticket.category}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold text-zinc-200 truncate">{ticket.subject}</p>
                  {ticket.lastMessage && (
                    <p className="text-xs text-zinc-500 mt-1 truncate">{ticket.lastMessage}</p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 whitespace-nowrap">{timeAgo}</span>
              </div>

              {/* Quick status change */}
              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                {ticket.status !== 'open' && (
                  <Button
                    variant="ghost"
                    size="action"
                    className="text-xs text-zinc-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(ticket.id, 'open');
                    }}
                  >
                    Reopen
                  </Button>
                )}
                {ticket.status !== 'in_progress' && (
                  <Button
                    variant="ghost"
                    size="action"
                    className="text-xs text-zinc-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(ticket.id, 'in_progress');
                    }}
                  >
                    Mark In Progress
                  </Button>
                )}
                {ticket.status !== 'resolved' && (
                  <Button
                    variant="ghost"
                    size="action"
                    className="text-xs text-emerald-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(ticket.id, 'resolved');
                    }}
                  >
                    Resolve
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
