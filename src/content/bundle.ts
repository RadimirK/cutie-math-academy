// Content bundled into the app at build time. CI guarantees it is valid; in dev, problems
// are shown on screen instead of crashing.
import { animationFrames, crop, emotionsOf, renderFigure, type FigureState, type Sprite } from '../art/render.ts';
import { renderBackdrop } from '../art/scenery.ts';
import type { Overrides } from '../art/schema.ts';
import { FRAMES, type Frame } from '../art/style.ts';
import { loadContent } from './load.ts';

const raw = import.meta.glob(['/content/**/*.yaml', '/content/**/*.py', '/content/characters/*.md', '!/content/assets/**'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const assetUrls = import.meta.glob('/content/assets/**/*.{png,jpg,jpeg,webp,svg}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const files = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.replace(/^\/content\//, ''), v]));
export const { content, issues: contentIssues } = loadContent(files);

/** URL of a file in content/assets/, or undefined if it is missing (render a placeholder). */
export function assetUrl(path: string): string | undefined {
  return assetUrls[`/content/assets/${path}`];
}

/**
 * Background of a scene: a local picture in content/assets/backgrounds/ if there is one,
 * otherwise the pixel background drawn from content/backgrounds/<name>.yaml.
 */
export function backgroundUrl(name: string): { url: string; pixel: boolean } | undefined {
  for (const ext of ['webp', 'png', 'jpg', 'jpeg', 'svg']) {
    const url = assetUrl(`backgrounds/${name}.${ext}`);
    if (url) return { url, pixel: false };
  }
  const url = generatedBackground(name);
  return url ? { url, pixel: true } : undefined;
}

const backgrounds = new Map<string, string | undefined>();

function generatedBackground(name: string): string | undefined {
  if (!backgrounds.has(name)) {
    let url: string | undefined;
    const b = content.backgrounds[name];
    try {
      if (b) url = spriteToUrl(renderBackdrop(b, content.props));
    } catch (err) {
      console.error(`фон ${name}:`, err);
    }
    backgrounds.set(name, url);
  }
  return backgrounds.get(name);
}

function spriteToUrl({ w, h, rgba }: Sprite): string {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.putImageData(new ImageData(rgba, w, h), 0, 0);
  return canvas.toDataURL();
}

export function spriteUrl(characterId: string, emotion = 'smile'): string | undefined {
  const sprites = content.characters[characterId]?.sprites ?? {};
  const path = sprites[emotion] ?? Object.values(sprites)[0];
  return path ? assetUrl(`characters/${path}`) : undefined;
}

const figures = new Map<string, Sprite>();
const generated = new Map<string, string | undefined>();

/**
 * Data URL of the generated pixel portrait (docs/character-art.md) in a frame, or undefined
 * if the character has no `look`. An emotion the look does not know is the base look;
 * `overlay` is a frame of an animation on top of the emotion.
 */
export function lookSpriteUrl(
  characterId: string,
  emotion?: string,
  frame: Frame = 'bust',
  overlay?: Overrides,
  globals?: FigureState['globals'],
): string | undefined {
  const look = content.characters[characterId]?.look;
  if (!look) return undefined;
  const e = emotion && emotionsOf(look).includes(emotion) ? emotion : undefined;
  const figureKey = `${characterId}/${e ?? ''}/${JSON.stringify([overlay ?? {}, globals ?? {}])}`;
  const key = `${figureKey}/${frame}`;
  if (!generated.has(key)) {
    let url: string | undefined;
    try {
      let figure = figures.get(figureKey);
      if (!figure) figures.set(figureKey, (figure = renderFigure(look, content.parts, { emotion: e, overlay, globals })));
      url = spriteToUrl(crop(figure, FRAMES[frame]));
    } catch (err) {
      console.error(`портрет ${characterId}:`, err);
    }
    generated.set(key, url);
  }
  return generated.get(key);
}

/** Frames of an animation (style.ts, ANIMATIONS) of the generated portrait; empty if it does not apply. */
export function lookAnimation(characterId: string, name: string, emotion?: string, frame: Frame = 'bust'): { ms: number; url: string }[] {
  const look = content.characters[characterId]?.look;
  if (!look) return [];
  const e = emotion && emotionsOf(look).includes(emotion) ? emotion : undefined;
  return animationFrames(look, content.parts, name, e).flatMap((f) => {
    const url = lookSpriteUrl(characterId, e, frame, f.overlay, f.globals);
    return url ? [{ ms: f.ms, url }] : [];
  });
}
