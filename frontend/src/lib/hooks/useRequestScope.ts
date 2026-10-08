import { useCallback, useEffect, useRef } from 'react';
import { isRequestCancelled } from '../api/client';

/** Each channel owns its newest request. Unmount/account changes cancel all channels. */
export function useRequestScope(account?: number) {
  const controllers = useRef(new Map<string, AbortController>());
  const active = useRef(true);
  const cancel = useCallback((key?: string) => {
    if (key) { controllers.current.get(key)?.abort(); controllers.current.delete(key); }
    else { controllers.current.forEach(controller => controller.abort()); controllers.current.clear(); }
  }, []);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; cancel(); };
  }, [account, cancel]);
  const isActive = useCallback(() => active.current, []);
  const run = useCallback(async <T,>(key: string, task: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
    if (!active.current) return null;
    cancel(key);
    const controller = new AbortController();
    controllers.current.set(key, controller);
    try {
      const result = await task(controller.signal);
      return controller.signal.aborted ? null : result;
    } catch (error) {
      if (controller.signal.aborted || isRequestCancelled(error)) return null;
      throw error;
    } finally {
      if (controllers.current.get(key) === controller) controllers.current.delete(key);
    }
  }, [cancel]);
  return { run, cancel, isActive };
}
