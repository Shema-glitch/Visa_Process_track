import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isAdmin: boolean;
  createdAt: string;
}

export interface ActiveTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved';
  category: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: string;
}

export function useSupportChat(ticketId: string | null) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [ticketStatus, setTicketStatus] = useState<'open' | 'in_progress' | 'resolved' | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch ticket status
  const fetchTicketStatus = useCallback(async () => {
    if (!ticketId) return;
    try {
      const { data } = await supabase
        .from('support_tickets')
        .select('status')
        .eq('id', ticketId)
        .maybeSingle();
      if (data) setTicketStatus(data.status);
    } catch (err) {
      console.error('Failed to fetch ticket status:', err);
    }
  }, [ticketId]);

  // Fetch existing messages
  const fetchMessages = useCallback(async () => {
    if (!ticketId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(
        (data || []).map((row) => ({
          id: row.id,
          ticketId: row.ticket_id,
          senderId: row.sender_id,
          message: row.message,
          isAdmin: row.is_admin,
          createdAt: row.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Subscribe to new messages and ticket status changes
  useEffect(() => {
    if (!ticketId) return;

    fetchMessages();
    fetchTicketStatus();

    const channel = supabase
      .channel(`support-chat-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const newMsg: SupportMessage = {
            id: row.id as string,
            ticketId: row.ticket_id as string,
            senderId: row.sender_id as string,
            message: row.message as string,
            isAdmin: row.is_admin as boolean,
            createdAt: row.created_at as string,
          };
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setTicketStatus(row.status as 'open' | 'in_progress' | 'resolved');
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [ticketId, fetchMessages, fetchTicketStatus]);

  // Send a message
  const sendMessage = useCallback(
    async (text: string, isAdmin: boolean) => {
      if (!ticketId || !text.trim() || sending) return;

      setSending(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase.from('support_messages').insert({
          ticket_id: ticketId,
          sender_id: user.id,
          message: text.trim(),
          is_admin: isAdmin,
        });

        if (error) throw error;
      } catch (err) {
        console.error('Failed to send message:', err);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [ticketId, sending]
  );

  return { messages, ticketStatus, loading, sending, sendMessage };
}

/**
 * Fetch the current user's active (non-resolved) tickets.
 */
export function useActiveTickets() {
  const [tickets, setTickets] = useState<ActiveTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setTickets([]); return; }

      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Fetch last message for each ticket
      const ticketsWithPreview = await Promise.all(
        (data || []).map(async (ticket) => {
          const { data: lastMsg } = await supabase
            .from('support_messages')
            .select('message')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            category: ticket.category,
            createdAt: ticket.created_at,
            updatedAt: ticket.updated_at,
            lastMessage: lastMsg?.message || undefined,
          };
        })
      );

      setTickets(ticketsWithPreview);
    } catch (err) {
      console.error('Failed to fetch active tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  return { tickets, loading, fetchTickets };
}

/**
 * Rate a resolved ticket — deletes ticket + all messages.
 */
export async function rateTicket(ticketId: string, rating: number): Promise<void> {
  const { data, error } = await supabase.functions.invoke('rate-ticket', {
    body: { ticketId, rating },
  });

  if (error || !data?.success) {
    throw new Error(data?.error || 'Failed to submit rating');
  }
}
