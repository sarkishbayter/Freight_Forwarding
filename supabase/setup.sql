-- Freight toolbox login: tables, security rules and functions.
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Contains no passwords. Users are created by a separate script (create-users.sql) that is NOT kept in this repository.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  username  text unique not null,
  full_name text not null,
  role      text not null default 'user' check (role in ('admin', 'user'))
);
alter table public.profiles enable row level security;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);

create table if not exists public.password_requests (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'done')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- No policies on purpose: nobody can read or write this table directly. Only the functions below can.
alter table public.password_requests enable row level security;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- A user asks for a new password. Returns the request id the browser will watch.
create or replace function public.request_reset(p_username text) returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid; fn text; rid uuid;
begin
  select id, full_name into uid, fn from profiles
   where username = regexp_replace(lower(trim(p_username)), '\s+', '.', 'g');
  if uid is null then return json_build_object('error', 'not_found'); end if;
  if exists (select 1 from password_requests where user_id = uid and status = 'pending' and created_at > now() - interval '10 minutes') then
    return json_build_object('error', 'too_soon');
  end if;
  insert into password_requests(user_id) values (uid) returning id into rid;
  return json_build_object('id', rid, 'name', fn);
end $$;

-- The browser asks "what did the admin decide?"
create or replace function public.request_status(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare r password_requests;
begin
  select * into r from password_requests where id = p_id;
  if r.id is null then return 'unknown'; end if;
  if r.status = 'approved' and r.decided_at < now() - interval '1 day' then return 'expired'; end if;
  return r.status;
end $$;

-- After approval, the user chooses the new password. Stored encrypted (bcrypt) in Supabase Auth.
create or replace function public.complete_reset(p_id uuid, p_password text) returns text
language plpgsql security definer set search_path = public, auth, extensions as $$
declare r password_requests;
begin
  if p_password is null or length(p_password) < 8 then return 'weak'; end if;
  select * into r from password_requests where id = p_id for update;
  if r.id is null or r.status <> 'approved' or r.decided_at < now() - interval '1 day' then return 'invalid'; end if;
  update auth.users set encrypted_password = crypt(p_password, gen_salt('bf')), updated_at = now() where id = r.user_id;
  update password_requests set status = 'done' where id = r.id;
  return 'ok';
end $$;

-- Admin only: list and decide.
create or replace function public.admin_list_requests()
returns table (id uuid, full_name text, status text, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  return query select r.id, p.full_name, r.status, r.created_at
                 from password_requests r join profiles p on p.id = r.user_id
                order by r.created_at desc limit 50;
end $$;

create or replace function public.admin_decide(p_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  update password_requests set status = case when p_approve then 'approved' else 'rejected' end, decided_at = now()
   where id = p_id and status = 'pending';
end $$;

revoke execute on function public.is_admin(), public.request_reset(text), public.request_status(uuid),
  public.complete_reset(uuid, text), public.admin_list_requests(), public.admin_decide(uuid, boolean) from public;
grant execute on function public.request_reset(text), public.request_status(uuid), public.complete_reset(uuid, text) to anon, authenticated;
grant execute on function public.is_admin(), public.admin_list_requests(), public.admin_decide(uuid, boolean) to authenticated;
