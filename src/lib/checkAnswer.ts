import { answerTypes, type CheckResult } from '../answer-types/core.ts';
import { checkWithPython } from './python.ts';

/** TS fast path first, then the plugin's own checker (in the Pyodide worker for 'python'). */
export async function checkAnswer(type: string, user: string, correct: string, cfg: unknown): Promise<CheckResult> {
  const at = answerTypes[type];
  if (!at) throw new Error(`неизвестный тип ответа ${type}`);
  const quick = at.quickCheck?.(user, correct, cfg);
  if (quick) return quick;
  if (at.check === 'python') return checkWithPython(type, user, correct, cfg);
  return at.check(user, correct, cfg);
}

/** Whether checking this type may need Python (to start loading it early). */
export const mayNeedPython = (type: string) => answerTypes[type]?.check === 'python';
