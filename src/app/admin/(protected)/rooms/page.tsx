import Link from 'next/link';
import { setRoomActiveAction } from '@/actions/room-actions';
import { ActiveToggle } from '@/components/admin/active-toggle';
import { RoomFormDialog } from '@/components/admin/room-form-dialog';
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

export default async function RoomsPage() {
  const rooms = await prisma.room.findMany({ orderBy: { displayOrder: 'asc' } });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">部屋番号管理</h1>
          <p className="text-muted-foreground text-sm">
            宿泊中の予約で選択できる部屋番号マスターを管理します。
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" render={<Link href="/admin">戻る</Link>} />
          <RoomFormDialog trigger={<Button>部屋番号を追加</Button>} />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">順</TableHead>
              <TableHead>部屋番号</TableHead>
              <TableHead>状態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="text-muted-foreground">{room.displayOrder}</TableCell>
                <TableCell className="font-medium">{room.roomNumber}</TableCell>
                <TableCell>
                  <ActiveToggle
                    id={room.id}
                    isActive={room.isActive}
                    activeLabel="有効"
                    inactiveLabel="無効化済み"
                    action={setRoomActiveAction}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <RoomFormDialog
                    room={room}
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
        部屋番号は物理削除されません。「無効化」すると新規予約の選択肢から外れますが、過去の予約履歴には引き続き表示されます。
      </p>
    </div>
  );
}
