import { Link } from 'react-router';
import { content } from '../content/bundle.ts';
import { usePlayer } from '../lib/player.tsx';
import { IconBook, IconCards, IconWish } from '../ui/Icons.tsx';
import { Portrait, Stars } from '../ui/Portrait.tsx';
import { rarityOf } from '../ui/rarity.ts';

/** Home screen: the player's "assistant" heroine on stage and the main menu tiles. */
export function Lobby() {
  const { owned, progress, profile } = usePlayer();
  const ownedIds = Object.keys(owned);
  // The assistant is the rarest owned heroine, or the first topic's guide for newcomers.
  const assistant =
    [...ownedIds].sort((a, b) => (content.characters[b]?.rarity ?? 0) - (content.characters[a]?.rarity ?? 0))[0] ??
    Object.values(content.topics)[0]?.main_character ??
    Object.keys(content.characters)[0]!;
  const ch = content.characters[assistant]!;
  const r = rarityOf(ch.rarity);
  const topics = Object.keys(content.topics);
  const doneTopics = topics.filter((t) => progress.topics[t] === 'completed').length;
  const banner = Object.values(content.banners)[0];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
      <section className="relative flex min-h-[26rem] items-end justify-center lg:min-h-[34rem]">
        <div
          className="absolute top-1/2 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 animate-spin-slow rounded-full opacity-40 blur-2xl"
          style={{ background: `conic-gradient(from 0deg, ${r.glow}, #ff7aa6, #7c6cff, ${r.glow})` }}
        />
        <Portrait id={assistant} variant="stage" className="relative h-[26rem] w-72 animate-float lg:h-[34rem] lg:w-80" />
        <div className="panel absolute top-6 left-0 max-w-[16rem] animate-rise p-4 text-sm sm:left-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="title-display text-base" style={{ color: r.glow }}>
              {ch.name}
            </span>
            <Stars n={ch.rarity} className="text-xs" />
          </div>
          <p className="text-white/80">{ch.description ?? 'Привет! Готова учиться?'}</p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold tracking-widest text-sakura-300 uppercase">Академия</p>
          <h1 className="title-display text-3xl sm:text-4xl">
            {profile ? `С возвращением, ${profile.nickname}!` : 'Добро пожаловать!'}
          </h1>
        </div>
        <MenuTile
          to="/study"
          icon={<IconBook className="h-8 w-8" />}
          title="Учёба"
          subtitle="Сюжет с героинями и задачи за валюту"
          meta={`Пройдено тем: ${doneTopics} / ${topics.length}`}
          accent="from-sakura-500/40 to-sakura-500/0"
        />
        <MenuTile
          to="/gacha"
          icon={<IconWish className="h-8 w-8" />}
          title="Призыв"
          subtitle={banner?.title ?? 'Баннеры'}
          meta={`Шанс 5★ ${((banner?.rates[5] ?? 0) * 100).toFixed(1)}% · гарантия на ${content.economy.pity.five_star}-й`}
          accent="from-gold-500/40 to-gold-500/0"
        />
        <MenuTile
          to="/collection"
          icon={<IconCards className="h-8 w-8" />}
          title="Коллекция"
          subtitle="Героини, созвездия и симпатия"
          meta={`Собрано: ${ownedIds.length} / ${Object.keys(content.characters).length}`}
          accent="from-r4/40 to-r4/0"
        />
      </section>
    </div>
  );
}

function MenuTile(props: { to: string; icon: React.ReactNode; title: string; subtitle: string; meta: string; accent: string }) {
  return (
    <Link to={props.to} className="panel panel-hover group relative flex items-center gap-4 overflow-hidden p-5">
      <div className={`absolute inset-y-0 left-0 w-2/3 bg-gradient-to-r ${props.accent} opacity-60 transition group-hover:opacity-100`} />
      <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">{props.icon}</div>
      <div className="relative">
        <div className="title-display text-xl">{props.title}</div>
        <div className="text-sm text-white/70">{props.subtitle}</div>
        <div className="mt-1 text-xs font-bold text-white/50">{props.meta}</div>
      </div>
      <span className="relative ml-auto text-2xl text-white/40 transition group-hover:translate-x-1 group-hover:text-white">›</span>
    </Link>
  );
}
