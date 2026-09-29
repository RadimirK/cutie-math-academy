export interface RarityStyle {
  /** card background gradient (light top, saturated bottom) */
  bg: string;
  /** accent colour: frames, glows, halos */
  glow: string;
  text: string;
  label: string;
}

// Like the game's recruitment: blue for common, gold for rare, pink for the top rarity.
export const RARITY: Record<number, RarityStyle> = {
  3: { bg: 'linear-gradient(170deg, #f2f9ff 0%, #bfe2ff 45%, #5fb5ff 100%)', glow: '#3eaaff', text: 'text-r3', label: '3★' },
  4: { bg: 'linear-gradient(170deg, #fffbe8 0%, #ffe89a 45%, #f4bd12 100%)', glow: '#f2b600', text: 'text-r4', label: '4★' },
  5: { bg: 'linear-gradient(170deg, #fff2f8 0%, #ffc4de 40%, #ff6fb0 100%)', glow: '#ff5fa8', text: 'text-r5', label: '5★' },
};

export const rarityOf = (n: number | undefined): RarityStyle => RARITY[n ?? 3] ?? RARITY[3]!;

const HALO_COLORS = ['#ff8fc0', '#7fc4ff', '#ffd23f', '#a58bff', '#6fe0c8', '#ff9f6b'];

/** Each heroine gets a stable halo colour derived from her id. */
export function haloColor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HALO_COLORS[h % HALO_COLORS.length]!;
}
