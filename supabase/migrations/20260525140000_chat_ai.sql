-- ╔══════════════════════════════════════════════════════════╗
-- ║ Assistente AI: chat per utente × pollaio                 ║
-- ║ - chat_conversazioni: una riga per conversazione.        ║
-- ║   Scopata su (user_id, pollaio_id): lo stesso utente     ║
-- ║   admin di più pollai vede chat distinte per pollaio.    ║
-- ║ - chat_messaggi: messaggi appesi alla conversazione.     ║
-- ║ - chat_quota_uso: contatore per rate limit giornaliero.  ║
-- ║ - Estende policy storage 'poliner-media' al prefix       ║
-- ║   'chat/' per gli allegati.                              ║
-- ╚══════════════════════════════════════════════════════════╝

-- ── chat_conversazioni ──
create table if not exists public.chat_conversazioni (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pollaio_id uuid not null references public.pollai(id) on delete cascade,
  titolo text not null default 'Nuova conversazione',
  ultimo_messaggio_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists chat_conv_user_pollaio_idx
  on public.chat_conversazioni(user_id, pollaio_id, ultimo_messaggio_at desc);

alter table public.chat_conversazioni enable row level security;

drop policy if exists "chat_conv_select_own" on public.chat_conversazioni;
create policy "chat_conv_select_own" on public.chat_conversazioni
  for select using (auth.uid() = user_id);

drop policy if exists "chat_conv_insert_own" on public.chat_conversazioni;
create policy "chat_conv_insert_own" on public.chat_conversazioni
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_conv_update_own" on public.chat_conversazioni;
create policy "chat_conv_update_own" on public.chat_conversazioni
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "chat_conv_delete_own" on public.chat_conversazioni;
create policy "chat_conv_delete_own" on public.chat_conversazioni
  for delete using (auth.uid() = user_id);


-- ── chat_messaggi ──
create table if not exists public.chat_messaggi (
  id uuid primary key default gen_random_uuid(),
  conversazione_id uuid not null references public.chat_conversazioni(id) on delete cascade,
  ruolo text not null check (ruolo in ('user', 'assistant', 'tool', 'system')),
  contenuto text not null default '',
  allegati jsonb not null default '[]'::jsonb,
  tool_call jsonb,
  token_input int,
  token_output int,
  created_at timestamptz not null default now()
);

create index if not exists chat_msg_conv_idx
  on public.chat_messaggi(conversazione_id, created_at);

alter table public.chat_messaggi enable row level security;

-- Policy via FK: i messaggi sono accessibili sse la conversazione owner = auth.uid()
drop policy if exists "chat_msg_select_via_conv" on public.chat_messaggi;
create policy "chat_msg_select_via_conv" on public.chat_messaggi
  for select using (
    exists (
      select 1 from public.chat_conversazioni c
      where c.id = chat_messaggi.conversazione_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "chat_msg_insert_via_conv" on public.chat_messaggi;
create policy "chat_msg_insert_via_conv" on public.chat_messaggi
  for insert with check (
    exists (
      select 1 from public.chat_conversazioni c
      where c.id = chat_messaggi.conversazione_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "chat_msg_delete_via_conv" on public.chat_messaggi;
create policy "chat_msg_delete_via_conv" on public.chat_messaggi
  for delete using (
    exists (
      select 1 from public.chat_conversazioni c
      where c.id = chat_messaggi.conversazione_id
        and c.user_id = auth.uid()
    )
  );


-- ── chat_quota_uso ──
create table if not exists public.chat_quota_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  data date not null,
  count int not null default 0,
  primary key (user_id, data)
);

alter table public.chat_quota_uso enable row level security;

drop policy if exists "chat_quota_select_own" on public.chat_quota_uso;
create policy "chat_quota_select_own" on public.chat_quota_uso
  for select using (auth.uid() = user_id);

drop policy if exists "chat_quota_insert_own" on public.chat_quota_uso;
create policy "chat_quota_insert_own" on public.chat_quota_uso
  for insert with check (auth.uid() = user_id);

drop policy if exists "chat_quota_update_own" on public.chat_quota_uso;
create policy "chat_quota_update_own" on public.chat_quota_uso
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── Estendi storage policy: ammetti il prefix 'chat/' su poliner-media ──
drop policy if exists "poliner_media_authenticated_insert" on storage.objects;
create policy "poliner_media_authenticated_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'poliner-media'
    and (storage.foldername(name))[1] = any (array[
      'pollai', 'animali', 'uova', 'salute', 'manutenzione', 'note', 'chat'
    ])
  );
