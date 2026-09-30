-- Scheduled clean-up. pg_cron exists on Supabase; the local test database skips this.

create or replace function prune_history()
returns void
language sql
set search_path = public
as $$
  -- Enter/exit events: 24 hours for most people, 30 days for those who chose longer.
  delete from transitions t
  using profiles p
  where p.id = t.user_id
    and t.at < now() - case when p.short_history then interval '24 hours' else interval '30 days' end;

  -- Presence nobody has refreshed in 12 hours is no longer true.
  update presence
     set on_campus = false, circle_ids = '{}'
   where checked_at < now() - interval '12 hours'
     and (on_campus or cardinality(circle_ids) > 0);

  -- Unanswered friend requests and watch requests expire after 30 days.
  delete from friend_requests where created_at < now() - interval '30 days';
  delete from watches where status = 'pending' and created_at < now() - interval '30 days';

  -- Circles that were never joined by anyone but their creator, after 7 days.
  delete from circles c
   where c.created_at < now() - interval '7 days'
     and (select count(*) from circle_members m where m.circle_id = c.id and m.status = 'active') < 2;
$$;

revoke execute on function prune_history() from public;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('bondhukoi-prune-history', '*/15 * * * *', 'select public.prune_history()');
  end if;
end
$$;
