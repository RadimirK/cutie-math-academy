import { useSyncExternalStore } from 'react';
import { onPythonStatus, pythonStatus } from './python.ts';

export const usePythonStatus = () => useSyncExternalStore(onPythonStatus, pythonStatus);
