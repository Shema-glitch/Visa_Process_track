-- Add rating column to support_tickets
alter table public.support_tickets
add column rating integer check (rating between 1 and 5),
add column rated_at timestamp with time zone;

-- Index for cleanup queries
create index idx_support_tickets_rating on public.support_tickets(rating);

-- Update RLS: users can delete their own tickets (after rating)
create policy "Users can delete own tickets"
  on public.support_tickets for delete
  using (auth.uid() = user_id);

-- Admin can delete any ticket
create policy "Admin can delete tickets"
  on public.support_tickets for delete
  using (public.is_admin());
