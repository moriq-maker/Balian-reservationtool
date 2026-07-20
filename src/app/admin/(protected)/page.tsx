import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>管理者メニュー</CardTitle>
          <CardDescription>
            予約表・利用停止・アナリティクスなどは今後のフェーズで実装します。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button render={<Link href="/admin/facilities">施設管理</Link>} />
          <Button render={<Link href="/admin/rooms">部屋番号管理</Link>} />
        </CardContent>
      </Card>
    </div>
  );
}
