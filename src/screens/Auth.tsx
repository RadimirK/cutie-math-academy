import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { usePlayer } from '../lib/player.tsx';
import { rpcErrorMessage, supabase } from '../lib/supabase.ts';

// Registration: signUp -> redeem_invite(code, nickname). A signed-in user without a profile
// (e.g. whose redeem failed) lands on the same form with only the invite fields.
export function AuthScreen({ mode }: { mode: 'login' | 'register' }) {
  const { demo, session, profile, refresh } = usePlayer();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (demo) return <Navigate to="/" replace />;
  if (session && profile) return <Navigate to="/" replace />;
  const needsInviteOnly = !!session && !profile;
  if (mode === 'login' && needsInviteOnly) return <Navigate to="/register" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        if (!needsInviteOnly) {
          const { error } = await supabase.auth.signUp({ email, password });
          if (error) throw error;
        }
        const { error } = await supabase.rpc('redeem_invite', { p_code: invite.trim(), p_nickname: nickname.trim() });
        if (error) throw new Error(rpcErrorMessage(error.message));
        await refresh();
      }
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = 'field';
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="title-display text-gradient mb-2 animate-shimmer text-center text-4xl drop-shadow-[0_0_30px_rgb(255_159_192/0.5)] sm:text-5xl">
        Cutie Math Academy
      </h1>
      <p className="mb-8 text-center text-white/60">учись · призывай · собирай героинь</p>
      <form onSubmit={submit} className="panel w-full max-w-sm animate-rise space-y-3 p-6">
        <p className="title-display text-center text-lg">{mode === 'login' ? 'Вход' : needsInviteOnly ? 'Активируй аккаунт инвайт-кодом' : 'Регистрация по инвайту'}</p>
        {!needsInviteOnly && (
          <>
            <input className={input} type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className={input} type="password" placeholder="пароль" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </>
        )}
        {mode === 'register' && (
          <>
            <input className={input} placeholder="ник" minLength={2} maxLength={24} value={nickname} onChange={(e) => setNickname(e.target.value)} required />
            <input className={input} placeholder="инвайт-код" value={invite} onChange={(e) => setInvite(e.target.value)} required />
          </>
        )}
        {error && <p className="rounded-xl bg-red-500/15 p-2 text-sm text-red-200 ring-1 ring-red-400/40">{error}</p>}
        <button disabled={busy} className="btn-gold w-full">
          {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
        </button>
        {!needsInviteOnly && (
          <p className="text-center text-sm">
            {mode === 'login' ? (
              <Link to="/register" className="text-sakura-300 underline-offset-2 hover:underline">
                У меня есть инвайт
              </Link>
            ) : (
              <Link to="/login" className="text-sakura-300 underline-offset-2 hover:underline">
                Уже есть аккаунт
              </Link>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
