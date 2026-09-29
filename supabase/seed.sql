-- Local development only (supabase start / supabase db reset). Content comes from
-- `npm run content:sync` against the local instance.
insert into public.invites (code) values ('LOCAL-DEV-1'), ('LOCAL-DEV-2'), ('LOCAL-DEV-3')
on conflict do nothing;

