// Pushes the service copy of content into Supabase (public.sync_content, service_role only).
//   npx tsx scripts/sync-content.ts --print   # print the payload JSON
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/sync-content.ts
import { createClient } from '@supabase/supabase-js';
import type { Content } from '../src/content/load.ts';
import { loadOrDie } from './content-files.ts';

export function buildSyncPayload(c: Content) {
  const e = c.economy;
  const rewards = [1, 2, 3, 4, 5].map((d) => e.reward_by_difficulty[d as 1]);
  return {
    economy: {
      pull_cost: e.pull_cost,
      // Postgres arrays are 1-based: index = difficulty / rarity.
      reward_by_difficulty: rewards,
      decay: [...e.decay].sort((a, b) => a.after - b.after),
      daily_cap_max_difficulty: e.daily_cap.max_difficulty,
      daily_cap_amount: e.daily_cap.amount,
      daily_cap_timezone: e.daily_cap.timezone,
      pity_5: e.pity.five_star,
      pity_4: e.pity.four_star,
      max_constellation: e.duplicates.max_constellation,
      refund: [0, 0, e.duplicates.refund[3], e.duplicates.refund[4], e.duplicates.refund[5]],
      starting_currency: e.starting_currency,
    },
    subjects: Object.values(c.subjects).map((s) => ({ id: s.id, title: s.title, sort_order: s.order })),
    topics: Object.values(c.topics).map((t) => ({
      id: t.fullId,
      subject_id: t.subject,
      title: t.title,
      requires: t.requires,
      main_character: t.main_character,
      main_scenes: t.main_scenes,
    })),
    scenes: Object.values(c.scenes).map((s) => ({
      id: s.fullId,
      topic_id: s.topic,
      nodes: Object.keys(s.nodes),
      unlocks: s.unlocks,
    })),
    templates: Object.values(c.templates).map((t) => ({
      id: t.fullId,
      topic_id: t.topic,
      version: t.version,
      difficulty: t.difficulty,
      starred: t.starred,
      base_reward: rewards[t.difficulty - 1],
    })),
    characters: Object.values(c.characters).map((ch) => ({
      id: ch.id,
      name: ch.name,
      rarity: ch.rarity,
      subject_id: ch.subject,
      topics: ch.topics,
    })),
    banners: Object.values(c.banners).map((b) => ({
      id: b.id,
      subject_id: b.subject,
      pity_group: b.pity_group ?? b.id,
      rate_5: b.rates[5],
      rate_4: b.rates[4],
      rate_3: b.rates[3],
    })),
    banner_items: Object.values(c.banners).flatMap((b) =>
      ([3, 4, 5] as const).flatMap((r) => b.pool[r].map((id) => ({ banner_id: b.id, character_id: id, rarity: r }))),
    ),
  };
}

const payload = buildSyncPayload(loadOrDie());
if (process.argv.includes('--print')) {
  process.stdout.write(JSON.stringify(payload));
} else {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !key) {
    console.error('нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  let url: string;
  try {
    // Only the origin matters; a pasted trailing slash or /rest/v1 would break every request.
    url = new URL(rawUrl).origin;
  } catch {
    console.error('SUPABASE_URL должен выглядеть как https://<ref>.supabase.co');
    process.exit(1);
  }
  if (url !== rawUrl) console.log(`SUPABASE_URL приведён к ${url.replace(/\/\/[^.]+/, '//<ref>')}`);
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc('sync_content', { p: payload });
  if (error) {
    console.error('sync_content:', error.message);
    process.exit(1);
  }
  console.log('✓ контент синхронизирован:', data);
}
