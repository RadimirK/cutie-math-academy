import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { backgroundUrl, content } from '../content/bundle.ts';
import { advance, choose, normalize, view, type VnPosition } from '../core/vn.ts';
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
  // A finished scene replays from the start; an unfinished one resumes at the saved node.
  const [pos, setPos] = useState<VnPosition>(() =>
    scene ? normalize(scene, { node: saved && saved.status !== 'completed' && scene.nodes[saved.node] ? saved.node : 'start', index: 0 }) : { node: 'start', index: 0 },
  );
  const [error, setError] = useState<string | null>(null);
  const lastSaved = useRef<string | null>(null);
  const [emotion, setEmotion] = useState<string | undefined>();

  const v = scene ? view(scene, pos) : ({ kind: 'end' } as const);

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
    if (v.kind === 'line' && v.step.emotion) setEmotion(v.step.emotion);
    // Problems usually follow a scene: start loading the Python engine in the background.
    if (v.kind === 'end') void preloadPython().catch(() => {});
  }, [v]);

  if (!scene) return <p className="p-8">Нет такой сцены.</p>;
  const bg = backgroundUrl(scene.background);
  const speaker = v.kind === 'line' ? content.characters[v.step.speaker] : undefined;
  const onStage = v.kind === 'line' ? v.step.speaker : scene.character;
  const next = () => v.kind !== 'choice' && v.kind !== 'end' && setPos(advance(scene, pos));
  const stepKey = `${pos.node}:${pos.index}`;

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-cover bg-center select-none"
      style={{
        backgroundImage: bg
          ? `url(${bg})`
          : 'radial-gradient(ellipse at 50% 110%, rgb(255 159 192 / 0.35), transparent 60%), radial-gradient(circle at 80% 10%, rgb(185 140 255 / 0.35), transparent 50%), linear-gradient(180deg, #1a1748, #0b0a24)',
      }}
      onClick={next}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center gap-3 bg-gradient-to-b from-night-950/80 to-transparent p-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/topic/${scene.topic}`);
          }}
          className="btn-ghost !py-1.5"
        >
          ✕ Выйти
        </button>
        <span className="title-display text-sm text-white/80">{scene.title ?? scene.id}</span>
        {!bg && <span className="ml-auto text-xs text-white/30">фон: {scene.background}</span>}
      </div>

      <div className="flex flex-1 items-end justify-center">
        <Portrait key={onStage} id={onStage} emotion={emotion} variant="stage" className="mb-[-3rem] h-[68vh] w-[min(24rem,75vw)] animate-fade" />
      </div>

      {v.kind === 'choice' && (
        <div className="absolute inset-0 z-10 flex animate-fade flex-col items-center justify-center gap-3 bg-night-950/55 px-4" onClick={(e) => e.stopPropagation()}>
          <div className="panel mb-2 max-w-2xl px-6 py-4 text-center !bg-night-950/70">
            <MathText text={v.question} className="block text-lg font-bold" />
          </div>
          {v.options.map((o, i) => (
            <button
              key={o.goto + o.text}
              onClick={() => setPos(choose(scene, o.goto))}
              className="w-full max-w-xl animate-rise rounded-md border border-white/20 bg-night-900/95 px-6 py-3 text-center font-bold transition-colors hover:border-sakura-400 hover:bg-night-800"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <MathText text={o.text} />
            </button>
          ))}
        </div>
      )}

      <div className="relative z-10 mx-auto mb-5 w-full max-w-4xl px-4">
        {v.kind === 'end' ? (
          <div className="panel animate-rise p-6 text-center !bg-night-950/85">
            <p className="title-display mb-4 text-2xl text-gradient">Глава пройдена!</p>
            <button onClick={() => navigate(`/topic/${scene.topic}`)} className="btn-gold">
              К задачам темы
            </button>
          </div>
        ) : (
          v.kind !== 'choice' && (
            <div className="relative cursor-pointer">
              {speaker && (
                <div
                  className="absolute -top-4 left-6 z-10 rounded-full px-5 py-1 font-display text-sm font-bold shadow-lg"
                  style={{ background: 'linear-gradient(90deg, var(--color-sakura-500), var(--color-sakura-400))' }}
                >
                  {speaker.name}
                </div>
              )}
              <div className="min-h-36 rounded-3xl border border-white/15 bg-night-950/80 px-7 pt-7 pb-8 shadow-[0_10px_50px_-10px_rgb(0_0_0/0.8)] backdrop-blur-md">
                <MathText
                  key={stepKey}
                  text={v.kind === 'line' ? v.step.text : v.text}
                  className={`block animate-fade text-lg leading-relaxed ${v.kind === 'narration' ? 'text-center text-white/70 italic' : ''}`}
                />
              </div>
              <span className="absolute right-6 bottom-3 animate-bounce-soft text-sakura-300">▼</span>
            </div>
          )
        )}
        {error && <p className="mt-2 rounded-xl bg-red-500/20 p-2 text-sm text-red-200">{error}</p>}
      </div>
    </div>
  );
}
