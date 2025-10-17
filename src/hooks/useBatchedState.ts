import { useState, useCallback } from 'react';

/**
 * Custom hook for batching state updates to prevent multiple re-renders
 * @param initialState - The initial state object
 * @returns [state, batchedSetState] - Current state and batched update function
 */
export function useBatchedState<T extends Record<string, any>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);

  const batchedSetState = useCallback((updates: Partial<T> | ((prevState: T) => Partial<T>)) => {
    setState(prevState => {
      const updatesObj = typeof updates === 'function' ? updates(prevState) : updates;
      return { ...prevState, ...updatesObj };
    });
  }, []);

  return [state, batchedSetState] as const;
}