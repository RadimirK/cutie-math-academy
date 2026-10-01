import { HashRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router';
import { contentIssues } from './content/bundle.ts';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import { Gem, IconBook, IconCards, IconWish } from './ui/Icons.tsx';
import { Logo } from './ui/Logo.tsx';
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
  if (loading) return <div className="p-8 text-center font-bold text-ink-500">Загрузка…</div>;
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!profile) return <Navigate to="/register" replace />;
  return <Outlet />;
}

function Layout() {
  const { demo, profile, signOut } = usePlayer();
  const { pathname } = useLocation();
  const inStudy = /^\/(study|subject|topic|problem)\b/.test(pathname);
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex -skew-x-12 items-center px-4 py-1.5 font-display text-sm font-bold transition-colors ${
      isActive ? 'bg-ba-500 text-white' : 'text-ink-700 hover:bg-ba-100 hover:text-ba-700'
    }`;
  const errors = contentIssues.filter((i) => i.level === 'error');
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b pt-1 border-ink-100 bg-white/85 shadow-[0_2px_12px_-6px_rgb(28_47_74/0.25)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <Logo />
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/study" className={(a) => link({ isActive: a.isActive || inStudy })}>
              <span className="flex skew-x-12 items-center gap-1.5">
                <IconBook className="h-4 w-4" /> Учёба
              </span>
            </NavLink>
            <NavLink to="/gacha" className={link}>
              <span className="flex skew-x-12 items-center gap-1.5">
                <IconWish className="h-4 w-4" /> Набор
              </span>
            </NavLink>
            <NavLink to="/collection" className={link}>
              <span className="flex skew-x-12 items-center gap-1.5">
                <IconCards className="h-4 w-4" /> Героини
              </span>
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            {demo ? (
              <span className="chip bg-gold-100 py-1 text-ink-700 ring-1 ring-gold-400" title="Сборка без Supabase: прогресс не сохраняется">
                демо-режим
              </span>
            ) : (
              profile && (
                <>
                  <span className="hidden font-bold text-ink-700 sm:inline">
                    <span className="mr-1 text-ba-500">Ученик</span>
                    {profile.nickname}
                  </span>
                  <CurrencyPill amount={profile.currency} />
                  <button onClick={() => void signOut()} className="font-bold text-ink-300 hover:text-ink-700">
                    Выйти
                  </button>
                </>
              )
            )}
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4">
        {errors.length > 0 && (
          <pre className="my-3 overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-300">
            {errors.map((i) => `content/${i.file}: ${i.message}`).join('\n')}
          </pre>
        )}
        <main className="py-6">
          <ErrorBoundary resetKey={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export function CurrencyPill({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-ink-100 bg-white font-display text-sm font-extrabold text-ink-900 shadow-sm">
      <span className="flex items-center gap-1.5 py-1 pr-3 pl-1.5">
        <Gem className="h-5 w-5" />
        {amount.toLocaleString('ru-RU')}
      </span>
      <Link to="/study" title="Заработать: решай задачи" className="grid h-7 w-7 place-items-center bg-gold-400 text-base leading-none text-ink-900 hover:bg-gold-300">
        +
      </Link>
    </span>
  );
}
