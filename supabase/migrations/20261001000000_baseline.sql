-- BondhuKoi baseline schema.
--
-- Accounts live in Supabase Auth (auth.users). Everything else is here, in the public
-- schema, and is reachable only through the API: row-level security is on for every table
-- with no policies, and the app's public (anon) key has no grants.
--
-- Coordinates are never stored. The only location-derived data is `presence` (on campus?
-- inside which circles?) and short-lived enter/exit `transitions`.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

set search_path = public, extensions;

-- ─── Universities ──────────────────────────────────────────────────────────

create table universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 120),
  short_name text check (char_length(short_name) <= 20),
  -- Sign-up is limited to these email domains (and their subdomains).
  email_domains text[] not null default '{}',
  boundary geometry(Polygon, 4326),
  snapshot_path text,
  boundary_updated_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index universities_boundary_gix on universities using gist (boundary);

-- ─── Profiles ──────────────────────────────────────────────────────────────

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  university_id uuid not null references universities (id) on delete restrict,
  friend_code text not null unique check (friend_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  avatar_path text,
  facebook text check (char_length(facebook) <= 100),
  instagram text check (char_length(instagram) <= 100),
  status text not null default 'active' check (status in ('active', 'suspended', 'banned')),
  -- Privacy
  sharing_enabled boolean not null default true,
  share_campus boolean not null default true,
  quiet_hours_enabled boolean not null default true,
  quiet_start smallint not null default 18 check (quiet_start between 0 and 23),
  quiet_end smallint not null default 6 check (quiet_end between 0 and 23),
  short_history boolean not null default true, -- true: 24 hours, false: 30 days
  notify jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_active_at timestamptz
);

create index profiles_university_idx on profiles (university_id);
create index profiles_university_name_idx on profiles (university_id, lower(name));

-- The latest answer to "where is this person?", as zones only.
create table presence (
  user_id uuid primary key references profiles (id) on delete cascade,
  on_campus boolean not null default false,
  circle_ids uuid[] not null default '{}',
  checked_at timestamptz not null default now()
);

-- ─── Friends, watches and blocks ───────────────────────────────────────────

create table friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references profiles (id) on delete cascade,
  to_user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (from_user_id, to_user_id),
  check (from_user_id <> to_user_id)
);

create index friend_requests_to_idx on friend_requests (to_user_id, created_at desc);

-- One row per pair, smaller id first.
create table friendships (
  user_a uuid not null references profiles (id) on delete cascade,
  user_b uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create index friendships_b_idx on friendships (user_b);

-- A watcher gets enter/exit alerts for the watched person, only after the watched person accepts.
create table watches (
  id uuid primary key default gen_random_uuid(),
  watcher_id uuid not null references profiles (id) on delete cascade,
  watched_id uuid not null references profiles (id) on delete cascade,
  scope text not null default 'campus' check (scope in ('campus', 'all')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (watcher_id, watched_id),
  check (watcher_id <> watched_id)
);

create index watches_watched_idx on watches (watched_id, status);

create table blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on blocks (blocked_id);

-- ─── Circles ───────────────────────────────────────────────────────────────

create table circles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  description text not null default '' check (char_length(description) <= 280),
  university_id uuid references universities (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  members_can_invite boolean not null default false,
  messenger_link text check (char_length(messenger_link) <= 300),
  location_label text check (char_length(location_label) <= 80),
  snapshot_path text,
  snapshot_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table circle_members (
  circle_id uuid not null references circles (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'pending' check (status in ('pending', 'active')),
  detection_enabled boolean not null default true,
  invited_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  joined_at timestamptz,
  primary key (circle_id, user_id)
);

create index circle_members_user_idx on circle_members (user_id, status);

create table circle_boundaries (
  circle_id uuid primary key references circles (id) on delete cascade,
  boundary geometry(Polygon, 4326) not null,
  updated_at timestamptz not null default now()
);

create index circle_boundaries_gix on circle_boundaries using gist (boundary);

-- Enter/exit events, pruned after 24 hours or 30 days (profiles.short_history).
create table transitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  zone text not null check (zone in ('campus', 'circle')),
  circle_id uuid references circles (id) on delete cascade,
  kind text not null check (kind in ('enter', 'exit')),
  at timestamptz not null default now(),
  check ((zone = 'circle') = (circle_id is not null))
);

create index transitions_user_at_idx on transitions (user_id, at desc);
create index transitions_circle_at_idx on transitions (circle_id, at desc) where circle_id is not null;

-- ─── Notifications ─────────────────────────────────────────────────────────

create table push_tokens (
  token text primary key check (char_length(token) <= 200),
  user_id uuid not null references profiles (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_idx on push_tokens (user_id);

-- ─── Safety and support ────────────────────────────────────────────────────

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references profiles (id) on delete set null,
  target_user_id uuid references profiles (id) on delete set null,
  target_circle_id uuid references circles (id) on delete set null,
  reason text not null check (reason in ('harassment', 'stalking', 'fake_account', 'spam', 'inappropriate', 'other')),
  details text not null default '' check (char_length(details) <= 1000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'closed')),
  admin_note text not null default '' check (char_length(admin_note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_status_idx on reports (status, created_at desc);

create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  message text not null check (char_length(message) between 1 and 2000),
  app_version text check (char_length(app_version) <= 20),
  platform text check (char_length(platform) <= 20),
  screen text check (char_length(screen) <= 80),
  status text not null default 'new' check (status in ('new', 'seen', 'done')),
  created_at timestamptz not null default now()
);

create index feedback_status_idx on feedback (status, created_at desc);

-- What an account did, for the admin timeline. Never location data.
create table account_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  meta jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index account_events_user_idx on account_events (user_id, at desc);
create index account_events_kind_idx on account_events (kind, at desc);

-- ─── Admin ─────────────────────────────────────────────────────────────────

create table admins (
  user_id uuid primary key references profiles (id) on delete cascade,
  role text not null check (role in ('super', 'moderator')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index admin_audit_at_idx on admin_audit (at desc);

create table app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);

insert into app_settings (key, value) values
  ('signups', '{"open": true, "invitesRequired": false}'),
  ('maintenance', '{"enabled": false, "message": ""}'),
  ('banner', '{"text": "", "tone": "info"}'),
  ('minAppVersion', '"1.0.0"'),
  ('features', '{"watch": true, "feed": true, "googleSignIn": false}');

create table invite_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  max_uses integer not null check (max_uses > 0),
  uses integer not null default 0 check (uses >= 0),
  university_id uuid references universities (id) on delete cascade,
  expires_at timestamptz,
  note text not null default '' check (char_length(note) <= 200),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (uses <= max_uses)
);

-- ─── Sign-up rules (run inside Supabase Auth's insert) ─────────────────────

-- The university an email address belongs to, or null.
create or replace function university_for_email(p_email text)
returns uuid
language sql
stable
set search_path = public
as $$
  select u.id
  from universities u, unnest(u.email_domains) d
  where u.is_active
    and (
      lower(split_part(p_email, '@', 2)) = lower(d)
      or lower(split_part(p_email, '@', 2)) like '%.' || lower(d)
    )
  order by char_length(d) desc
  limit 1
$$;

create or replace function new_friend_code()
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := gen_random_bytes(8);
    code := '';
    for i in 0..7 loop
      code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
    end loop;
    exit when not exists (select 1 from profiles where friend_code = code);
  end loop;
  return code;
end
$$;

-- Runs when Supabase Auth creates an account. Raising here rejects the sign-up.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_university uuid;
  v_signups jsonb;
  v_code text;
  v_name text;
begin
  v_university := university_for_email(new.email);
  if v_university is null then
    raise exception 'BK_EMAIL_DOMAIN' using hint = 'Sign up with your university email address.';
  end if;

  select value into v_signups from app_settings where key = 'signups';
  if coalesce((v_signups ->> 'open')::boolean, true) = false then
    raise exception 'BK_SIGNUPS_CLOSED' using hint = 'Sign-ups are closed right now.';
  end if;

  if coalesce((v_signups ->> 'invitesRequired')::boolean, false) then
    v_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
    update invite_codes
       set uses = uses + 1
     where code = v_code
       and uses < max_uses
       and (expires_at is null or expires_at > now())
       and (university_id is null or university_id = v_university)
    returning code into v_code;
    if v_code is null then
      raise exception 'BK_INVITE_INVALID' using hint = 'That invite code is not valid.';
    end if;
  end if;

  v_name := left(trim(coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1))), 80);

  insert into profiles (id, name, university_id, friend_code)
  values (new.id, v_name, v_university, new_friend_code());

  insert into account_events (user_id, kind, meta)
  values (new.id, 'signed_up', jsonb_build_object('invite', v_code));

  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- An account can't move to an email outside its university.
create or replace function handle_auth_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     and university_for_email(new.email) is distinct from (select university_id from profiles where id = new.id) then
    raise exception 'BK_EMAIL_DOMAIN' using hint = 'Use an email address from your university.';
  end if;
  return new;
end
$$;

create trigger on_auth_email_change
  before update of email on auth.users
  for each row execute function handle_auth_email_change();

-- ─── updated_at ────────────────────────────────────────────────────────────

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger universities_touch before update on universities for each row execute function touch_updated_at();
create trigger profiles_touch before update on profiles for each row execute function touch_updated_at();
create trigger circles_touch before update on circles for each row execute function touch_updated_at();
create trigger reports_touch before update on reports for each row execute function touch_updated_at();

-- ─── Lock the public schema down ───────────────────────────────────────────
-- Only the API (connecting as the database owner) reads and writes these tables.

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'spatial_ref_sys'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end
$$;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on all tables in schema public from %I', r);
      execute format('revoke all on all sequences in schema public from %I', r);
      execute format('revoke all on all functions in schema public from %I', r);
      execute format('alter default privileges in schema public revoke all on tables from %I', r);
      execute format('alter default privileges in schema public revoke all on sequences from %I', r);
      execute format('alter default privileges in schema public revoke all on functions from %I', r);
    end if;
  end loop;
end
$$;

-- Functions are executable by everyone by default; only the API needs them.
revoke execute on all functions in schema public from public;
alter default privileges in schema public revoke execute on functions from public;
