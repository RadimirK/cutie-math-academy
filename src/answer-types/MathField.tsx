// MathLive input. Lazily loaded (MathLive + Compute Engine are large), see ./inputs.tsx.
import { ComputeEngine } from '@cortex-js/compute-engine';
import { MathfieldElement } from 'mathlive';
import { useEffect, useRef } from 'react';
import { ConvertError, mathJsonToSympy, normalizeLatex } from './mathjson.ts';
import type { Draft } from './inputs.tsx';

// Fonts come from KaTeX's stylesheet (same families), so MathLive does not fetch its own.
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;
const ce = new ComputeEngine();

export function latexToDraft(latex: string): Draft {
  if (!latex.trim()) return null;
  try {
    return { value: mathJsonToSympy(ce.parse(normalizeLatex(latex)).json as never) };
  } catch (e) {
    return { error: e instanceof ConvertError ? e.message : 'не удалось разобрать запись' };
  }
}

export default function MathField({
  onChange,
  onSubmit,
  disabled,
  keys = [],
}: {
  onChange(d: Draft): void;
  onSubmit(): void;
  disabled?: boolean;
  /** Quick-insert buttons shown under the field. */
  keys?: { label: string; latex: string }[];
}) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const cb = useRef({ onChange, onSubmit });
  cb.current = { onChange, onSubmit };

  useEffect(() => {
    const mf = new MathfieldElement();
    mf.className = 'answer-field';
    host.current!.appendChild(mf);
    // Most options can only be set once the element is mounted.
    mf.smartFence = true;
    mf.mathVirtualKeyboardPolicy = 'auto';
    mf.menuItems = [];
    mf.addEventListener('input', () => cb.current.onChange(latexToDraft(mf.getValue('latex'))));
    mf.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        cb.current.onSubmit();
      }
    });
    field.current = mf;
    requestAnimationFrame(() => mf.focus());
    return () => mf.remove();
  }, []);

  useEffect(() => {
    if (field.current) field.current.disabled = !!disabled;
  }, [disabled]);

  return (
    <div>
      <div ref={host} />
      {keys.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {keys.map((k) => (
            <button
              key={k.label}
              type="button"
              disabled={disabled}
              onClick={() => {
                const mf = field.current!;
                mf.value = k.latex;
                cb.current.onChange(latexToDraft(mf.value));
                mf.focus();
              }}
              className="btn-ghost !px-3 !py-1"
            >
              {k.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
