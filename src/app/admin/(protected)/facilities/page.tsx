import Link from 'next/link';
import { setFacilityActiveAction } from '@/actions/facility-actions';
import { ActiveToggle } from '@/components/admin/active-toggle';
import { FacilityFormDialog } from '@/components/admin/facility-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { prisma } from '@/lib/prisma';

export default async function FacilitiesPage() {
  const [facilities, categories] = await Promise.all([
    prisma.facility.findMany({
      include: { category: true },
      orderBy: [{ category: { displayOrder: 'asc' } }, { displayOrder: 'asc' }],
    }),
    prisma.facilityCategory.findMany({ orderBy: { displayOrder: 'asc' } }),
  ]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">施設管理</h1>
          <p className="text-muted-foreground text-sm">
            予約表・予約入力で使用する施設マスターを管理します。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/admin">戻る</Link>} />
          <FacilityFormDialog categories={categories} trigger={<Button>施設を追加</Button>} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">順</TableHead>
              <TableHead>施設名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>利用時間</TableHead>
              <TableHead>清掃機能</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facilities.map((facility) => (
              <TableRow key={facility.id}>
                <TableCell className="text-muted-foreground">{facility.displayOrder}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full border"
                      style={{ backgroundColor: facility.color }}
                    />
                    <span className="font-medium">{facility.name}</span>
                  </div>
                </TableCell>
                <TableCell>{facility.category.name}</TableCell>
                <TableCell>{facility.durationMinutes}分</TableCell>
                <TableCell>
                  {facility.hasCleaning ? <Badge variant="secondary">あり</Badge> : '-'}
                </TableCell>
                <TableCell>
                  <ActiveToggle
                    isActive={facility.isActive}
                    activeLabel="有効"
                    inactiveLabel="無効化済み"
                    onToggle={(next) => setFacilityActiveAction(facility.id, next)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <FacilityFormDialog
                    categories={categories}
                    facility={facility}
                    trigger={
                      <Button variant="outline" size="sm">
                        編集
                      </Button>
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="text-muted-foreground text-xs">
        施設は物理削除されません。「無効化」すると新規予約の対象から外れますが、過去の予約履歴には引き続き表示されます。
      </p>
    </div>
  );
}
