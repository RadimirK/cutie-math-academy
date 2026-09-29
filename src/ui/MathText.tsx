import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import { splitMath } from '../core/mathText.ts';

/** Renders text with $inline$ and $$display$$ KaTeX math. */
export function MathText({ text, className }: { text: string; className?: string }) {
  const html = useMemo(
    () =>
      splitMath(text.trim())
        .map((s) =>
          s.kind === 'text'
            ? escapeHtml(s.value).replace(/\n/g, '<br/>')
            : katex.renderToString(s.value, { displayMode: s.kind === 'display', throwOnError: false, strict: 'ignore' }),
        )
        .join(''),
    [text],
  );
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
