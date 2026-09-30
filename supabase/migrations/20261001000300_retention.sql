-- Retention promised in the privacy policy (site/privacy): reports and feedback are kept
-- up to a year after they're handled.
create or replace function prune_support()
returns void
language sql
set search_path = public
as $$
  delete from reports where status = 'closed' and updated_at < now() - interval '1 year';
  delete from feedback where created_at < now() - interval '1 year';
$$;

revoke execute on function prune_support() from public;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('bondhukoi-prune-support', '17 3 * * *', 'select public.prune_support()');
  end if;
end
$$;
