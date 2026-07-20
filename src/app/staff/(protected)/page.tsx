import Link from 'next/link';
import { ReservationFormDialog } from '@/components/staff/reservation-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getTokyoDayRange, toTokyoDateString } from '@/lib/datetime';
import { prisma } from '@/lib/prisma';
import type { ReservationStatus } from '@/generated/prisma/client';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  reserved: '予約中',
  in_use: '利用中',
  completed: '利用完了',
  cancelled: 'キャンセル',
};

const STATUS_VARIANTS: Record<ReservationStatus, 'default' | 'secondary' | 'outline'> = {
  reserved: 'default',
  in_use: 'secondary',
  completed: 'outline',
  cancelled: 'outline',
};

export default async function StaffDashboardPage() {
  const todayStr = toTokyoDateString(new Date());
  const { start, end } = getTokyoDayRange(todayStr);

  const [reservations, facilities, rooms, windowSetting] = await Promise.all([
    prisma.reservation.findMany({
      where: { startAt: { gte: start, lt: end }, status: { not: 'cancelled' } },
      include: { facility: true, room: true },
      orderBy: { startAt: 'asc' },
    }),
    prisma.facility.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.room.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.systemSetting.findUnique({ where: { key: 'reservation_window_days' } }),
  ]);

  const windowDays = typeof windowSetting?.value === 'number' ? windowSetting.value : 3;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">予約表</h1>
          <p className="text-muted-foreground text-sm">本日({todayStr})の予約一覧</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/login" className="text-muted-foreground text-sm underline">
            管理者ログイン
          </Link>
          <ReservationFormDialog
            facilities={facilities}
            rooms={rooms}
            windowDays={windowDays}
            trigger={<Button>新規予約</Button>}
          />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>本日の予約</CardTitle>
          <CardDescription>
            見た目を整えた施設別・時間帯別の予約表はフェーズ8で実装します。現時点は一覧のみです。
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              本日の予約はまだありません。
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>時刻</TableHead>
                  <TableHead>施設</TableHead>
                  <TableHead>部屋番号/氏名</TableHead>
                  <TableHead>区分</TableHead>
                  <TableHead>状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => {
                  const startLabel = reservation.startAt.toLocaleTimeString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const endLabel = reservation.endAt.toLocaleTimeString('ja-JP', {
                    timeZone: 'Asia/Tokyo',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const crossesDay =
                    toTokyoDateString(reservation.startAt) !== toTokyoDateString(reservation.endAt);

                  return (
                    <ReservationFormDialog
                      key={reservation.id}
                      facilities={facilities}
                      rooms={rooms}
                      windowDays={windowDays}
                      reservation={reservation}
                      trigger={
                        <TableRow className="hover:bg-muted/50 cursor-pointer">
                          <TableCell>
                            {startLabel}〜{endLabel}
                            {crossesDay ? (
                              <span className="text-muted-foreground ml-1 text-xs">(翌日)</span>
                            ) : null}
                          </TableCell>
                          <TableCell>{reservation.facility.name}</TableCell>
                          <TableCell>
                            {reservation.guestType === 'staying'
                              ? (reservation.room?.roomNumber ?? '-')
                              : reservation.guestName}
                          </TableCell>
                          <TableCell>
                            {
                              {
                                staying: '宿泊中',
                                before_checkin: 'チェックイン前',
                                after_checkout: 'チェックアウト後',
                              }[reservation.guestType]
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={STATUS_VARIANTS[reservation.status]}>
                              {STATUS_LABELS[reservation.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      }
                    />
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
