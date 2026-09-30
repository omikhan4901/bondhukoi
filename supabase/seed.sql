-- Local development data only (never run against production).
insert into universities (name, short_name, email_domains)
values
  ('North South University', 'NSU', array['northsouth.edu']),
  ('BRAC University', 'BRACU', array['bracu.ac.bd', 'g.bracu.ac.bd'])
on conflict (name) do nothing;
