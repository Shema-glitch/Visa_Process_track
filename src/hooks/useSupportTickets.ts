import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
  // Joined from auth.users or metadata
  userEmail?: string;
  userName?: string;
  lastMessage?: string;
}

export function useSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch tickets with the last message preview
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          support_messages:message_id (
            message,
            created_at
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) {
        // Fallback: fetch without join if the relation doesn't exist
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('support_tickets')
          .select('*')
          .order('updated_at', { ascending: false });

        if (fallbackError) throw fallbackError;

        // Fetch last message for each ticket
        const ticketsWithPreview = await Promise.all(
          (fallbackData || []).map(async (ticket) => {
            const { data: lastMsg } = await supabase
              .from('support_messages')
              .select('message')
              .eq('ticket_id', ticket.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            return {
              id: ticket.id,
              userId: ticket.user_id,
              subject: ticket.subject,
              category: ticket.category,
              status: ticket.status as SupportTicket['status'],
              createdAt: ticket.created_at,
              updatedAt: ticket.updated_at,
              lastMessage: lastMsg?.message || undefined,
            };
          })
        );

        setTickets(ticketsWithPreview);
        return;
      }

      setTickets(
        (data || []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          userId: row.user_id as string,
          subject: row.subject as string,
          category: row.category as string,
          status: row.status as SupportTicket['status'],
          createdAt: row.created_at as string,
          updatedAt: row.updated_at as string,
          lastMessage: (row.support_messages as Record<string, unknown>[])?.[0]?.message as string || undefined,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTicketStatus = useCallback(
    async (ticketId: string, status: SupportTicket['status']) => {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
      );
    },
    []
  );

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, fetchTickets, updateTicketStatus };
}
