-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create tables
create table public.requirements (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  phase integer not null check (phase between 1 and 4),
  status text not null check (status in ('pending', 'in_progress', 'completed')) default 'pending',
  dependency_id uuid references public.requirements(id) on delete set null,
  requires_dual_language boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.requirement_attachments (
  id uuid default gen_random_uuid() primary key,
  requirement_id uuid references public.requirements(id) on delete cascade not null,
  gdrive_file_id text not null,
  filename text not null,
  language_tag text not null check (language_tag in ('English', 'Kinyarwanda', 'Universal')) default 'Universal',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.google_drive_auth (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.requirements enable row level security;
alter table public.requirement_attachments enable row level security;
alter table public.google_drive_auth enable row level security;

-- Create RLS Policies for requirements
create policy "Users can view their own requirements"
  on public.requirements for select
  using (auth.uid() = user_id);

create policy "Users can insert their own requirements"
  on public.requirements for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own requirements"
  on public.requirements for update
  using (auth.uid() = user_id);

create policy "Users can delete their own requirements"
  on public.requirements for delete
  using (auth.uid() = user_id);

-- Create RLS Policies for requirement_attachments
create policy "Users can view attachments for their requirements"
  on public.requirement_attachments for select
  using (
    exists (
      select 1 from public.requirements
      where requirements.id = requirement_attachments.requirement_id
      and requirements.user_id = auth.uid()
    )
  );

create policy "Users can insert attachments for their requirements"
  on public.requirement_attachments for insert
  with check (
    exists (
      select 1 from public.requirements
      where requirements.id = requirement_attachments.requirement_id
      and requirements.user_id = auth.uid()
    )
  );

create policy "Users can update attachments for their requirements"
  on public.requirement_attachments for update
  using (
    exists (
      select 1 from public.requirements
      where requirements.id = requirement_attachments.requirement_id
      and requirements.user_id = auth.uid()
    )
  );

create policy "Users can delete attachments for their requirements"
  on public.requirement_attachments for delete
  using (
    exists (
      select 1 from public.requirements
      where requirements.id = requirement_attachments.requirement_id
      and requirements.user_id = auth.uid()
    )
  );

-- Create RLS Policies for google_drive_auth
create policy "Users can view their own drive auth"
  on public.google_drive_auth for select
  using (auth.uid() = user_id);

create policy "Users can insert their own drive auth"
  on public.google_drive_auth for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own drive auth"
  on public.google_drive_auth for update
  using (auth.uid() = user_id);

create policy "Users can delete their own drive auth"
  on public.google_drive_auth for delete
  using (auth.uid() = user_id);
