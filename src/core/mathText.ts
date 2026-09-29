// Text with $inline$ and $$display$$ math, as used in scene lines and problem statements.
// `\$` is a literal dollar sign.
export type Segment = { kind: 'text' | 'inline' | 'display'; value: string };

export function splitMath(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$((?:\\.|[^$\\])+?)\$/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ kind: 'text', value: text.slice(last, m.index) });
    out.push(m[1] !== undefined ? { kind: 'display', value: m[1].trim() } : { kind: 'inline', value: m[2]!.trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', value: text.slice(last) });
  return out.map((s) => (s.kind === 'text' ? { ...s, value: s.value.replace(/\\\$/g, '$') } : s));
}

