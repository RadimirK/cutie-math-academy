import { useCallback, useEffect, useState } from 'react';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { rpcErrorMessage, supabase } from '../lib/supabase.ts';
import { Gem } from '../ui/Icons.tsx';
import { Portrait, Stars } from '../ui/Portrait.tsx';
import { rarityOf } from '../ui/rarity.ts';
import { WishOverlay, type PullResult } from '../ui/WishOverlay.tsx';

export function Gacha() {
  const { demo, profile, refresh } = usePlayer();
  const banners = Object.values(content.banners);
  const [bannerId, setBannerId] = useState(banners[0]?.id);
  const banner = banners.find((b) => b.id === bannerId);
  const [results, setResults] = useState<PullResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [pity, setPity] = useState({ since_5: 0, since_4: 0 });
  const eco = content.economy;
  const cost = eco.pull_cost;
  const pityGroup = banner ? (banner.pity_group ?? banner.id) : '';

  const loadPity = useCallback(async () => {
    if (!supabase || !pityGroup) return;
    const { data } = await supabase.from('pity_state').select('since_5, since_4').eq('pity_group', pityGroup).maybeSingle();
    setPity(data ?? { since_5: 0, since_4: 0 });
  }, [pityGroup]);
  useEffect(() => {
    void loadPity();
  }, [loadPity]);

  if (!banner) return <p>Баннеров пока нет.</p>;

  async function pull(count: 1 | 10) {
    if (!supabase || !banner) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc('pull', { p_banner_id: banner.id, p_count: count });
    setBusy(false);
    if (error) return setError(rpcErrorMessage(error.message));
    setResults(data as PullResult[]);
    void refresh();
    void loadPity();
  }

  const balance = profile?.currency ?? 0;
  const featured = banner.pool[5];
  const toFive = eco.pity.five_star - pity.since_5;

  return (
    <div>
      {banners.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {banners.map((b) => (
            <button key={b.id} onClick={() => setBannerId(b.id)} className={`btn-ghost shrink-0 ${b.id === bannerId ? '!border-white/50 !bg-white/10 !text-white' : ''}`}>
              {b.title}
            </button>
          ))}
        </div>
      )}

      <section className="relative min-h-[30rem] overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_20px_80px_-20px_rgb(247_80_127/0.5)]">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 75% 40%, rgb(255 194 77 / 0.45), transparent 45%), radial-gradient(circle at 20% 90%, rgb(247 80 127 / 0.5), transparent 50%), linear-gradient(135deg, #2a1a6e, #5b2a8a 50%, #1a1748)',
          }}
        />
        <div className="rays absolute top-[40%] left-[72%] h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-25" style={{ ['--ray' as string]: '#ffe09a' }} />

        {/* featured characters */}
        <div className="absolute right-0 bottom-0 flex items-end">
          {banner.pool[4].slice(0, 2).map((id) => (
            <Portrait key={id} id={id} variant="stage" className="-mr-16 hidden h-72 w-44 opacity-70 md:block" />
          ))}
          {featured.map((id, i) => (
            <Portrait key={id} id={id} variant="stage" className={`h-[26rem] w-60 ${i > 0 ? '-ml-24 hidden sm:block' : ''} animate-float`} style={{ animationDelay: `${i * -1.7}s` }} />
          ))}
        </div>

        <div className="relative flex min-h-[30rem] flex-col p-6 sm:p-8">
          <span className="chip w-fit bg-white/15 text-white/90 ring-1 ring-white/25">
            {content.subjects[banner.subject]?.title ?? banner.subject} · постоянный баннер
          </span>
          <h1 className="title-display mt-3 max-w-md text-4xl leading-tight drop-shadow-[0_4px_20px_rgb(0_0_0/0.5)] sm:text-5xl">{banner.title}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {featured.map((id) => (
              <span key={id} className="chip bg-night-950/60 py-1 text-sm text-gold-200 ring-1 ring-gold-400/50">
                <Stars n={5} className="text-xs" /> {content.characters[id]?.name}
              </span>
            ))}
          </div>

          <div className="panel mt-6 max-w-xs p-4 text-sm !bg-night-950/50">
            <div className="flex justify-between font-bold">
              <span>До гарантии 5★</span>
              <span className="text-gold-300">{demo ? eco.pity.five_star : toFive}</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sakura-400 to-gold-300"
                style={{ width: `${(pity.since_5 / eco.pity.five_star) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/60">
              5★ {(banner.rates[5] * 100).toFixed(1)}% · 4★ {(banner.rates[4] * 100).toFixed(1)}% · 4★ и выше не реже чем раз в {eco.pity.four_star}
            </p>
            <button onClick={() => setShowPool((v) => !v)} className="mt-2 text-xs font-bold text-sakura-300 underline-offset-2 hover:underline">
              {showPool ? 'скрыть состав' : 'состав баннера'}
            </button>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-end gap-3 pt-8">
            {demo && <p className="mr-auto self-center text-sm text-white/60">В демо-режиме без Supabase призыв недоступен.</p>}
            {([1, 10] as const).map((n) => (
              <button
                key={n}
                disabled={demo || busy || balance < cost * n}
                onClick={() => void pull(n)}
                className={`${n === 10 ? 'btn-gold' : 'btn-pink'} min-w-40 flex-col !gap-0 !py-2`}
              >
                <span className="font-display text-base">Призыв ×{n}</span>
                <span className="flex items-center gap-1 text-xs opacity-80">
                  <Gem className="h-3.5 w-3.5" /> {cost * n}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="mt-4 rounded-2xl bg-red-500/15 p-3 text-red-200 ring-1 ring-red-400/40">{error}</p>}

      {showPool && (
        <section className="panel mt-6 animate-fade p-5">
          <h2 className="title-display mb-3 text-lg">Состав баннера</h2>
          {([5, 4, 3] as const).map((rar) => (
            <div key={rar} className="mb-3 flex flex-wrap items-center gap-3">
              <span className={`w-24 font-bold ${rarityOf(rar).text}`}>
                {rar}★ · {(banner.rates[rar] * 100).toFixed(1)}%
              </span>
              {banner.pool[rar].map((id) => (
                <span key={id} className="flex items-center gap-2 rounded-full bg-white/5 py-1 pr-3 pl-1 text-sm">
                  <Portrait id={id} className="h-7 w-7 rounded-full" />
                  {content.characters[id]?.name}
                </span>
              ))}
            </div>
          ))}
        </section>
      )}

      {results && <WishOverlay results={results} onClose={() => setResults(null)} />}
    </div>
  );
}
