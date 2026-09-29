// Deterministic PRNG for declarative templates. A problem is fully defined by (template, seed),
// so this algorithm is part of the content contract: changing it changes every issued problem.
export type Rng = () => number; // uniform uint32

export function splitmix32(seed: number): Rng {
  let a = seed | 0;
  return () => {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

export function pickIndex(rng: Rng, n: number): number {
  if (n <= 0) throw new Error('pickIndex: empty range');
  return rng() % n;
}
