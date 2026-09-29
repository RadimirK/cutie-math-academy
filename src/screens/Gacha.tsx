import { useCallback, useEffect, useState } from 'react';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { rpcErrorMessage, supabase } from '../lib/supabase.ts';
import { Gem } from '../ui/Icons.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';
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

  if (!banner) return <p>Наборов пока нет.</p>;

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
      <PageHeader back="/" backLabel="Лобби" kicker="Recruitment" title="Набор учениц" />
      {banners.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto">
          {banners.map((b) => (
            <button key={b.id} onClick={() => setBannerId(b.id)} className={`${b.id === bannerId ? 'btn-blue' : 'btn-ghost'} shrink-0`}>
              {b.title}
            </button>
          ))}
        </div>
      )}

      <section className="relative min-h-[30rem] overflow-hidden rounded-xl border-2 border-white shadow-[0_20px_60px_-24px_rgb(18_140_255/0.7)]">
        <div className="sky absolute inset-0" />
        {/* diagonal banner stripes */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(115deg, transparent 0 52%, rgb(255 255 255 / 0.55) 52% 60%, transparent 60% 64%, rgb(255 219 46 / 0.35) 64% 66%, transparent 66%)' }}
        />
        <div className="rays absolute top-[40%] left-[72%] h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow opacity-30" style={{ ['--ray' as string]: '#ffffff' }} />

        {/* featured characters */}
        <div className="absolute right-0 bottom-0 flex items-end">
          {banner.pool[4].slice(0, 2).map((id) => (
            <Portrait key={id} id={id} variant="stage" className="-mr-16 hidden h-72 w-44 opacity-80 md:block" />
          ))}
          {featured.map((id, i) => (
            <Portrait key={id} id={id} variant="stage" className={`h-[26rem] w-60 ${i > 0 ? '-ml-24 hidden sm:block' : ''} animate-float`} style={{ animationDelay: `${i * -1.7}s` }} />
          ))}
        </div>

        <div className="relative flex min-h-[30rem] flex-col p-6 sm:p-8">
          <span className="plate w-fit font-display text-xs font-bold tracking-widest uppercase">
            <span>{content.subjects[banner.subject]?.title ?? banner.subject} · постоянный набор</span>
          </span>
          <h2 className="title-display mt-3 max-w-md text-4xl leading-tight text-ink-900 [text-shadow:0_2px_0_#fff,0_0_18px_#fff] sm:text-5xl">{banner.title}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {featured.map((id) => (
              <span key={id} className="chip bg-white/90 py-1 text-sm text-ink-900 shadow-sm">
                <Stars n={5} className="text-xs" /> {content.characters[id]?.name}
              </span>
            ))}
          </div>

          <div className="mt-6 max-w-xs rounded-md bg-white/90 p-4 text-sm shadow-md backdrop-blur-sm">
            <div className="flex justify-between font-bold text-ink-900">
              <span>До гарантии 5★</span>
              <span className="font-display text-ba-600">{demo ? eco.pity.five_star : toFive}</span>
            </div>
            <div className="mt-2 h-2.5 -skew-x-12 overflow-hidden bg-ink-100">
              <div className="h-full bg-gradient-to-r from-ba-400 to-momo-400" style={{ width: `${(pity.since_5 / eco.pity.five_star) * 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              5★ {(banner.rates[5] * 100).toFixed(1)}% · 4★ {(banner.rates[4] * 100).toFixed(1)}% · 4★ и выше не реже чем раз в {eco.pity.four_star}
            </p>
            <button onClick={() => setShowPool((v) => !v)} className="mt-2 text-xs font-bold text-ba-500 underline-offset-2 hover:underline">
              {showPool ? 'скрыть состав' : 'состав набора'}
            </button>
          </div>

          <div className="mt-auto flex flex-wrap items-end justify-end gap-3 pt-8">
            {demo && <p className="mr-auto self-center rounded bg-white/80 px-2 py-1 text-sm font-bold text-ink-700">В демо-режиме без Supabase набор недоступен.</p>}
            {([1, 10] as const).map((n) => (
              <button
                key={n}
                disabled={demo || busy || balance < cost * n}
                onClick={() => void pull(n)}
                className={`${n === 10 ? 'btn-gold' : 'btn-blue'} min-w-44 flex-col !gap-0 !py-2.5 shadow-lg`}
              >
                <span className="text-lg italic">Набор ×{n}</span>
                <span className="flex items-center gap-1 text-xs">
                  <Gem className="h-3.5 w-3.5" /> {cost * n}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-red-700 ring-1 ring-red-200">{error}</p>}

      {showPool && (
        <section className="panel mt-6 animate-fade p-5">
          <h2 className="title-display mb-3 text-lg text-ink-900">Состав набора</h2>
          {([5, 4, 3] as const).map((rar) => (
            <div key={rar} className="mb-3 flex flex-wrap items-center gap-3">
              <span className={`w-24 font-display font-extrabold ${rarityOf(rar).text}`}>
                {rar}★ · {(banner.rates[rar] * 100).toFixed(1)}%
              </span>
              {banner.pool[rar].map((id) => (
                <span key={id} className="flex items-center gap-2 rounded-full bg-ba-50 py-1 pr-3 pl-1 text-sm font-bold text-ink-900 ring-1 ring-ink-100">
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
