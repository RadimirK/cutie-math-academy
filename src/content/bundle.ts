// Content bundled into the app at build time. CI guarantees it is valid; in dev, problems
// are shown on screen instead of crashing.
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
