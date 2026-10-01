// Content bundled into the app at build time. CI guarantees it is valid; in dev, problems
// are shown on screen instead of crashing.
import { renderLook } from '../art/render.ts';
import { loadContent } from './load.ts';

const raw = import.meta.glob(['/content/**/*.yaml', '/content/**/*.py', '!/content/assets/**'], {
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

export function backgroundUrl(name: string): string | undefined {
  for (const ext of ['webp', 'png', 'jpg', 'jpeg', 'svg']) {
    const url = assetUrl(`backgrounds/${name}.${ext}`);
    if (url) return url;
  }
  return undefined;
}

export function spriteUrl(characterId: string, emotion = 'smile'): string | undefined {
  const sprites = content.characters[characterId]?.sprites ?? {};
  const path = sprites[emotion] ?? Object.values(sprites)[0];
  return path ? assetUrl(`characters/${path}`) : undefined;
}

const generated = new Map<string, string | undefined>();

/**
 * Data URL of the generated pixel portrait (docs/character-art.md), or undefined if the
 * character has no `look`. An emotion the look does not define falls back to the base look.
 */
export function lookSpriteUrl(characterId: string, emotion?: string): string | undefined {
  const look = content.characters[characterId]?.look;
  if (!look) return undefined;
  const key = `${characterId}/${emotion && emotion in look.emotions ? emotion : ''}`;
  if (!generated.has(key)) {
    let url: string | undefined;
    try {
      const { w, h, rgba } = renderLook(look, content.parts, emotion && emotion in look.emotions ? emotion : undefined);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.putImageData(new ImageData(rgba, w, h), 0, 0);
      url = canvas.toDataURL();
    } catch (e) {
      console.error(`портрет ${characterId}:`, e);
    }
    generated.set(key, url);
  }
  return generated.get(key);
}
