import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { prepareInstance } from '../answer-types/core.ts';
import { answerInputs, type Draft } from '../answer-types/inputs.tsx';
import { content } from '../content/bundle.ts';
import type { LoadedTemplate } from '../content/load.ts';
import { instantiateDeclarative, type ProblemInstance } from '../core/generate.ts';
import { Figure } from '../figures/Figure.tsx';
import { templateUnlocked } from '../core/progress.ts';
import { checkAnswer, mayNeedPython } from '../lib/checkAnswer.ts';
import { usePlayer } from '../lib/player.tsx';
import { generateWithPython, preloadPython } from '../lib/python.ts';
import { rpcErrorMessage, supabase } from '../lib/supabase.ts';
import { usePythonStatus } from '../lib/usePythonStatus.ts';
import { Difficulty } from '../ui/Difficulty.tsx';
import { Gem } from '../ui/Icons.tsx';
import { MathText } from '../ui/MathText.tsx';
import { PageHeader } from '../ui/PageHeader.tsx';
import { Portrait } from '../ui/Portrait.tsx';

interface Issued {
  id: string | null; // null in demo mode
  seed: number;
}
interface Reward {
  reward: number;
  decay_factor: number;
  capped: boolean;
}
type Feedback = { kind: 'wrong' } | { kind: 'parse'; message: string } | { kind: 'error'; message: string } | null;

const LINES = {
  idle: ['Давай попробуем!', 'Не спеши, всё получится.', 'Я рядом, если что.'],
  wrong: ['Почти! Проверь вычисления ещё раз.', 'Хм, не сходится. Попробуй иначе.', 'Ошибиться не страшно, давай ещё раз.'],
  right: ['Верно! Ты молодец!', 'Отлично! Именно так.', 'Идеально! Идём дальше?'],
};
const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)]!;

async function instantiate(t: LoadedTemplate, seed: number): Promise<ProblemInstance> {
  const inst = t.generator ? await generateWithPython(t.generatorSource!, seed, t.fullId) : instantiateDeclarative(t, seed);
  return prepareInstance(t.answer_type, inst, seed);
}

export function ProblemScreen() {
  const { templateId = '' } = useParams();
  const t = content.templates[templateId];
  const { demo, progress, refresh } = usePlayer();
  const pyStatus = usePythonStatus();

  const [issued, setIssued] = useState<Issued | null>(null);
  const [instance, setInstance] = useState<ProblemInstance | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(null);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [solved, setSolved] = useState<Reward | 'demo' | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [line, setLine] = useState(() => pick(LINES.idle));
  const [attempt, setAttempt] = useState(0); // remounts the input on a new problem

  const load = useCallback(
    async (fresh: boolean) => {
      if (!t) return;
      setInstance(null);
      setLoadError(null);
      setDraft(null);
      setFeedback(null);
      setSolved(null);
      setShowHint(false);
      setLine(pick(LINES.idle));
      setAttempt((a) => a + 1);
      try {
        let iss: Issued;
        if (supabase) {
          const { data, error } = await supabase.rpc('issue_problem', { p_template_id: t.fullId, p_fresh: fresh });
          if (error) throw new Error(rpcErrorMessage(error.message));
          const row = (data as { id: string; seed: number }[])[0]!;
          iss = { id: row.id, seed: row.seed };
        } else iss = { id: null, seed: Math.floor(Math.random() * 2 ** 31) };
        setIssued(iss);
        setInstance(await instantiate(t, iss.seed));
      } catch (e) {
        setLoadError((e as Error).message);
      }
    },
    [t],
  );

  useEffect(() => {
    if (t && (t.generator || mayNeedPython(t.answer_type))) void preloadPython().catch(() => {});
    void load(false);
  }, [t, load]);

  if (!t) return <p>Нет такой задачи.</p>;
  const topic = content.topics[t.topic]!;
  if (!demo && !templateUnlocked(content, progress, t.fullId))
    return (
      <p className="panel p-6">
        Эта задача ещё закрыта: пройди сцену темы «<Link to={`/topic/${topic.fullId}`} className="font-bold text-ba-500 underline">{topic.title}</Link>».
      </p>
    );

  const Input = answerInputs[t.answer_type];
  const reward = content.economy.reward_by_difficulty[t.difficulty as 1];
  const heroine = topic.main_character;
  const emotion = solved ? 'happy' : feedback?.kind === 'wrong' ? 'thinking' : 'smile';

  async function submit() {
    if (!instance || checking || solved) return;
    if (!draft) return setFeedback({ kind: 'parse', message: 'сначала введи ответ' });
    if ('error' in draft) return setFeedback({ kind: 'parse', message: draft.error });
    setChecking(true);
    setFeedback(null);
    try {
      const r = await checkAnswer(t!.answer_type, draft.value, instance.answer, instance.config);
      if ('parseError' in r) setFeedback({ kind: 'parse', message: r.parseError });
      else if (!r.ok) {
        setFeedback({ kind: 'wrong' });
        setLine(pick(LINES.wrong));
      } else {
        setLine(pick(LINES.right));
        if (!supabase || !issued?.id) setSolved('demo');
        else {
          const { data, error } = await supabase.rpc('submit_solution', { p_issued_id: issued.id });
          if (error) throw new Error(rpcErrorMessage(error.message));
          setSolved((data as Reward[])[0]!);
          void refresh();
        }
      }
    } catch (e) {
      setFeedback({ kind: 'error', message: (e as Error).message });
    } finally {
      setChecking(false);
    }
  }

  const waitingPython = pyStatus === 'loading' && (!instance || checking);

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_16rem]">
      <div>
        <PageHeader back={`/topic/${topic.fullId}`} backLabel={topic.title} title={t.title ?? t.id} />

        <div className="panel overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-100 bg-ba-50 px-6 py-2.5 text-sm">
            <span className="font-display text-xs font-bold tracking-widest text-ba-500 uppercase">Задача</span>
            {t.starred && <span className="chip bg-halo-400 text-ink-900">✶ особая</span>}
            <span className="ml-auto">
              <Difficulty n={t.difficulty} />
            </span>
            <span className="flex items-center gap-1 font-display font-extrabold text-ink-900">
              <Gem /> {reward}
            </span>
          </div>

          <div className="p-6">
            {loadError ? (
              <div className="rounded-md bg-red-50 p-4 text-red-700 ring-1 ring-red-200">
                {loadError}
                <button className="btn-ghost ml-3 !py-1" onClick={() => void load(false)}>
                  повторить
                </button>
              </div>
            ) : !instance ? (
              <div className="py-10 text-center text-ink-500">{t.generator && pyStatus === 'loading' ? <PythonLoading /> : 'Готовим задачу…'}</div>
            ) : (
              <>
                <MathText text={instance.statement} className="block text-xl leading-relaxed text-ink-900" />
                {instance.figure != null && <Figure spec={instance.figure} className="mx-auto mt-4 max-w-md" />}

                <div className="mt-6">
                  {Input ? (
                    <Input key={attempt} cfg={instance.config} correct={instance.answer} onChange={setDraft} onSubmit={() => void submit()} disabled={checking || !!solved} />
                  ) : (
                    <p className="text-red-600">Нет поля ввода для типа ответа {t.answer_type}.</p>
                  )}
                </div>

                {feedback && (
                  <p
                    className={`mt-4 animate-fade rounded-md border-l-4 p-3 text-sm font-bold ${
                      feedback.kind === 'wrong' ? 'border-momo-500 bg-momo-100 text-momo-500' : 'border-halo-500 bg-halo-100 text-ink-700'
                    }`}
                  >
                    {feedback.kind === 'wrong'
                      ? 'Неверно. Задача остаётся открытой — попробуй ещё раз.'
                      : feedback.kind === 'parse'
                        ? `Не удалось распознать ответ: ${feedback.message}`
                        : `Ошибка: ${feedback.message}`}
                  </p>
                )}

                {solved ? (
                  <RewardBanner solved={solved} onNext={() => void load(false)} topicId={topic.fullId} />
                ) : (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button className="btn-gold !px-8" disabled={checking} onClick={() => void submit()}>
                      {checking ? 'Проверяем…' : 'Проверить'}
                    </button>
                    {t.hint && !showHint && (
                      <button className="btn-ghost" onClick={() => setShowHint(true)}>
                        Подсказка
                      </button>
                    )}
                    <button className="btn-ghost ml-auto" onClick={() => void load(true)} title="Выдать другой вариант этой задачи">
                      Другой вариант
                    </button>
                  </div>
                )}
                {showHint && t.hint && (
                  <p className="mt-4 animate-fade rounded-md border-l-4 border-ba-400 bg-ba-50 p-3 text-sm text-ink-700">
                    <MathText text={t.hint} />
                  </p>
                )}
                {waitingPython && (
                  <div className="mt-4">
                    <PythonLoading />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <aside className="relative hidden flex-col items-center lg:flex">
        <div className="relative z-10 mt-16 w-full animate-fade" key={line}>
          <div className="rounded-lg bg-white p-3 text-sm text-ink-700 shadow-lg">
            <div className="mb-0.5 font-display text-xs font-extrabold text-momo-500 italic">{content.characters[heroine]?.name}</div>
            {line}
          </div>
          <div className="ml-8 h-0 w-0 border-x-8 border-t-[10px] border-x-transparent border-t-white" />
        </div>
        <Portrait id={heroine} emotion={emotion} variant="stage" className="-mt-2 h-[26rem] w-60" />
      </aside>
    </div>
  );
}

function RewardBanner({ solved, onNext, topicId }: { solved: Reward | 'demo'; onNext(): void; topicId: string }) {
  return (
    <div className="mt-6 animate-rise overflow-hidden rounded-md border border-halo-400 bg-gradient-to-r from-halo-100 to-white">
      <div className="bg-halo-400 px-5 py-1 font-display text-sm font-black tracking-widest text-ink-900 italic">MISSION CLEAR</div>
      <div className="p-5">
        {solved === 'demo' ? (
          <p className="font-bold text-ink-900">Верно! В демо-режиме кристаллы не начисляются.</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="title-display flex items-center gap-2 text-3xl text-ink-900">
                +{solved.reward} <Gem className="h-7 w-7" />
              </span>
              <span className="font-bold text-ba-600">Верно!</span>
            </div>
            {solved.decay_factor < 1 && (
              <p className="mt-1 text-sm text-ink-500">Эта задача уже решена много раз, поэтому награда ×{solved.decay_factor}. Попробуй другие задачи!</p>
            )}
            {solved.capped && <p className="mt-1 text-sm text-ink-500">Дневной лимит за лёгкие задачи исчерпан — задачи посложнее по-прежнему приносят кристаллы.</p>}
          </>
        )}
        <div className="mt-4 flex gap-3">
          <button className="btn-gold" onClick={onNext}>
            Следующая задача
          </button>
          <Link to={`/topic/${topicId}`} className="btn-ghost">
            К теме
          </Link>
        </div>
      </div>
    </div>
  );
}

function PythonLoading() {
  return (
    <div className="flex items-center justify-center gap-3 text-sm text-ink-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ba-400 border-t-transparent" />
      Загружаем математический движок (один раз, ~15 МБ)…
    </div>
  );
}
