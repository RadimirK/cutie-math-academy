// Colour ramps for pixel art. One base colour becomes five tones in OKLCH:
// 0 outline, 1 shadow, 2 base, 3 light, 4 highlight. Shadows drift toward blue-violet and
// gain chroma, lights drift toward yellow and lose it: the usual hue-shifted ramp.

export type RGB = [number, number, number];

export function parseHex(hex: string): RGB {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** [L, C, h°] */
export type LCH = [number, number, number];

export function rgbToOklch([r8, g8, b8]: RGB): LCH {
  const [r, g, b] = [r8, g8, b8].map((v) => toLinear(v / 255)) as RGB;
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const h = (Math.atan2(B, A) * 180) / Math.PI;
  return [L, Math.hypot(A, B), (h + 360) % 360];
}

/** Linear sRGB of an OKLCH colour, possibly out of gamut. */
function oklchToLinear([L, C, h]: LCH): RGB {
  const A = C * Math.cos((h * Math.PI) / 180);
  const B = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Into sRGB, lowering chroma until the colour fits the gamut. */
export function oklchToRgb([L, C, h]: LCH): RGB {
  const Lc = Math.min(1, Math.max(0, L));
  let c = C;
  for (let k = 0; k < 24; k++) {
    const lin = oklchToLinear([Lc, c, h]);
    if (lin.every((v) => v >= -0.0005 && v <= 1.0005) || c < 1e-4) {
      return lin.map((v) => Math.round(255 * fromLinear(Math.min(1, Math.max(0, v))))) as RGB;
    }
    c *= 0.9;
  }
  return oklchToLinear([Lc, 0, h]).map((v) => Math.round(255 * fromLinear(Math.min(1, Math.max(0, v))))) as RGB;
}

/** Moves hue `from` toward `to` by at most `deg`, the short way round. */
function hueToward(from: number, to: number, deg: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return (from + Math.sign(d) * Math.min(Math.abs(d), deg) + 360) % 360;
}

export interface RampSpec {
  /** lightness offsets for tones 0..4 relative to the base (tone 2) */
  steps: [number, number, number, number, number];
  /** degrees of hue shift toward violet (shadows) and yellow (lights) per unit of step */
  hueShift: number;
}

export const DEFAULT_RAMP: RampSpec = { steps: [-0.36, -0.12, 0, 0.07, 0.15], hueShift: 70 };

const SHADOW_HUE = 285;
const LIGHT_HUE = 85;

export function ramp(base: string, spec: RampSpec = DEFAULT_RAMP): RGB[] {
  const [L, C, h] = rgbToOklch(parseHex(base));
  return spec.steps.map((dL) => {
    if (dL === 0) return parseHex(base);
    const toward = dL < 0 ? SHADOW_HUE : LIGHT_HUE;
    // Greys have no hue to shift; give them a little of the target hue instead.
    const hue = C < 0.02 ? toward : hueToward(h, toward, Math.abs(dL) * spec.hueShift);
    const chroma = dL < 0 ? Math.max(C * (1 + Math.abs(dL) * 0.6), C < 0.02 ? 0.025 * Math.abs(dL) * 3 : 0) : C * (1 - dL * 2.2);
    return oklchToRgb([L + dL, chroma, hue]);
  });
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [0, 1, 2].map((i) => Math.round(a[i]! + (b[i]! - a[i]!) * t)) as RGB;
}
