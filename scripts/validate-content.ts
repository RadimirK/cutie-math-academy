// CI step: zod validation of every content file plus cross-reference checks (invariant 6).
// Generated portraits are also drawn here in every emotion, so a broken part fails CI.
import { renderLook } from '../src/art/render.ts';
import { loadOrDie } from './content-files.ts';

const c = loadOrDie();
let portraits = 0;
const broken: string[] = [];
for (const ch of Object.values(c.characters)) {
  if (!ch.look) continue;
  for (const emotion of [undefined, ...Object.keys(ch.look.emotions)]) {
    try {
      renderLook(ch.look, c.parts, emotion);
      portraits++;
    } catch (e) {
      broken.push(`✗ content/characters/${ch.id}.yaml: портрет ${emotion ?? '(базовый)'}: ${(e as Error).message}`);
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
    `${Object.values(c.parts).reduce((n, s) => n + Object.keys(s).length, 0)} деталей арта, ${portraits} портретов`,
);
