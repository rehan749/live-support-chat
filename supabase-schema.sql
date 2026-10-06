-- ============================================================
-- Supportly Live Chat — Supabase Database Schema (Idempotent)
-- Safe to run multiple times without any errors
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── 1. WEBSITES TABLE ────────────────────────────────────────
create table if not exists websites (
  id          uuid primary key default uuid_generate_v4(),
  agent_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  origin      text not null,
  color       text not null default '#6366f1',
  greeting    text not null default 'Hi there! How can we help?',
  position    text not null default 'right',
  online      boolean not null default true,
  ai_enabled  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table websites enable row level security;

-- Policies for websites (drop first if exists)
drop policy if exists "Agents manage own websites" on websites;
create policy "Agents manage own websites"
  on websites for all
  using (agent_id = auth.uid());

-- ── 2. CONVERSATIONS TABLE ───────────────────────────────────
create table if not exists conversations (
  id            uuid primary key default uuid_generate_v4(),
  site_id       uuid not null references websites(id) on delete cascade,
  visitor_name  text not null,
  email         text not null default '',
  visitor_token text not null,
  page          text not null default '',
  status        text not null default 'open',
  priority      boolean not null default false,
  unread        integer not null default 1,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table conversations enable row level security;

-- Policies for conversations (drop first if exists)
drop policy if exists "Agents read own conversations" on conversations;
create policy "Agents read own conversations"
  on conversations for select
  using (
    site_id in (select id from websites where agent_id = auth.uid())
  );

drop policy if exists "Agents update own conversations" on conversations;
create policy "Agents update own conversations"
  on conversations for update
  using (
    site_id in (select id from websites where agent_id = auth.uid())
  );

drop policy if exists "Visitors create conversations" on conversations;
create policy "Visitors create conversations"
  on conversations for insert
  with check (true);

-- ── 3. MESSAGES TABLE ────────────────────────────────────────
create table if not exists messages (
  id               uuid primary key default uuid_generate_v4(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender           text not null,
  kind             text not null default 'reply',
  body             text not null,
  file_url         text,
  created_at       timestamptz not null default now()
);

alter table messages enable row level security;

-- Policies for messages (drop first if exists)
drop policy if exists "Agents read own messages" on messages;
create policy "Agents read own messages"
  on messages for select
  using (
    conversation_id in (
      select c.id from conversations c
      join websites w on w.id = c.site_id
      where w.agent_id = auth.uid()
    )
  );

drop policy if exists "Agents insert messages" on messages;
create policy "Agents insert messages"
  on messages for insert
  with check (
    conversation_id in (
      select c.id from conversations c
      join websites w on w.id = c.site_id
      where w.agent_id = auth.uid()
    )
    or sender = 'visitor'
    or sender = 'bot'
  );

drop policy if exists "Visitors create messages" on messages;
create policy "Visitors create messages"
  on messages for insert
  with check (sender = 'visitor');

-- ── 4. INDEXES ───────────────────────────────────────────────
create index if not exists idx_conversations_site_updated
  on conversations(site_id, updated_at desc);

create index if not exists idx_messages_conversation_created
  on messages(conversation_id, created_at);

create index if not exists idx_websites_agent
  on websites(agent_id);

-- ── 5. REALTIME REPLICATION ──────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'messages') then
    alter publication supabase_realtime add table messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'conversations') then
    alter publication supabase_realtime add table conversations;
  end if;
end $$;

-- ── 6. STORAGE BUCKET & POLICIES ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('chat-attachments', 'chat-attachments', true)
on conflict do nothing;

drop policy if exists "Anyone can upload attachments" on storage.objects;
create policy "Anyone can upload attachments"
  on storage.objects for insert
  with check (bucket_id = 'chat-attachments');

drop policy if exists "Attachments are public" on storage.objects;
create policy "Attachments are public"
  on storage.objects for select
  using (bucket_id = 'chat-attachments');
