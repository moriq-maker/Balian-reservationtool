import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function StaffDashboardPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">予約表</h1>
        <Link href="/admin/login" className="text-muted-foreground text-sm underline">
          管理者ログイン
        </Link>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>予約表は準備中です</CardTitle>
          <CardDescription>
            フェーズ8で施設別・時間帯別の予約表UIを実装します。現時点では認証・権限まわりの土台のみです。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          アクセスコードによる認証は完了しています。
        </CardContent>
      </Card>
    </div>
  );
}
