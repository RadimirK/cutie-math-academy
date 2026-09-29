-- Cutie Math Academy: initial schema.
-- Invariants (docs/design.md): player state changes only through the security definer RPCs
-- below; rewards, rates and pools come from the content tables, never from the client.

create schema if not exists internal;
revoke all on schema internal from public;

-- =====================================================================
-- Content tables: written only by public.sync_content (service_role).
-- =====================================================================

create table public.economy (
  id int primary key default 1 check (id = 1),
  pull_cost int not null,
  reward_by_difficulty int[] not null,              -- index = difficulty (1..5)
  decay jsonb not null,                             -- [{after, factor}] sorted by after
  daily_cap_max_difficulty int not null,
  daily_cap_amount int not null,
  daily_cap_timezone text not null,
  pity_5 int not null,
  pity_4 int not null,
  max_constellation int not null,
  refund int[] not null,                            -- index = rarity (3..5), 1..2 unused
  starting_currency int not null,
  updated_at timestamptz not null default now()
);

create table public.subjects (
  id text primary key,
  title text not null,
  sort_order int not null default 0,
  retired boolean not null default false
);

create table public.topics (
  id text primary key,                              -- subject.topic
  subject_id text not null references public.subjects,
  title text not null,
  requires text[] not null default '{}',
  main_character text not null,
  main_scenes text[] not null,
  retired boolean not null default false
);

create table public.scenes (
  id text primary key,                              -- subject.topic.scene
  topic_id text not null references public.topics,
  nodes text[] not null,
  unlocks text[] not null default '{}',
  retired boolean not null default false
);

create table public.templates (
  id text primary key,                              -- subject.topic.template
  topic_id text not null references public.topics,
  version int not null,
  difficulty int not null check (difficulty between 1 and 5),
  starred boolean not null default false,
  base_reward int not null,
  retired boolean not null default false
);

create table public.characters (
  id text primary key,
  name text not null,
  rarity int not null check (rarity between 3 and 5),
  subject_id text not null references public.subjects,
  topics text[] not null default '{}',
  retired boolean not null default false
);

create table public.banners (
  id text primary key,
  subject_id text not null references public.subjects,
  pity_group text not null,
  rate_5 numeric not null,
  rate_4 numeric not null,
  rate_3 numeric not null,
  retired boolean not null default false,
  check (abs(rate_5 + rate_4 + rate_3 - 1) < 1e-9)
);

create table public.banner_items (
  banner_id text not null references public.banners,
  character_id text not null references public.characters,
  rarity int not null check (rarity between 3 and 5),
  primary key (banner_id, character_id)
);

-- =====================================================================
-- Player state: written only by the RPCs.
-- =====================================================================

create table public.invites (
  code text primary key,
  created_by uuid references auth.users on delete set null,
  used_by uuid unique references auth.users on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  nickname text not null unique check (char_length(nickname) between 2 and 24),
  currency bigint not null default 0 check (currency >= 0),  -- cache of sum(currency_ledger.delta)
  created_at timestamptz not null default now()
);

create table public.currency_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  delta bigint not null,
  reason text not null check (reason in ('start', 'solve', 'pull', 'duplicate', 'admin')),
  ref_id text,
  created_at timestamptz not null default now()
);
create index on public.currency_ledger (user_id, created_at);

create table public.issued_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  template_id text not null references public.templates,
  template_version int not null,
  seed int not null,
  issued_at timestamptz not null default now(),
  solved_at timestamptz,
  reward int,
  counts_to_daily_cap boolean not null default false
);
create index on public.issued_problems (user_id, template_id) where solved_at is null;
create index on public.issued_problems (user_id, solved_at);

create table public.template_stats (
  user_id uuid not null references public.profiles on delete cascade,
  template_id text not null references public.templates,
  solved_count int not null default 0,
  last_solved_at timestamptz,
  primary key (user_id, template_id)
);

create table public.owned_characters (
  user_id uuid not null references public.profiles on delete cascade,
  character_id text not null references public.characters,
  copies int not null default 1 check (copies >= 1),         -- constellation = copies - 1
  affection int not null default 0,
  obtained_at timestamptz not null default now(),
  primary key (user_id, character_id)
);

create table public.pity_state (
  user_id uuid not null references public.profiles on delete cascade,
  pity_group text not null,
  since_5 int not null default 0,
  since_4 int not null default 0,
  primary key (user_id, pity_group)
);

create table public.pulls (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles on delete cascade,
  banner_id text not null references public.banners,
  character_id text not null references public.characters,
  rarity int not null,
  created_at timestamptz not null default now()
);
create index on public.pulls (user_id, created_at);

create table public.scene_progress (
  user_id uuid not null references public.profiles on delete cascade,
  scene_id text not null references public.scenes,
  node text not null,
  status text not null check (status in ('in_progress', 'completed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, scene_id)
);

create table public.topic_progress (
  user_id uuid not null references public.profiles on delete cascade,
  topic_id text not null references public.topics,
  status text not null check (status in ('in_progress', 'completed')),
  updated_at timestamptz not null default now(),
  primary key (user_id, topic_id)
);

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles on delete cascade,
  kind text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.events (created_at desc);

-- =====================================================================
-- Privileges and RLS.
-- =====================================================================

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'economy', 'subjects', 'topics', 'scenes', 'templates', 'characters', 'banners', 'banner_items',
    'invites', 'profiles', 'currency_ledger', 'issued_problems', 'template_stats', 'owned_characters',
    'pity_state', 'pulls', 'scene_progress', 'topic_progress', 'events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Content: readable by any signed-in player.
  foreach t in array array['economy', 'subjects', 'topics', 'scenes', 'templates', 'characters', 'banners', 'banner_items'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy "read content" on public.%I for select to authenticated using (true)', t);
  end loop;

  -- Player state: each player reads only their own rows.
  foreach t in array array['currency_ledger', 'issued_problems', 'template_stats', 'owned_characters',
                           'pity_state', 'pulls', 'scene_progress', 'topic_progress'] loop
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy "read own" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

grant select on public.profiles to authenticated;
grant update (nickname) on public.profiles to authenticated;
create policy "read own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "rename self" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.events to authenticated;
create policy "read feed" on public.events for select to authenticated using (true);
-- invites: no access at all.

-- Leaderboard: owner-privileged view exposing only public columns of every profile.
create view public.leaderboard with (security_invoker = false) as
select
  p.nickname,
  coalesce((select sum(t.difficulty) from public.issued_problems ip join public.templates t on t.id = ip.template_id
            where ip.user_id = p.id and ip.solved_at is not null), 0)::int as score,
  (select count(*) from public.owned_characters oc join public.characters c on c.id = oc.character_id
   where oc.user_id = p.id and c.rarity = 5)::int as five_stars
from public.profiles p;
revoke all on public.leaderboard from anon, authenticated;
grant select on public.leaderboard to authenticated;

-- =====================================================================
-- Internal helpers (not exposed through the API).
-- =====================================================================

create function internal.require_player() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles where id = uid) then
    raise exception 'invite not redeemed' using errcode = '28000';
  end if;
  return uid;
end $$;

create function internal.economy() returns public.economy
language sql stable security definer set search_path = '' as $$
  select * from public.economy where id = 1
$$;

-- Appends to the ledger and updates the cached balance. The caller must hold the profile lock.
create function internal.add_currency(p_user uuid, p_delta bigint, p_reason text, p_ref text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare balance bigint;
begin
  insert into public.currency_ledger (user_id, delta, reason, ref_id) values (p_user, p_delta, p_reason, p_ref);
  update public.profiles set currency = currency + p_delta where id = p_user returning currency into balance;
  return balance;
end $$;

create function internal.topic_open(p_user uuid, p_topic text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.topics t, unnest(t.requires) r
    where t.id = p_topic
      and not exists (select 1 from public.topic_progress tp
                      where tp.user_id = p_user and tp.topic_id = r and tp.status = 'completed')
  ) and exists (select 1 from public.topics where id = p_topic and not retired)
$$;

create function internal.template_unlocked(p_user uuid, p_template text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.scene_progress sp join public.scenes s on s.id = sp.scene_id
    where sp.user_id = p_user and sp.status = 'completed' and p_template = any (s.unlocks)
  )
$$;

-- =====================================================================
-- RPC
-- =====================================================================

create function public.redeem_invite(p_code text, p_nickname text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
begin
  if uid is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if exists (select 1 from public.profiles where id = uid) then
    raise exception 'invite already redeemed';
  end if;
  select * into inv from public.invites where code = p_code for update;
  if not found or inv.used_by is not null then
    raise exception 'invalid invite code';
  end if;
  if exists (select 1 from public.profiles where lower(nickname) = lower(trim(p_nickname))) then
    raise exception 'nickname taken';
  end if;
  update public.invites set used_by = uid, used_at = now() where code = p_code;
  insert into public.profiles (id, nickname) values (uid, trim(p_nickname));
  perform internal.add_currency(uid, (internal.economy()).starting_currency, 'start', p_code);
end $$;

-- Returns the player's open problem for the template, or issues a new one with a server seed.
create function public.issue_problem(p_template_id text, p_fresh boolean default false)
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

-- Pays for a solved problem, at most once per issued problem.
create function public.submit_solution(p_issued_id uuid)
returns table (reward int, currency bigint, decay_factor numeric, capped boolean)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := internal.require_player();
  eco public.economy := internal.economy();
  ip public.issued_problems;
  tpl public.templates;
  solved_before int;
  factor numeric := 1;
  step jsonb;
  amount int;
  in_cap boolean;
  earned_today bigint;
  day_start timestamptz;
  balance bigint;
begin
  perform 1 from public.profiles where id = uid for update;  -- serializes currency changes

  select * into ip from public.issued_problems i where i.id = p_issued_id and i.user_id = uid for update;
  if not found then raise exception 'problem not issued to you'; end if;
  if ip.solved_at is not null then raise exception 'already solved'; end if;
  select * into tpl from public.templates t where t.id = ip.template_id;

  select coalesce((select solved_count from public.template_stats s
                   where s.user_id = uid and s.template_id = tpl.id), 0) into solved_before;
  if not tpl.starred then
    for step in select * from jsonb_array_elements(eco.decay) loop
      if solved_before >= (step ->> 'after')::int then factor := (step ->> 'factor')::numeric; end if;
    end loop;
  end if;
  amount := floor(tpl.base_reward * factor);

  in_cap := not tpl.starred and tpl.difficulty <= eco.daily_cap_max_difficulty;
  capped := false;
  if in_cap then
    day_start := date_trunc('day', now() at time zone eco.daily_cap_timezone) at time zone eco.daily_cap_timezone;
    select coalesce(sum(i.reward), 0) into earned_today from public.issued_problems i
    where i.user_id = uid and i.counts_to_daily_cap and i.solved_at >= day_start;
    if amount > eco.daily_cap_amount - earned_today then
      amount := greatest(0, eco.daily_cap_amount - earned_today);
      capped := true;
    end if;
  end if;

  update public.issued_problems set solved_at = now(), reward = amount, counts_to_daily_cap = in_cap
  where id = ip.id;

  insert into public.template_stats (user_id, template_id, solved_count, last_solved_at)
  values (uid, tpl.id, 1, now())
  on conflict (user_id, template_id)
  do update set solved_count = template_stats.solved_count + 1, last_solved_at = now();

  update public.owned_characters oc set affection = oc.affection + tpl.difficulty
  from public.characters c
  where oc.user_id = uid and c.id = oc.character_id and tpl.topic_id = any (c.topics);

  if amount > 0 then
    balance := internal.add_currency(uid, amount, 'solve', ip.id::text);
  else
    select p.currency into balance from public.profiles p where p.id = uid;
  end if;

  reward := amount; currency := balance; decay_factor := factor;
  return next;
end $$;

-- count = 1 or 10. Rolls with random() on the server, honouring 5★ and 4★ pity.
create function public.pull(p_banner_id text, p_count int)
returns table (character_id text, rarity int, constellation int, is_new boolean, refund int)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := internal.require_player();
  eco public.economy := internal.economy();
  ban public.banners;
  pity public.pity_state;
  cost bigint;
  balance bigint;
  r double precision;
  got_rarity int;
  got_char text;
  copies_after int;
begin
  if p_count not in (1, 10) then raise exception 'count must be 1 or 10'; end if;
  select * into ban from public.banners b where b.id = p_banner_id and not b.retired;
  if not found then raise exception 'unknown banner %', p_banner_id; end if;

  select p.currency into balance from public.profiles p where p.id = uid for update;
  cost := eco.pull_cost::bigint * p_count;
  if balance < cost then raise exception 'not enough currency'; end if;
  perform internal.add_currency(uid, -cost, 'pull', ban.id);

  insert into public.pity_state (user_id, pity_group) values (uid, ban.pity_group) on conflict do nothing;
  select * into pity from public.pity_state ps where ps.user_id = uid and ps.pity_group = ban.pity_group for update;

  for i in 1..p_count loop
    pity.since_5 := pity.since_5 + 1;
    pity.since_4 := pity.since_4 + 1;
    r := random();
    if r < ban.rate_5 or pity.since_5 >= eco.pity_5 then
      got_rarity := 5; pity.since_5 := 0; pity.since_4 := 0;
    elsif r < ban.rate_5 + ban.rate_4 or pity.since_4 >= eco.pity_4 then
      got_rarity := 4; pity.since_4 := 0;
    else
      got_rarity := 3;
    end if;

    select bi.character_id into got_char from public.banner_items bi
    where bi.banner_id = ban.id and bi.rarity = got_rarity order by random() limit 1;
    if got_char is null then raise exception 'banner % has no %★ characters', ban.id, got_rarity; end if;

    character_id := got_char; rarity := got_rarity; refund := 0;
    select oc.copies into copies_after from public.owned_characters oc
    where oc.user_id = uid and oc.character_id = got_char for update;
    if not found then
      insert into public.owned_characters (user_id, character_id) values (uid, got_char);
      is_new := true; copies_after := 1;
    elsif copies_after - 1 < eco.max_constellation then
      update public.owned_characters oc set copies = oc.copies + 1
      where oc.user_id = uid and oc.character_id = got_char;
      is_new := false; copies_after := copies_after + 1;
    else
      is_new := false;
      refund := eco.refund[got_rarity];
      perform internal.add_currency(uid, refund, 'duplicate', got_char);
    end if;
    constellation := copies_after - 1;

    insert into public.pulls (user_id, banner_id, character_id, rarity) values (uid, ban.id, got_char, got_rarity);
    return next;
  end loop;

  update public.pity_state ps set since_5 = pity.since_5, since_4 = pity.since_4
  where ps.user_id = uid and ps.pity_group = ban.pity_group;
end $$;

-- Saves the current node of a scene; p_finished marks it completed, which unlocks its
-- templates and may complete the topic. Entering a main scene grants the topic's main character.
create function public.complete_scene(p_scene_id text, p_node text, p_finished boolean default false)
returns table (scene_status text, topic_status text)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := internal.require_player();
  sc public.scenes;
  tp public.topics;
begin
  select * into sc from public.scenes s where s.id = p_scene_id and not s.retired;
  if not found then raise exception 'unknown scene %', p_scene_id; end if;
  if not (p_node = any (sc.nodes)) then raise exception 'unknown node %', p_node; end if;
  select * into tp from public.topics t where t.id = sc.topic_id;
  if not internal.topic_open(uid, tp.id) then raise exception 'topic locked'; end if;

  if sc.id = any (tp.main_scenes) then
    insert into public.owned_characters (user_id, character_id) values (uid, tp.main_character)
    on conflict do nothing;
  end if;

  insert into public.scene_progress as sp (user_id, scene_id, node, status)
  values (uid, sc.id, p_node, case when p_finished then 'completed' else 'in_progress' end)
  on conflict (user_id, scene_id) do update
    set node = excluded.node,
        status = case when sp.status = 'completed' or p_finished then 'completed' else 'in_progress' end,
        updated_at = now()
  returning sp.status into scene_status;

  topic_status := case
    when not exists (
      select 1 from unnest(tp.main_scenes) m
      where not exists (select 1 from public.scene_progress p
                        where p.user_id = uid and p.scene_id = m and p.status = 'completed'))
    then 'completed' else 'in_progress' end;
  insert into public.topic_progress as tpr (user_id, topic_id, status) values (uid, tp.id, topic_status)
  on conflict (user_id, topic_id) do update
    set status = case when tpr.status = 'completed' then 'completed' else excluded.status end,
        updated_at = now()
  returning tpr.status into topic_status;
  return next;
end $$;

-- Keepalive target for the cron workflow; callable with the anon key.
create function public.ping() returns timestamptz language sql stable as $$ select now() $$;

revoke all on function public.redeem_invite(text, text), public.issue_problem(text, boolean),
  public.submit_solution(uuid), public.pull(text, int), public.complete_scene(text, text, boolean),
  public.ping() from public, anon;
grant execute on function public.redeem_invite(text, text), public.issue_problem(text, boolean),
  public.submit_solution(uuid), public.pull(text, int), public.complete_scene(text, text, boolean)
  to authenticated;
grant execute on function public.ping() to anon, authenticated;

-- =====================================================================
-- Feed events (written by triggers).
-- =====================================================================

create function internal.feed_on_pull() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.rarity = 5 then
    insert into public.events (user_id, kind, payload)
    select new.user_id, 'pull_5', jsonb_build_object('nickname', p.nickname, 'character_id', new.character_id, 'banner_id', new.banner_id)
    from public.profiles p where p.id = new.user_id;
  end if;
  return null;
end $$;
create trigger feed_on_pull after insert on public.pulls for each row execute function internal.feed_on_pull();

create function internal.feed_on_solve() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.solved_at is null and new.solved_at is not null
     and exists (select 1 from public.templates t where t.id = new.template_id and t.starred) then
    insert into public.events (user_id, kind, payload)
    select new.user_id, 'starred_solved', jsonb_build_object('nickname', p.nickname, 'template_id', new.template_id)
    from public.profiles p where p.id = new.user_id;
  end if;
  return null;
end $$;
create trigger feed_on_solve after update of solved_at on public.issued_problems
  for each row execute function internal.feed_on_solve();

-- =====================================================================
-- Content sync (service_role only). Upserts everything in one transaction and retires
-- rows missing from the repository; never deletes, since player rows reference content.
-- =====================================================================

create function public.sync_content(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare e jsonb := p -> 'economy';
begin
  insert into public.economy as x (id, pull_cost, reward_by_difficulty, decay, daily_cap_max_difficulty,
    daily_cap_amount, daily_cap_timezone, pity_5, pity_4, max_constellation, refund, starting_currency, updated_at)
  values (1, (e ->> 'pull_cost')::int,
    array(select jsonb_array_elements_text(e -> 'reward_by_difficulty')::int),
    e -> 'decay', (e ->> 'daily_cap_max_difficulty')::int, (e ->> 'daily_cap_amount')::int,
    e ->> 'daily_cap_timezone', (e ->> 'pity_5')::int, (e ->> 'pity_4')::int,
    (e ->> 'max_constellation')::int, array(select jsonb_array_elements_text(e -> 'refund')::int),
    (e ->> 'starting_currency')::int, now())
  on conflict (id) do update set pull_cost = excluded.pull_cost, reward_by_difficulty = excluded.reward_by_difficulty,
    decay = excluded.decay, daily_cap_max_difficulty = excluded.daily_cap_max_difficulty,
    daily_cap_amount = excluded.daily_cap_amount, daily_cap_timezone = excluded.daily_cap_timezone,
    pity_5 = excluded.pity_5, pity_4 = excluded.pity_4, max_constellation = excluded.max_constellation,
    refund = excluded.refund, starting_currency = excluded.starting_currency, updated_at = now();

  insert into public.subjects as x (id, title, sort_order, retired)
  select r.id, r.title, r.sort_order, false from jsonb_to_recordset(p -> 'subjects') as r(id text, title text, sort_order int)
  on conflict (id) do update set title = excluded.title, sort_order = excluded.sort_order, retired = false;

  insert into public.topics as x (id, subject_id, title, requires, main_character, main_scenes, retired)
  select r.id, r.subject_id, r.title, r.requires, r.main_character, r.main_scenes, false
  from jsonb_to_recordset(p -> 'topics') as r(id text, subject_id text, title text, requires text[], main_character text, main_scenes text[])
  on conflict (id) do update set subject_id = excluded.subject_id, title = excluded.title, requires = excluded.requires,
    main_character = excluded.main_character, main_scenes = excluded.main_scenes, retired = false;

  insert into public.scenes as x (id, topic_id, nodes, unlocks, retired)
  select r.id, r.topic_id, r.nodes, r.unlocks, false
  from jsonb_to_recordset(p -> 'scenes') as r(id text, topic_id text, nodes text[], unlocks text[])
  on conflict (id) do update set topic_id = excluded.topic_id, nodes = excluded.nodes, unlocks = excluded.unlocks, retired = false;

  insert into public.templates as x (id, topic_id, version, difficulty, starred, base_reward, retired)
  select r.id, r.topic_id, r.version, r.difficulty, r.starred, r.base_reward, false
  from jsonb_to_recordset(p -> 'templates') as r(id text, topic_id text, version int, difficulty int, starred boolean, base_reward int)
  on conflict (id) do update set topic_id = excluded.topic_id, version = excluded.version, difficulty = excluded.difficulty,
    starred = excluded.starred, base_reward = excluded.base_reward, retired = false;

  insert into public.characters as x (id, name, rarity, subject_id, topics, retired)
  select r.id, r.name, r.rarity, r.subject_id, r.topics, false
  from jsonb_to_recordset(p -> 'characters') as r(id text, name text, rarity int, subject_id text, topics text[])
  on conflict (id) do update set name = excluded.name, rarity = excluded.rarity, subject_id = excluded.subject_id,
    topics = excluded.topics, retired = false;

  insert into public.banners as x (id, subject_id, pity_group, rate_5, rate_4, rate_3, retired)
  select r.id, r.subject_id, r.pity_group, r.rate_5, r.rate_4, r.rate_3, false
  from jsonb_to_recordset(p -> 'banners') as r(id text, subject_id text, pity_group text, rate_5 numeric, rate_4 numeric, rate_3 numeric)
  on conflict (id) do update set subject_id = excluded.subject_id, pity_group = excluded.pity_group,
    rate_5 = excluded.rate_5, rate_4 = excluded.rate_4, rate_3 = excluded.rate_3, retired = false;

  -- Pool membership is not referenced by player rows, so it is replaced wholesale.
  delete from public.banner_items where true;  -- PostgREST safeupdate rejects bare DELETE
  insert into public.banner_items (banner_id, character_id, rarity)
  select r.banner_id, r.character_id, r.rarity
  from jsonb_to_recordset(p -> 'banner_items') as r(banner_id text, character_id text, rarity int);

  update public.subjects set retired = true where id not in (select jsonb_array_elements(p -> 'subjects') ->> 'id');
  update public.topics set retired = true where id not in (select jsonb_array_elements(p -> 'topics') ->> 'id');
  update public.scenes set retired = true where id not in (select jsonb_array_elements(p -> 'scenes') ->> 'id');
  update public.templates set retired = true where id not in (select jsonb_array_elements(p -> 'templates') ->> 'id');
  update public.characters set retired = true where id not in (select jsonb_array_elements(p -> 'characters') ->> 'id');
  update public.banners set retired = true where id not in (select jsonb_array_elements(p -> 'banners') ->> 'id');

  return jsonb_build_object(
    'topics', jsonb_array_length(p -> 'topics'), 'scenes', jsonb_array_length(p -> 'scenes'),
    'templates', jsonb_array_length(p -> 'templates'), 'characters', jsonb_array_length(p -> 'characters'),
    'banners', jsonb_array_length(p -> 'banners'));
end $$;

revoke all on function public.sync_content(jsonb) from public, anon, authenticated;
grant execute on function public.sync_content(jsonb) to service_role;

revoke all on all functions in schema internal from public, anon, authenticated;
