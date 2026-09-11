-- Support tickets table
create table public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  category text not null default 'general',
  status text not null check (status in ('open', 'in_progress', 'resolved')) default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Support messages table (chat within a ticket)
create table public.support_messages (
  id uuid default gen_random_uuid() primary key,
  ticket_id uuid references public.support_tickets(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  is_admin boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index idx_support_tickets_user_id on public.support_tickets(user_id);
create index idx_support_tickets_status on public.support_tickets(status);
create index idx_support_messages_ticket_id on public.support_messages(ticket_id);
create index idx_support_messages_created_at on public.support_messages(created_at);

-- Enable RLS
alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- ── User policies ────────────────────────────────────────────────────────────

-- Users can view their own tickets
create policy "Users can view own tickets"
  on public.support_tickets for select
  using (auth.uid() = user_id);

-- Users can create tickets
create policy "Users can insert own tickets"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Users can view messages in their own tickets
create policy "Users can view messages in own tickets"
  on public.support_messages for select
  using (exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
    and support_tickets.user_id = auth.uid()
  ));

-- Users can send messages in their own tickets
create policy "Users can insert messages in own tickets"
  on public.support_messages for insert
  with check (exists (
    select 1 from public.support_tickets
    where support_tickets.id = support_messages.ticket_id
    and support_tickets.user_id = auth.uid()
  ));

-- ── Admin helper function ────────────────────────────────────────────────────

-- Checks if the current user's email matches the admin email setting
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (auth.jwt() ->> 'email') = current_setting('app.admin_email', true),
    false
  )
$$ language sql security definer stable;

-- ── Admin policies ───────────────────────────────────────────────────────────

-- Admin can view all tickets
create policy "Admin can view all tickets"
  on public.support_tickets for select
  using (public.is_admin());

-- Admin can update ticket status
create policy "Admin can update tickets"
  on public.support_tickets for update
  using (public.is_admin());

-- Admin can view all messages
create policy "Admin can view all messages"
  on public.support_messages for select
  using (public.is_admin());

-- Admin can send messages in any ticket
create policy "Admin can insert messages in any ticket"
  on public.support_messages for insert
  with check (public.is_admin());

-- ── Enable Realtime ──────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.support_messages;
