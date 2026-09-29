import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
// Only the origin matters; a pasted trailing slash or /rest/v1 would break every request.
const url = rawUrl ? new URL(rawUrl).origin : undefined;

/** null when the build has no Supabase settings: the app then runs in demo mode without saving. */
export const supabase = url && anonKey ? createClient(url, anonKey) : null;

/** Turns Postgres exception texts from the RPCs into messages for players. */
export function rpcErrorMessage(message: string): string {
  const known: Record<string, string> = {
    'not signed in': 'Нужно войти в аккаунт.',
    'invite not redeemed': 'Аккаунт не активирован инвайт-кодом.',
    'invite already redeemed': 'Инвайт уже активирован.',
    'invalid invite code': 'Неверный или уже использованный инвайт-код.',
    'nickname taken': 'Этот ник уже занят.',
    'topic locked': 'Тема ещё закрыта.',
    'template locked': 'Эта задача ещё не открыта.',
    'already solved': 'Эта задача уже засчитана.',
    'not enough currency': 'Не хватает валюты.',
  };
  for (const [k, v] of Object.entries(known)) if (message.includes(k)) return v;
  return message;
}
