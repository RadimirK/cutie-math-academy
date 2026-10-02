-- Affection scenes: a scene listed in a character's affection_scenes opens once the player
-- owns her with at least that much affection. Heroines bound to no topic in particular now
-- gain affection from every topic of their subject.

alter table public.scenes
  add column affection_character text,   -- no FK: sync_content writes scenes before characters
  add column affection_threshold int,
  add constraint scenes_affection_gate check ((affection_character is null) = (affection_threshold is null));

-- Writes the affection gate of scenes.
create or replace function public.sync_content(p jsonb) returns jsonb
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

  insert into public.scenes as x (id, topic_id, nodes, unlocks, affection_character, affection_threshold, retired)
  select r.id, r.topic_id, r.nodes, r.unlocks, r.affection_character, r.affection_threshold, false
  from jsonb_to_recordset(p -> 'scenes') as r(id text, topic_id text, nodes text[], unlocks text[],
                                              affection_character text, affection_threshold int)
  on conflict (id) do update set topic_id = excluded.topic_id, nodes = excluded.nodes, unlocks = excluded.unlocks,
    affection_character = excluded.affection_character, affection_threshold = excluded.affection_threshold, retired = false;

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

-- Refuses an affection scene until the heroine's affection reaches its threshold.
create or replace function public.complete_scene(p_scene_id text, p_node text, p_finished boolean default false)
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
  if sc.affection_character is not null and not exists (
    select 1 from public.owned_characters oc
    where oc.user_id = uid and oc.character_id = sc.affection_character and oc.affection >= sc.affection_threshold
  ) then raise exception 'scene locked'; end if;

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

-- Pays for a solved problem, at most once per issued problem.
create or replace function public.submit_solution(p_issued_id uuid)
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

  -- A heroine bound to no topic in particular takes to every topic of her subject.
  update public.owned_characters oc set affection = oc.affection + tpl.difficulty
  from public.characters c, public.topics t
  where oc.user_id = uid and c.id = oc.character_id and t.id = tpl.topic_id
    and (t.id = any (c.topics) or (cardinality(c.topics) = 0 and c.subject_id = t.subject_id));

  if amount > 0 then
    balance := internal.add_currency(uid, amount, 'solve', ip.id::text);
  else
    select p.currency into balance from public.profiles p where p.id = uid;
  end if;

  reward := amount; currency := balance; decay_factor := factor;
  return next;
end $$;
