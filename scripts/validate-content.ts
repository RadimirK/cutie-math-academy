// CI step: zod validation of every content file plus cross-reference checks (invariant 6).
// Generated portraits are also drawn here in every emotion and animation frame, so a broken
// part fails CI, and every part is checked against the face and body rig.
import { animationFrames, emotionsOf, renderFigure, rigIssues } from '../src/art/render.ts';
import { ANIMATIONS } from '../src/art/style.ts';
import { loadOrDie } from './content-files.ts';

const c = loadOrDie();
let portraits = 0;
const broken: string[] = [];
for (const [slot, parts] of Object.entries(c.parts))
  for (const part of Object.values(parts))
    for (const message of rigIssues(slot as keyof typeof c.parts, part)) broken.push(`✗ content/art/parts/${slot}/${part.id}.yaml: ${message}`);
for (const ch of Object.values(c.characters)) {
  if (!ch.look) continue;
  for (const emotion of [undefined, ...emotionsOf(ch.look)]) {
    const frames = [{}, ...Object.keys(ANIMATIONS).flatMap((a) => animationFrames(ch.look!, c.parts, a, emotion))];
    for (const { overlay, globals } of frames as { overlay?: object; globals?: object }[]) {
      try {
        renderFigure(ch.look, c.parts, { emotion, overlay, globals });
        portraits++;
      } catch (e) {
        broken.push(`✗ content/characters/${ch.id}.yaml: портрет ${emotion ?? '(базовый)'}${overlay ? ' ' + JSON.stringify(overlay) : ''}: ${(e as Error).message}`);
      }
    }
  }
}
if (broken.length) {
  console.error(broken.join('\n'));
  process.exit(1);
}
console.log(
  `✓ контент корректен: ${Object.keys(c.subjects).length} предм., ${Object.keys(c.topics).length} тем, ` +
    `${Object.keys(c.scenes).length} сцен, ${Object.keys(c.templates).length} шаблонов, ` +
    `${Object.keys(c.characters).length} персонажей, ${Object.keys(c.banners).length} баннеров, ` +
    `${Object.values(c.parts).reduce((n, s) => n + Object.keys(s).length, 0)} деталей арта, ${portraits} кадров портретов, ` +
    `${Object.keys(c.backgrounds).length} фонов из ${Object.keys(c.props).length} предметов`,
);
