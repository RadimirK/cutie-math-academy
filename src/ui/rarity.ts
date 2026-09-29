export interface RarityStyle {
  /** card background gradient */
  bg: string;
  /** frame / glow colour */
  glow: string;
  text: string;
  label: string;
}

export const RARITY: Record<number, RarityStyle> = {
  3: { bg: 'linear-gradient(160deg, #1d4f8f 0%, #3aa0ff 60%, #a9dcff 100%)', glow: '#5ab8ff', text: 'text-r3', label: '3★' },
  4: { bg: 'linear-gradient(160deg, #3b1f7a 0%, #8b5cf6 55%, #d9c2ff 100%)', glow: '#b98cff', text: 'text-r4', label: '4★' },
  5: { bg: 'linear-gradient(160deg, #7a3d0b 0%, #e8a93c 50%, #fff0c7 100%)', glow: '#ffc24d', text: 'text-r5', label: '5★' },
};

export const rarityOf = (n: number | undefined): RarityStyle => RARITY[n ?? 3] ?? RARITY[3]!;
