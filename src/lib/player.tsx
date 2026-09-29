// Player session and state. With Supabase configured, state is read from the database and
// changed only through RPCs; without it (demo mode) scene progress lives in memory.
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { content } from '../content/bundle.ts';
import { applySceneProgress, emptyProgress, type Progress } from '../core/progress.ts';
import { rpcErrorMessage, supabase } from './supabase.ts';

export interface Profile {
  id: string;
  nickname: string;
  currency: number;
}
export interface OwnedCharacter {
  character_id: string;
  copies: number;
  affection: number;
}

interface PlayerState {
  demo: boolean;
  loading: boolean;
  session: Session | null;
  /** null when signed in but the invite is not redeemed yet. */
  profile: Profile | null;
  progress: Progress;
  owned: Record<string, OwnedCharacter>;
  refresh(): Promise<void>;
  saveScene(sceneId: string, node: string, finished: boolean): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer outside PlayerProvider');
  return v;
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [owned, setOwned] = useState<Record<string, OwnedCharacter>>({});

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    if (!session) {
      setProfile(null);
      setProgress(emptyProgress);
      setOwned({});
      setLoading(false);
      return;
    }
    const [p, sp, tp, oc] = await Promise.all([
      supabase.from('profiles').select('id, nickname, currency').maybeSingle(),
      supabase.from('scene_progress').select('scene_id, node, status'),
      supabase.from('topic_progress').select('topic_id, status'),
      supabase.from('owned_characters').select('character_id, copies, affection'),
    ]);
    setProfile(p.data as Profile | null);
    setProgress({
      scenes: Object.fromEntries((sp.data ?? []).map((r) => [r.scene_id, { node: r.node, status: r.status }])),
      topics: Object.fromEntries((tp.data ?? []).map((r) => [r.topic_id, r.status])),
    });
    setOwned(Object.fromEntries((oc.data ?? []).map((r) => [r.character_id, r as OwnedCharacter])));
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveScene = useCallback(
    async (sceneId: string, node: string, finished: boolean) => {
      setProgress((p) => applySceneProgress(content, p, sceneId, node, finished));
      if (!supabase) {
        const topic = content.topics[content.scenes[sceneId]!.topic]!;
        setOwned((o) => (o[topic.main_character] ? o : { ...o, [topic.main_character]: { character_id: topic.main_character, copies: 1, affection: 0 } }));
        return;
      }
      const { error } = await supabase.rpc('complete_scene', { p_scene_id: sceneId, p_node: node, p_finished: finished });
      if (error) throw new Error(rpcErrorMessage(error.message));
      if (finished) await refresh();
    },
    [refresh],
  );

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = useMemo<PlayerState>(
    () => ({ demo: !supabase, loading, session, profile, progress, owned, refresh, saveScene, signOut }),
    [loading, session, profile, progress, owned, refresh, saveScene, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
