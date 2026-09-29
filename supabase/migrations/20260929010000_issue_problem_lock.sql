-- issue_problem: take a per-(player, template) lock before reusing or creating an open problem.

-- Returns the player's open problem for the template, or issues a new one with a server seed.
create or replace function public.issue_problem(p_template_id text, p_fresh boolean default false)
returns table (id uuid, seed int, template_version int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := internal.require_player();
  tpl public.templates;
begin
  select * into tpl from public.templates t where t.id = p_template_id and not t.retired;
  if not found then raise exception 'unknown template %', p_template_id; end if;
  if not internal.topic_open(uid, tpl.topic_id) then raise exception 'topic locked'; end if;
  if not internal.template_unlocked(uid, tpl.id) then raise exception 'template locked'; end if;

  -- Serializes concurrent calls (two tabs, double renders) so they reuse one open problem.
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || tpl.id, 0));

  if not p_fresh then
    return query
      select ip.id, ip.seed, ip.template_version from public.issued_problems ip
      where ip.user_id = uid and ip.template_id = tpl.id and ip.solved_at is null
      order by ip.issued_at desc limit 1;
    if found then return; end if;
  end if;

  return query
    insert into public.issued_problems (user_id, template_id, template_version, seed)
    values (uid, tpl.id, tpl.version, floor(random() * 2147483647)::int)
    returning issued_problems.id, issued_problems.seed, issued_problems.template_version;
end $$;
