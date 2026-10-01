// Background + prop library -> pixels, with the same painter as the characters (render.ts):
// the light, the shading, the outline and the colour ramps are the house style for both.
// See docs/backgrounds.md.
import { paint, partIssues, resolveParams, type Layer, type Sprite } from './render.ts';
import type { Backdrop, Prop } from './schema.ts';
import { SCENE, sceneryPalette } from './style.ts';

export type PropLibrary = Record<string, Prop>;

/** The props of a background as layers, back to front. Throws on the first problem. */
export function backdropLayers(b: Backdrop, props: PropLibrary): Layer[] {
  return b.props.map((use, li) => {
    const where = `props[${li}] ${use.prop}`;
    const prop = props[use.prop];
    if (!prop) throw new Error(`${where}: нет предмета ${use.prop} (есть: ${Object.keys(props).join(', ') || 'ничего'})`);
    return {
      part: prop,
      ...resolveParams(`предмета ${prop.id}`, prop.params, use, where, ['prop', 'at', 'scale']),
      origin: use.at,
      unit: use.scale ?? 1,
      where,
      depth: () => ({ key: String(li), z: li }),
    };
  });
}

export function renderBackdrop(b: Backdrop, props: PropLibrary): Sprite {
  return paint(backdropLayers(b, props), SCENE, sceneryPalette(b.palette));
}

/** Static checks of a prop: as for character parts, but props know no body measurements. */
export function propIssues(prop: Prop): string[] {
  return partIssues(prop, {});
}

/** Problems of a background: unknown props or params, shapes that fail to draw. */
export function backdropIssues(b: Backdrop, props: PropLibrary): string[] {
  try {
    renderBackdrop(b, props);
    return [];
  } catch (e) {
    return [(e as Error).message];
  }
}
