'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

const RELOAD_FLAG_KEY = 'reservation-tool:auto-reloaded';

function isStaleDeploymentError(error: Error): boolean {
  return error.message.includes('Failed to find Server Action');
}

export default function GlobalErrorBoundary({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    if (!isStaleDeploymentError(error)) return;
    // 更新直後の古いタブから操作した場合に発生するエラー。1回だけ自動で再読み込みする。
    if (sessionStorage.getItem(RELOAD_FLAG_KEY)) return;
    sessionStorage.setItem(RELOAD_FLAG_KEY, '1');
    window.location.reload();
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-lg font-bold">エラーが発生しました</p>
      <p className="text-muted-foreground text-sm">
        システムが更新された直後はこの画面が一瞬表示され、自動的に再読み込みされることがあります。
        変わらない場合は下のボタンを押してください。
      </p>
      <Button onClick={() => window.location.reload()}>再読み込み</Button>
      {/* 原因調査のため一時的に技術情報を表示している。原因判明後に削除する。 */}
      <pre className="text-muted-foreground max-w-full overflow-x-auto rounded bg-black/5 p-2 text-left text-xs whitespace-pre-wrap">
        {error.message}
        {error.digest ? `\ndigest: ${error.digest}` : ''}
      </pre>
    </div>
  );
}
