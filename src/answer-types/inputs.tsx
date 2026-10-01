// Input components of the answer-type plugins. Each turns what the player enters into the
// answer string of its type (sympy syntax), or an error the player should fix.
import { lazy, Suspense, useState, type ComponentType } from 'react';
import { MathText } from '../ui/MathText.tsx';
import { matrixShape } from './core.ts';

export type Draft = { value: string } | { error: string } | null;

export interface InputProps {
  cfg: any;
  /** Reference answer; only its shape may be used (e.g. matrix size). */
  correct: string;
  onChange(d: Draft): void;
  onSubmit(): void;
  disabled?: boolean;
}

const MathField = lazy(() => import('./MathField.tsx'));

function MathInput(props: InputProps & { keys?: { label: string; latex: string }[] }) {
  return (
    <Suspense fallback={<div className="answer-field animate-pulse text-ink-300">загружаем поле ввода…</div>}>
      <MathField onChange={props.onChange} onSubmit={props.onSubmit} disabled={props.disabled} keys={props.keys} />
    </Suspense>
  );
}

function NumberInput(props: InputProps) {
  const [dne, setDne] = useState(false);
  return (
    <div>
      {dne ? (
        <div className="answer-field flex items-center justify-between">
          <span className="font-bold">не существует</span>
          <button type="button" className="text-sm font-bold text-ink-500 hover:text-ba-600" onClick={() => (setDne(false), props.onChange(null))}>
            ✕ ввести число
          </button>
        </div>
      ) : (
        <MathInput
          {...props}
          keys={[
            { label: '+∞', latex: '\\infty' },
            { label: '−∞', latex: '-\\infty' },
          ]}
        />
      )}
      {!dne && (
        <button type="button" disabled={props.disabled} className="btn-ghost mt-2 !px-3 !py-1" onClick={() => (setDne(true), props.onChange({ value: 'DNE' }))}>
          не существует
        </button>
      )}
    </div>
  );
}

function ChoiceInput({ cfg, onChange, disabled }: InputProps) {
  const [picked, setPicked] = useState<string | null>(null);
  const options = (cfg.options ?? []) as string[];
  // Long lists get letters, so the options are easy to refer to and scan.
  const lettered = options.length > 3;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((o, i) => (
        <button
          key={o}
          type="button"
          disabled={disabled}
          onClick={() => (setPicked(o), onChange({ value: o }))}
          className={`flex items-center gap-3 rounded-md border-2 px-4 py-3 text-left font-bold text-ink-900 transition-colors ${
            picked === o ? 'border-ba-500 bg-ba-100' : 'border-ink-100 bg-white hover:border-ba-300 hover:bg-ba-50'
          }`}
        >
          {lettered && (
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-display text-xs ${picked === o ? 'bg-ba-500 text-white' : 'bg-ink-100 text-ink-500'}`}>
              {'АБВГДЕЖЗИКЛМ'[i]}
            </span>
          )}
          <MathText text={o} />
        </button>
      ))}
    </div>
  );
}

const CELL = /^-?[\d\s.,/()+\-*^a-z]*$/i;

function MatrixInput({ correct, onChange, onSubmit, disabled }: InputProps) {
  const [rows, cols] = matrixShape(correct) ?? [2, 2];
  const [cells, setCells] = useState<string[]>(() => Array(rows * cols).fill(''));
  const update = (i: number, v: string) => {
    const next = cells.map((c, j) => (j === i ? v : c));
    setCells(next);
    if (next.every((c) => !c.trim())) return onChange(null);
    if (next.some((c) => !c.trim())) return onChange({ error: 'заполни все клетки матрицы' });
    if (next.some((c) => !CELL.test(c))) return onChange({ error: 'в клетках должны быть числа, например -3 или 1/2' });
    const cell = (c: string) => c.trim().replace(/(\d),(\d)/g, '$1.$2').replace(/\^/g, '**');
    onChange({ value: `[${Array.from({ length: rows }, (_, r) => `[${next.slice(r * cols, r * cols + cols).map(cell).join(', ')}]`).join(', ')}]` });
  };
  return (
    <div className="inline-flex items-stretch gap-2">
      <div className="w-2 rounded-l-md border-y-2 border-l-2 border-ink-700" />
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 4.5rem)` }}>
        {cells.map((c, i) => (
          <input
            key={i}
            value={c}
            disabled={disabled}
            autoFocus={i === 0}
            inputMode="text"
            onChange={(e) => update(i, e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            className="rounded-md border border-ink-100 bg-ba-50 px-2 py-2 text-center font-mono text-lg text-ink-900 outline-none focus:border-ba-400 focus:bg-white"
            aria-label={`строка ${Math.floor(i / cols) + 1}, столбец ${(i % cols) + 1}`}
          />
        ))}
      </div>
      <div className="w-2 rounded-r-md border-y-2 border-r-2 border-ink-700" />
    </div>
  );
}

export const answerInputs: Record<string, ComponentType<InputProps>> = {
  expression: MathInput,
  number: NumberInput,
  choice: ChoiceInput,
  matrix: MatrixInput,
};
