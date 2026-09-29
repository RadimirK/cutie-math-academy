import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { answerInputs, type Draft } from '../answer-types/inputs.tsx';
import { content } from '../content/bundle.ts';
import type { LoadedTemplate } from '../content/load.ts';
import { instantiateDeclarative, type ProblemInstance } from '../core/generate.ts';
import { templateUnlocked } from '../core/progress.ts';
import { checkAnswer, mayNeedPython } from '../lib/checkAnswer.ts';
import { usePlayer } from '../lib/player.tsx';
import { generateWithPython, preloadPython } from '../lib/python.ts';
import { rpcErrorMessage, supabase } from '../lib/supabase.ts';
import { usePythonStatus } from '../lib/usePythonStatus.ts';
import { Gem, IconBack } from '../ui/Icons.tsx';
import { MathText } from '../ui/MathText.tsx';
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
  return t.generator ? generateWithPython(t.generatorSource!, seed, t.fullId) : instantiateDeclarative(t, seed);
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
        Эта задача ещё закрыта: пройди сцену темы «<Link to={`/topic/${topic.fullId}`} className="text-sakura-300 underline">{topic.title}</Link>».
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
        <Link to={`/topic/${topic.fullId}`} className="btn-ghost !px-3 !py-1">
          <IconBack /> {topic.title}
        </Link>

        <div className="panel mt-4 p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <span className="title-display text-lg">{t.title ?? t.id}</span>
            {t.starred && <span className="chip bg-gold-400/20 text-gold-300 ring-1 ring-gold-400/40">✶ особая</span>}
            <span className="ml-auto tracking-widest text-sakura-300" title={`сложность ${t.difficulty}`}>
              {'◆'.repeat(t.difficulty)}
              <span className="text-white/15">{'◆'.repeat(5 - t.difficulty)}</span>
            </span>
            <span className="flex items-center gap-1 font-display font-bold text-gold-200">
              <Gem /> {reward}
            </span>
          </div>

          {loadError ? (
            <div className="rounded-md bg-red-500/15 p-4 text-red-200 ring-1 ring-red-400/40">
              {loadError}
              <button className="btn-ghost ml-3 !py-1" onClick={() => void load(false)}>
                повторить
              </button>
            </div>
          ) : !instance ? (
            <div className="py-10 text-center text-white/60">{t.generator && pyStatus === 'loading' ? <PythonLoading /> : 'Готовим задачу…'}</div>
          ) : (
            <>
              <MathText text={instance.statement} className="block text-xl leading-relaxed" />

              <div className="mt-6">
                {Input ? (
                  <Input key={attempt} cfg={instance.config} correct={instance.answer} onChange={setDraft} onSubmit={() => void submit()} disabled={checking || !!solved} />
                ) : (
                  <p className="text-red-300">Нет поля ввода для типа ответа {t.answer_type}.</p>
                )}
              </div>

              {feedback && (
                <p
                  className={`mt-4 animate-fade rounded-md p-3 text-sm ring-1 ${
                    feedback.kind === 'wrong' ? 'bg-sakura-500/15 text-sakura-200 ring-sakura-400/40' : 'bg-gold-400/10 text-gold-200 ring-gold-400/30'
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
                  <button className="btn-gold" disabled={checking} onClick={() => void submit()}>
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
                <p className="mt-4 animate-fade rounded-md bg-white/5 p-3 text-sm text-white/80 ring-1 ring-white/10">
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

      <aside className="relative hidden flex-col items-center lg:flex">
        <div className="panel relative z-10 mt-10 w-full animate-fade p-3 text-center text-sm" key={line}>
          {line}
        </div>
        <Portrait id={heroine} emotion={emotion} variant="stage" className="-mt-2 h-[26rem] w-60" />
      </aside>
    </div>
  );
}

function RewardBanner({ solved, onNext, topicId }: { solved: Reward | 'demo'; onNext(): void; topicId: string }) {
  return (
    <div className="mt-6 animate-rise rounded-md border border-gold-400/50 bg-gold-400/10 p-5">
      {solved === 'demo' ? (
        <p className="font-bold text-gold-200">Верно! В демо-режиме валюта не начисляется.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="title-display text-gradient flex animate-shimmer items-center gap-2 text-3xl">
              +{solved.reward} <Gem className="h-7 w-7" />
            </span>
            <span className="font-bold text-gold-200">Верно!</span>
          </div>
          {solved.decay_factor < 1 && (
            <p className="mt-1 text-sm text-white/60">
              Эта задача уже решена много раз, поэтому награда ×{solved.decay_factor}. Попробуй другие задачи!
            </p>
          )}
          {solved.capped && <p className="mt-1 text-sm text-white/60">Дневной лимит за лёгкие задачи исчерпан — задачи посложнее по-прежнему приносят валюту.</p>}
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
  );
}

function PythonLoading() {
  return (
    <div className="flex items-center justify-center gap-3 text-sm text-white/60">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-sakura-300 border-t-transparent" />
      Загружаем математический движок (один раз, ~15 МБ)…
    </div>
  );
}
