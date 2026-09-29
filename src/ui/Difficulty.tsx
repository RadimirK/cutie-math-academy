/** Difficulty as a row of slanted pips. */
export function Difficulty({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5" title={`сложность ${n}`} aria-label={`сложность ${n} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`h-2.5 w-3 -skew-x-12 ${i <= n ? 'bg-ba-500' : 'bg-ink-100'}`} />
      ))}
    </span>
  );
}
