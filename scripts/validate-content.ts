// CI step: zod validation of every content file plus cross-reference checks (invariant 6).
import { loadOrDie } from './content-files.ts';

const c = loadOrDie();
console.log(
  `✓ контент корректен: ${Object.keys(c.subjects).length} предм., ${Object.keys(c.topics).length} тем, ` +
    `${Object.keys(c.scenes).length} сцен, ${Object.keys(c.templates).length} шаблонов, ` +
    `${Object.keys(c.characters).length} персонажей, ${Object.keys(c.banners).length} баннеров`,
);
