/** A section heading: slanted blue tab, italic title, hairline to the right edge. */
export function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-3 font-display text-xl font-extrabold text-ink-900 italic">
      <span className="h-5 w-2 -skew-x-12 bg-ba-500" />
      {children}
      <span className="h-px flex-1 bg-ink-100" />
    </h2>
  );
}
