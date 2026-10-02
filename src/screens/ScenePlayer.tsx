import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { backgroundUrl, content } from '../content/bundle.ts';
import type { Scene } from '../content/schema.ts';
import { advance, boardFigure, choose, normalize, view, type VnPosition } from '../core/vn.ts';
import { Figure } from '../figures/Figure.tsx';
import { usePlayer } from '../lib/player.tsx';
import { preloadPython } from '../lib/python.ts';
import { MathText } from '../ui/MathText.tsx';
import { Portrait } from '../ui/Portrait.tsx';

export function ScenePlayer() {
  const { sceneId = '' } = useParams();
  const navigate = useNavigate();
  const { progress, saveScene } = usePlayer();
  const scene = content.scenes[sceneId];
  const saved = progress.scenes[sceneId];
  // Every position shown so far, the current one last; stepping back pops it.
  // A finished scene replays from the start; an unfinished one resumes at the saved node.
  const [trail, setTrail] = useState<VnPosition[]>(() => [
    scene ? normalize(scene, { node: saved && saved.status !== 'completed' && scene.nodes[saved.node] ? saved.node : 'start', index: 0 }) : { node: 'start', index: 0 },
  ]);
  const pos = trail[trail.length - 1]!;
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<string | null>(null);

  const v = scene ? view(scene, pos) : ({ kind: 'end' } as const);
  // The heroine keeps the latest emotion shown, so stepping back restores the earlier one.
  const emotion = useMemo(() => {
    for (let i = trail.length - 1; i >= 0 && scene; i--) {
      const s = view(scene, trail[i]!);
      if (s.kind === 'line' && s.step.emotion) return s.step.emotion;
    }
    return undefined;
  }, [scene, trail]);

  // Save progress whenever a new node is entered, and completion at the end.
  useEffect(() => {
    if (!scene) return;
    const finished = v.kind === 'end';
    const key = `${pos.node}:${finished}`;
    if (lastSaved.current === key) return;
    lastSaved.current = key;
    saveScene(scene.fullId, pos.node, finished).catch((e: Error) => setError(e.message));
  }, [scene, pos.node, v.kind, saveScene]);

  useEffect(() => {
    // Problems usually follow a scene: start loading the Python engine in the background.
    if (v.kind === 'end') void preloadPython().catch(() => {});
  }, [v.kind]);

  // Space advances the dialogue, like a click; ← and Backspace step back. Focused controls
  // (the ε slider, buttons) keep their own keys; a held key does not fast-forward.
  useEffect(() => {
    if (!scene) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea, select, button, [contenteditable]')) return;
      if (e.code === 'Space') setTrail((t) => forward(scene, t));
      else if (e.code === 'ArrowLeft' || e.code === 'Backspace') setTrail(back);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scene]);

  if (!scene) return <p className="p-8">Нет такой сцены.</p>;
  const bg = backgroundUrl(scene.background);
  const speaker = v.kind === 'line' ? content.characters[v.step.speaker] : undefined;
  const onStage = v.kind === 'line' ? v.step.speaker : scene.character;
  const next = () => setTrail((t) => forward(scene, t));
  const canGoBack = trail.length > 1;
  const backButton = (className: string) =>
    canGoBack && (
      <button
        type="button"
        title="Назад (← или Backspace)"
        onClick={(e) => {
          e.stopPropagation();
          setTrail(back);
        }}
        className={`font-bold transition-colors ${className}`}
      >
        ◀ Назад
      </button>
    );
  const stepKey = `${pos.node}:${pos.index}`;
  const figure = boardFigure(scene, normalize(scene, pos));

  return (
    <div
      className={`relative flex h-screen flex-col overflow-hidden bg-cover bg-center select-none ${bg ? '' : 'sky'}`}
      style={bg ? { backgroundImage: `url(${bg.url})`, imageRendering: bg.pixel ? 'pixelated' : undefined } : undefined}
      onClick={next}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 p-4">
        <span className="plate font-display text-sm font-bold italic shadow">
          <span>{scene.title ?? scene.id}</span>
        </span>
        {!bg && <span className="text-xs font-bold text-white/80">фон: {scene.background}</span>}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/topic/${scene.topic}`);
          }}
          className="btn-ghost ml-auto !bg-white/90 !py-1.5 shadow"
        >
          ✕ Выйти
        </button>
      </div>

      {/* The heroine stands on the background, anchored to the screen bottom: the text box
          overlaps her instead of pushing her up and down as lines change length. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className={`absolute bottom-0 h-[86vh] -translate-x-1/2 ${
            figure ? 'left-[75%] hidden w-[min(24rem,40vw)] md:block' : 'left-1/2 w-[min(28rem,85vw)]'
          }`}
        >
          <Portrait key={onStage} id={onStage} emotion={emotion} variant="stage" className="h-full w-full animate-fade" />
        </div>
      </div>

      {/* The board hangs from the top; min-h-0 lets a long line squeeze it into scrolling. */}
      <div className={`relative flex min-h-0 flex-1 items-start justify-center px-4 ${figure ? 'md:justify-start md:pl-[6%]' : ''}`}>
        {figure && (
          // On narrow screens the board takes the heroine's place.
          <div
            key={JSON.stringify(figure)}
            className="mt-16 mb-4 max-h-[calc(100%-5rem)] w-full max-w-lg animate-rise overflow-auto rounded-lg bg-white/95 p-4 shadow-xl ring-4 ring-ba-200/60 md:w-[55%]"
          >
            <Figure spec={figure} />
          </div>
        )}
      </div>

      {v.kind === 'choice' && (
        <div className="absolute inset-0 z-10 flex animate-fade flex-col items-center justify-center gap-3 bg-ink-900/30 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="mb-2 max-w-2xl rounded-md bg-ink-900/85 px-6 py-3 text-center text-white shadow-lg">
            <MathText text={v.question} className="block text-lg font-bold" />
          </div>
          {v.options.map((o, i) => (
            <button
              key={o.goto + o.text}
              onClick={() => setTrail((t) => [...t, choose(scene, o.goto)])}
              className="w-full max-w-xl animate-rise border-l-4 border-ba-500 bg-white/95 px-6 py-3 text-center font-bold text-ink-900 shadow-md transition-colors hover:border-gold-400 hover:bg-ba-50"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <MathText text={o.text} />
            </button>
          ))}
          {backButton('mt-2 rounded-md bg-ink-900/70 px-4 py-1.5 text-sm text-white hover:bg-ink-900/85')}
        </div>
      )}

      {v.kind === 'end' ? (
        <div className="relative z-10 mx-auto mb-8 w-full max-w-md px-4">
          <div className="animate-rise overflow-hidden rounded-lg bg-white text-center shadow-xl">
            <div className="bg-ba-500 py-2 font-display text-lg font-black tracking-widest text-white italic">EPISODE CLEAR</div>
            <div className="p-5">
              <p className="mb-4 font-bold text-ink-700">Эпизод пройден! Задачи темы открыты.</p>
              <div className="flex items-center justify-center gap-3">
                {backButton('btn-ghost')}
                <button onClick={() => navigate(`/topic/${scene.topic}`)} className="btn-gold">
                  К задачам темы
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        v.kind !== 'choice' && (
          <div className="relative z-10 cursor-pointer bg-[linear-gradient(to_top,rgb(20_32_52/0.95)_0%,rgb(20_32_52/0.9)_70%,rgb(20_32_52/0))] pt-14 pb-6">
            <div className="mx-auto w-full max-w-4xl px-6">
              {speaker ? (
                <div className="mb-2 flex items-baseline gap-3 border-b border-white/25 pb-2">
                  <span className="font-display text-2xl font-extrabold text-white italic">{speaker.name}</span>
                  <span className="font-bold text-ba-300">{content.subjects[speaker.subject]?.title}</span>
                </div>
              ) : (
                <div className="mb-2 border-b border-white/15 pb-2" />
              )}
              <MathText
                key={stepKey}
                text={v.kind === 'line' ? v.step.text : v.text}
                className={`block min-h-[5.5rem] animate-fade text-lg leading-relaxed text-white ${v.kind === 'narration' ? 'text-center text-white/80 italic' : ''}`}
              />
              {backButton('absolute bottom-3 left-6 text-sm text-white/50 hover:text-white')}
              <span className="absolute right-8 bottom-4 animate-bounce-soft text-gold-400">▼</span>
            </div>
          </div>
        )
      )}
      {error && <p className="absolute top-16 left-4 z-20 rounded-md bg-red-50 p-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

/** The trail with the next step appended; choices and the end wait for the player. */
function forward(scene: Scene, trail: VnPosition[]): VnPosition[] {
  const cur = trail[trail.length - 1]!;
  const kind = view(scene, cur).kind;
  return kind === 'choice' || kind === 'end' ? trail : [...trail, advance(scene, cur)];
}

function back(trail: VnPosition[]): VnPosition[] {
  return trail.length > 1 ? trail.slice(0, -1) : trail;
}
