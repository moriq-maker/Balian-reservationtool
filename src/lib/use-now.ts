import { useSyncExternalStore } from 'react';

/**
 * 現在時刻を一定間隔で購読するフック。
 * useEffect内でのsetState呼び出しを避けるため、useSyncExternalStoreで実装する
 * (サーバーレンダリング時はnullを返し、ハイドレーション不整合を防ぐ)。
 */
export function useNow(intervalMs: number): Date | null {
  return useSyncExternalStore(
    (onStoreChange) => {
      const timer = setInterval(onStoreChange, intervalMs);
      return () => clearInterval(timer);
    },
    () => new Date(),
    () => null,
  );
}
