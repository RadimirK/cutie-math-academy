import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { usePlayer } from '../lib/player.tsx';
import { rpcErrorMessage, supabase } from '../lib/supabase.ts';
import { Logo } from '../ui/Logo.tsx';

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
    <div className="sky flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 animate-rise">
        <Logo large />
      </div>
      <form onSubmit={submit} className="w-full max-w-sm animate-rise overflow-hidden rounded-lg bg-white/95 shadow-[0_20px_50px_-20px_rgb(18_140_255/0.7)]">
        <div className="bg-ba-500 px-6 py-2 font-display text-sm font-bold tracking-widest text-white uppercase italic">
          {mode === 'login' ? 'Вход для учеников' : needsInviteOnly ? 'Активация инвайт-кодом' : 'Регистрация по инвайту'}
        </div>
        <div className="space-y-3 p-6">
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
          {error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-700 ring-1 ring-red-200">{error}</p>}
          <button disabled={busy} className="btn-gold w-full !py-3 text-base">
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          {!needsInviteOnly && (
            <p className="text-center text-sm">
              {mode === 'login' ? (
                <Link to="/register" className="font-bold text-ba-500 underline-offset-2 hover:underline">
                  У меня есть инвайт
                </Link>
              ) : (
                <Link to="/login" className="font-bold text-ba-500 underline-offset-2 hover:underline">
                  Уже есть аккаунт
                </Link>
              )}
            </p>
          )}
        </div>
      </form>
      <p className="mt-6 font-bold text-ink-700 drop-shadow-[0_1px_0_#fff]">учись · призывай · собирай героинь</p>
    </div>
  );
}
