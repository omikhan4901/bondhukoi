-- Storage buckets: public avatars (small re-encoded JPEGs) and private zone pictures
-- (served through short-lived signed links). Only the API uploads, with the service key.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values
      ('avatars', 'avatars', true, 1048576, array['image/jpeg']),
      ('snapshots', 'snapshots', false, 2097152, array['image/jpeg'])
    on conflict (id) do update
      set public = excluded.public,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
