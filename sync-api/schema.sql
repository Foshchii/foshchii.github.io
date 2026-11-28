-- Guitar Academy sync: the server side, for a Supabase (Postgres) project.
-- Run it once in the project's SQL editor, or apply it as a migration. Running it again is safe.
--
-- The academy (guitar/sync.js) encrypts the learner's progress in the browser before it is sent,
-- with a key made from their sync code. This table keeps only that encrypted copy, under a SHA-256
-- hash of a token also made from the code. Without the code nobody, the site's owner included,
-- can find a copy or read it.
--
-- Nothing reaches the table directly: row level security is on with no policies, and the anon
-- role may only call the three functions below. They check every argument and cap the sizes, so
-- the table cannot grow without bound: 400 KB per copy, 40 MB in all.

create table if not exists public.guitar_sync (
  id text primary key check (id ~ '^[0-9a-f]{64}$'),
  blob text not null check (length(blob) <= 400000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.guitar_sync is
  'Guitar Academy (foshchii.com/guitar) progress, encrypted in the browser. Reached only through guitar_sync_pull, guitar_sync_push and guitar_sync_delete.';

alter table public.guitar_sync enable row level security;
revoke all on table public.guitar_sync from anon, authenticated;

-- The token is 32 bytes in base64url (43 characters); the row is found by its hash.
create or replace function public.guitar_sync_id(token text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if token is null or token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'guitar sync: bad token' using errcode = '22023';
  end if;
  return encode(sha256(convert_to(token, 'UTF8')), 'hex');
end;
$$;

-- The encrypted copy and its version, or version 0 when there is none.
create or replace function public.guitar_sync_pull(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.guitar_sync%rowtype;
begin
  select * into stored from public.guitar_sync where id = public.guitar_sync_id(token);
  if stored.id is not null then
    return jsonb_build_object('version', stored.version, 'blob', stored.blob, 'updated_at', stored.updated_at);
  end if;
  return jsonb_build_object('version', 0);
end;
$$;

-- Replace the copy at version base with blob. If another device uploaded first, nothing is
-- written and the answer carries the newer copy, so the browser can merge it and try again.
create or replace function public.guitar_sync_push(token text, blob text, base integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  key text := public.guitar_sync_id(token);
  existing public.guitar_sync%rowtype;
begin
  if blob is null or length(blob) > 400000 then
    raise exception 'guitar sync: copy too large' using errcode = '22001';
  end if;
  if blob !~ '^g1\.[A-Za-z0-9+/]+={0,2}$' then
    raise exception 'guitar sync: not an encrypted copy' using errcode = '22023';
  end if;
  select * into existing from public.guitar_sync where id = key for update;
  if existing.id is null then
    if coalesce(base, -1) <> 0 then
      return jsonb_build_object('ok', false, 'version', 0);
    end if;
    if (select coalesce(sum(length(g.blob)), 0) from public.guitar_sync g) + length(blob) > 40000000 then
      raise exception 'guitar sync: storage is full' using errcode = '53100';
    end if;
    insert into public.guitar_sync (id, blob) values (key, blob) on conflict (id) do nothing;
    if not found then
      select * into existing from public.guitar_sync where id = key;
      return jsonb_build_object('ok', false, 'version', existing.version, 'blob', existing.blob);
    end if;
    return jsonb_build_object('ok', true, 'version', 1);
  end if;
  if existing.version <> coalesce(base, -1) then
    return jsonb_build_object('ok', false, 'version', existing.version, 'blob', existing.blob);
  end if;
  update public.guitar_sync
     set blob = guitar_sync_push.blob, version = existing.version + 1, updated_at = now()
   where id = key;
  return jsonb_build_object('ok', true, 'version', existing.version + 1);
end;
$$;

-- Forget the copy: "Delete the synced copy" on the sync screen.
create or replace function public.guitar_sync_delete(token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.guitar_sync where id = public.guitar_sync_id(token);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.guitar_sync_id(text) from public, anon, authenticated;
revoke all on function public.guitar_sync_pull(text) from public;
revoke all on function public.guitar_sync_push(text, text, integer) from public;
revoke all on function public.guitar_sync_delete(text) from public;
grant execute on function public.guitar_sync_pull(text) to anon, authenticated;
grant execute on function public.guitar_sync_push(text, text, integer) to anon, authenticated;
grant execute on function public.guitar_sync_delete(text) to anon, authenticated;
