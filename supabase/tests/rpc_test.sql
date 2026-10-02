-- Scenario test of RLS and RPCs. Run with supabase/tests/run.sh against a scratch database.
\set ON_ERROR_STOP 1
\set QUIET 1
\o /dev/null

-- Asserts that a statement fails with a message containing `expected`.
create function pg_temp.expect_error(stmt text, expected text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'expected error "%" from: %', expected, stmt;
exception when others then
  if position(expected in sqlerrm) = 0 then
    raise exception 'expected error "%" but got "%" from: %', expected, sqlerrm, stmt;
  end if;
end $$;
grant execute on function pg_temp.expect_error(text, text) to public;

create function pg_temp.check(cond boolean, what text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'check failed: %', what; end if;
end $$;
grant execute on function pg_temp.check(boolean, text) to public;

-- ---------- content sync ----------
set role service_role;
select public.sync_content(:'payload'::jsonb) as synced \gset
reset role;
select pg_temp.check((select count(*) from public.templates) = jsonb_array_length(:'payload'::jsonb -> 'templates'), 'templates synced');
select pg_temp.check((select base_reward from public.templates where id = 'calculus.seq_limits.lim_basic_2') = 80, 'base reward');

set role authenticated;
select pg_temp.expect_error($$select public.sync_content('{}'::jsonb)$$, 'permission denied');
reset role;

-- ---------- users and invites ----------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@x'),
  ('00000000-0000-0000-0000-00000000000b', 'b@x'),
  ('00000000-0000-0000-0000-00000000000c', 'c@x');
insert into public.invites (code) values ('INV-A'), ('INV-B');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
select pg_temp.expect_error($$select * from public.issue_problem('calculus.seq_limits.lim_basic_2')$$, 'invite not redeemed');
select pg_temp.expect_error($$select public.redeem_invite('NOPE', 'mallory')$$, 'invalid invite code');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.redeem_invite('INV-A', 'alice');
select pg_temp.expect_error($$select public.redeem_invite('INV-B', 'alice2')$$, 'already redeemed');
select pg_temp.check((select currency from public.profiles) = 1600, 'starting currency');
select pg_temp.expect_error($$update public.profiles set currency = 999999$$, 'permission denied');
select pg_temp.expect_error($$insert into public.currency_ledger (user_id, delta, reason) values (auth.uid(), 5, 'admin')$$, 'permission denied');
select pg_temp.expect_error($$select * from public.invites$$, 'permission denied');
update public.profiles set nickname = 'Alice';

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_error($$select public.redeem_invite('INV-A', 'bob')$$, 'invalid invite code');
select pg_temp.expect_error($$select public.redeem_invite('INV-B', 'alice')$$, 'nickname taken');
select public.redeem_invite('INV-B', 'bob');

-- ---------- scenes unlock problems ----------
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.expect_error($$select * from public.issue_problem('calculus.seq_limits.lim_basic_2')$$, 'template locked');
select pg_temp.expect_error($$select * from public.complete_scene('calculus.seq_limits.cauchy_01', 'nowhere')$$, 'unknown node');
select * from public.complete_scene('calculus.seq_limits.cauchy_01', 'start');
select pg_temp.check(exists (select 1 from public.owned_characters where character_id = 'cauchy'), 'main character granted');
select pg_temp.check((select status from public.scene_progress) = 'in_progress', 'scene in progress');
select * from public.complete_scene('calculus.seq_limits.cauchy_01', 'right', true);
select * from public.complete_scene('calculus.seq_limits.cauchy_01', 'start');  -- replay keeps completion
select pg_temp.check((select status from public.scene_progress) = 'completed', 'scene stays completed');
select pg_temp.check((select status from public.topic_progress) = 'in_progress', 'topic in progress');

-- ---------- solving ----------
select id as p1 from public.issue_problem('calculus.seq_limits.lim_basic_2') \gset
select pg_temp.check((select id from public.issue_problem('calculus.seq_limits.lim_basic_2')) = :'p1', 'open problem reused');
select pg_temp.check((select id from public.issue_problem('calculus.seq_limits.lim_basic_2', true)) <> :'p1', 'fresh problem');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.expect_error(format('select * from public.submit_solution(%L)', :'p1'), 'problem not issued to you');
select pg_temp.check((select count(*) from public.issued_problems) = 0, 'bob cannot see alice problems');

set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select pg_temp.check((select reward from public.submit_solution(:'p1')) = 80, 'first reward');
select pg_temp.expect_error(format('select * from public.submit_solution(%L)', :'p1'), 'already solved');
select pg_temp.check((select affection from public.owned_characters where character_id = 'cauchy') = 1, 'affection grows');
select pg_temp.expect_error($$select * from public.complete_scene('calculus.seq_limits.cauchy_bond_1', 'start')$$, 'scene locked');

-- Decay: solves 2..5 pay 80, 6..15 pay 40.
create temp table rewards (n int, reward int);
grant all on rewards to authenticated;
do $$
declare pid uuid;
begin
  for n in 2..8 loop
    select id into pid from public.issue_problem('calculus.seq_limits.lim_basic_2', true);
    insert into rewards select n, reward from public.submit_solution(pid);
  end loop;
end $$;
select pg_temp.check((select array_agg(reward order by n) from rewards) = array[80, 80, 80, 80, 40, 40, 40], 'decay');

-- Daily cap: 8 solves so far = 80*5 + 40*3 = 520 of the 1600 cap.
reset role;
update public.economy set daily_cap_amount = 540;
set role authenticated;
truncate rewards;
do $$
declare pid uuid;
begin
  for n in 9..10 loop
    select id into pid from public.issue_problem('calculus.seq_limits.lim_basic_2', true);
    insert into rewards select n, reward from public.submit_solution(pid);
  end loop;
end $$;
select pg_temp.check((select array_agg(reward order by n) from rewards) = array[20, 0], 'daily cap');
reset role;
update public.economy set daily_cap_amount = 1600;
set role authenticated;

select pg_temp.check((select currency from public.profiles) = 1600 + 540, 'balance = start + rewards');

-- ---------- affection scenes ----------
-- Ten solves of difficulty 1 bring Cauchy to her threshold of 10.
select pg_temp.check((select affection from public.owned_characters where character_id = 'cauchy') = 10, 'affection after ten solves');
select pg_temp.check((select affection_threshold from public.scenes where id = 'calculus.seq_limits.cauchy_bond_1') = 10, 'gate synced');
select pg_temp.check((select scene_status from public.complete_scene('calculus.seq_limits.cauchy_bond_1', 'start', true)) = 'completed', 'affection scene opens');
select pg_temp.check((select currency from public.profiles) = (select sum(delta) from public.currency_ledger), 'balance matches ledger');

-- ---------- gacha ----------
-- The 5★ rate is zeroed so that pity behaviour is deterministic.
reset role;
update public.banners set rate_5 = 0, rate_3 = rate_3 + rate_5 where id = 'calculus_standard';
set role authenticated;
select pg_temp.expect_error($$select * from public.pull('calculus_standard', 5)$$, 'count must be 1 or 10');
select pg_temp.check((select count(*) from public.pull('calculus_standard', 10)) = 10, 'x10 returns 10');
select pg_temp.check((select max(rarity) from public.pulls) >= 4, '4★ guarantee within 10');
select pg_temp.expect_error($$select * from public.pull('calculus_standard', 10)$$, 'not enough currency');

-- 5★ pity: the 70th pull is 5★, never earlier.
reset role;
select internal.add_currency('00000000-0000-0000-0000-00000000000a', 160 * 200, 'admin', 'test');
set role authenticated;
do $$
begin
  for i in 1..5 loop perform public.pull('calculus_standard', 10); end loop;
  for i in 1..9 loop perform public.pull('calculus_standard', 1); end loop;
end $$;
select pg_temp.check((select count(*) from public.pulls where rarity = 5) = 0, 'no 5★ before pity');
select pg_temp.check((select since_5 from public.pity_state) = 69, 'pity counter');
select pg_temp.check((select rarity from public.pull('calculus_standard', 1)) = 5, '70th pull is 5★');
select pg_temp.check((select since_5 from public.pity_state) = 0, 'pity reset');
select pg_temp.check((select bool_and(n <= 10) from (
  select id - lag(id) over (order by id) as n from public.pulls where rarity >= 4) gaps), '4★+ at least every 10 pulls');

-- Constellations cap at C6, extra copies are refunded.
do $$ begin for i in 1..10 loop perform public.pull('calculus_standard', 10); end loop; end $$;
select pg_temp.check((select max(copies) from public.owned_characters) = 7, 'C6 cap');
select pg_temp.check(exists (select 1 from public.currency_ledger where reason = 'duplicate'), 'duplicate refund');
select pg_temp.check((select currency from public.profiles) = (select sum(delta) from public.currency_ledger), 'balance matches ledger after pulls');

-- Heroines bound to no topic take to every topic of their subject.
select id as p2 from public.issue_problem('calculus.seq_limits.lim_basic_2', true) \gset
select * from public.submit_solution(:'p2');
create temp view subject_heroines as
  select oc.affection from public.owned_characters oc join public.characters c on c.id = oc.character_id
  where cardinality(c.topics) = 0;
grant select on subject_heroines to authenticated;
select pg_temp.check((select count(*) from subject_heroines) > 0 and (select bool_and(affection = 1) from subject_heroines), 'subject heroines gain affection');

-- ---------- social ----------
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select pg_temp.check((select count(*) from public.owned_characters) = 0, 'bob sees only own characters');
select pg_temp.check((select count(*) from public.profiles) = 1, 'bob sees only own profile');
select pg_temp.check((select count(*) from public.leaderboard) = 2, 'leaderboard lists everyone');
select pg_temp.check((select score from public.leaderboard where nickname = 'Alice') = 11, 'leaderboard score');
select pg_temp.check(exists (select 1 from public.events where kind = 'pull_5' and payload ->> 'nickname' = 'Alice'), 'feed event');

set role anon;
select pg_temp.expect_error($$select * from public.pull('calculus_standard', 1)$$, 'permission denied');
select pg_temp.expect_error($$select * from public.leaderboard$$, 'permission denied');
select pg_temp.check(public.ping() is not null, 'ping');
reset role;

-- ---------- retiring ----------
set role service_role;
select public.sync_content(jsonb_set(:'payload'::jsonb, '{templates}',
  (select jsonb_agg(t) from jsonb_array_elements(:'payload'::jsonb -> 'templates') t where t ->> 'id' <> 'calculus.seq_limits.lim_power_sum'))) as resynced \gset
reset role;
select pg_temp.check((select retired from public.templates where id = 'calculus.seq_limits.lim_power_sum'), 'missing template retired');

\o
\echo 'rpc_test: all checks passed'
