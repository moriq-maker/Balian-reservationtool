import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>管理者画面は準備中です</CardTitle>
          <CardDescription>
            施設マスター管理(フェーズ6)・利用停止(フェーズ12)・アナリティクス(フェーズ13)は今後のフェーズで実装します。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          管理者ログインは完了しています。
        </CardContent>
      </Card>
    </div>
  );
}
