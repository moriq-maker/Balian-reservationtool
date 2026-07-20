import { useRef, useSyncExternalStore } from 'react';

/**
 * 現在時刻を一定間隔で購読するフック。
 * useEffect内でのsetState呼び出しを避けるため、useSyncExternalStoreで実装する
 * (サーバーレンダリング時はnullを返し、ハイドレーション不整合を防ぐ)。
 *
 * getSnapshotは呼び出すたびに同じ値を返す必要がある(毎回 new Date() を返すと
 * Object.isの比較が常にfalseになり、無限レンダーループ(React error #185)になる)。
 * そのため実際の時刻更新はタイマー発火時のみ行い、refにキャッシュした値を返す。
 */
export function useNow(intervalMs: number): Date | null {
  const snapshotRef = useRef(new Date());

  return useSyncExternalStore(
    (onStoreChange) => {
      const timer = setInterval(() => {
        snapshotRef.current = new Date();
        onStoreChange();
      }, intervalMs);
      return () => clearInterval(timer);
    },
    () => snapshotRef.current,
    () => null,
  );
}
