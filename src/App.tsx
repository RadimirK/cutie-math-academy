import { HashRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { contentIssues } from './content/bundle.ts';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Gem, IconBook, IconCards, IconWish } from './ui/Icons.tsx';
import { PlayerProvider, usePlayer } from './lib/player.tsx';
import { AuthScreen } from './screens/Auth.tsx';
import { Collection } from './screens/Collection.tsx';
import { Gacha } from './screens/Gacha.tsx';
import { Lobby } from './screens/Lobby.tsx';
import { Study } from './screens/Study.tsx';
import { ProblemScreen } from './screens/Problem.tsx';
import { ScenePlayer } from './screens/ScenePlayer.tsx';
import { SubjectMap } from './screens/SubjectMap.tsx';
import { TopicPage } from './screens/TopicPage.tsx';

export function App() {
  return (
    <PlayerProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<AuthScreen mode="login" />} />
          <Route path="/register" element={<AuthScreen mode="register" />} />
          <Route element={<RequirePlayer />}>
            <Route path="/scene/:sceneId" element={<ScenePlayer />} />
            <Route element={<Layout />}>
              <Route index element={<Lobby />} />
              <Route path="/study" element={<Study />} />
              <Route path="/subject/:subjectId" element={<SubjectMap />} />
              <Route path="/topic/:topicId" element={<TopicPage />} />
              <Route path="/problem/:templateId" element={<ProblemScreen />} />
              <Route path="/gacha" element={<Gacha />} />
              <Route path="/collection" element={<Collection />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </PlayerProvider>
  );
}

function RequirePlayer() {
  const { demo, loading, session, profile } = usePlayer();
  const location = useLocation();
  if (demo) return <Outlet />;
  if (loading) return <div className="p-8 text-center text-white/60">Загрузка…</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!profile) return <Navigate to="/register" replace />;
  return <Outlet />;
}

function Layout() {
  const { demo, profile, signOut } = usePlayer();
  const { pathname } = useLocation();
  const inStudy = /^\/(study|subject|topic|problem)\b/.test(pathname);
  const link = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${
      isActive ? 'bg-white/12 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
    }`;
  const errors = contentIssues.filter((i) => i.level === 'error');
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4">
      <header className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-3 border-b border-white/10 bg-night-950/60 px-4 py-2.5 backdrop-blur-lg">
        <Link to="/" className="title-display text-gradient mr-2 animate-shimmer text-lg">
          Cutie Math Academy
        </Link>
        <nav className="flex flex-wrap gap-1">
          <NavLink to="/study" className={(a) => link({ isActive: a.isActive || inStudy })}>
            <IconBook className="h-4 w-4" /> Учёба
          </NavLink>
          <NavLink to="/gacha" className={link}>
            <IconWish className="h-4 w-4" /> Призыв
          </NavLink>
          <NavLink to="/collection" className={link}>
            <IconCards className="h-4 w-4" /> Коллекция
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {demo ? (
            <span className="chip bg-gold-400/15 py-1 text-gold-300 ring-1 ring-gold-400/40" title="Сборка без Supabase: прогресс не сохраняется">
              демо-режим
            </span>
          ) : (
            profile && (
              <>
                <span className="hidden font-bold text-white/80 sm:inline">{profile.nickname}</span>
                <CurrencyPill amount={profile.currency} />
                <button onClick={() => void signOut()} className="text-white/40 hover:text-white">
                  Выйти
                </button>
              </>
            )
          )}
        </div>
      </header>
      {errors.length > 0 && (
        <pre className="my-3 overflow-x-auto rounded-xl bg-red-500/15 p-3 text-xs text-red-200 ring-1 ring-red-400/40">
          {errors.map((i) => `content/${i.file}: ${i.message}`).join('\n')}
        </pre>
      )}
      <main className="flex-1 py-6">
        <ErrorBoundary resetKey={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export function CurrencyPill({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-night-950/70 py-1 pr-3 pl-1.5 font-display text-sm font-bold text-gold-200 ring-1 ring-gold-400/50 shadow-[0_0_16px_-4px_rgb(247_201_107/0.7)]">
      <Gem className="h-5 w-5" />
      {amount.toLocaleString('ru-RU')}
    </span>
  );
}
