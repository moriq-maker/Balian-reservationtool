import Link from 'next/link';
import { ReservationBoard } from '@/components/staff/reservation-board';
import { getTokyoDayRange, toTokyoDateString } from '@/lib/datetime';
import { prisma } from '@/lib/prisma';

interface StaffDashboardPageProps {
  searchParams: Promise<{ date?: string; showCancelled?: string }>;
}

export default async function StaffDashboardPage({ searchParams }: StaffDashboardPageProps) {
  const params = await searchParams;
  const dateStr =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? params.date
      : toTokyoDateString(new Date());
  const showCancelled = params.showCancelled === '1';

  const { start, end } = getTokyoDayRange(dateStr);

  const [categories, reservations, rooms, windowSetting] = await Promise.all([
    prisma.facilityCategory.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        facilities: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } },
      },
    }),
    prisma.reservation.findMany({
      where: {
        startAt: { gte: start, lt: end },
        ...(showCancelled ? {} : { status: { not: 'cancelled' } }),
      },
      include: { facility: true, room: true },
      orderBy: { startAt: 'asc' },
    }),
    prisma.room.findMany({ where: { isActive: true }, orderBy: { displayOrder: 'asc' } }),
    prisma.systemSetting.findUnique({ where: { key: 'reservation_window_days' } }),
  ]);

  const windowDays = typeof windowSetting?.value === 'number' ? windowSetting.value : 3;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">予約表</h1>
        <Link href="/admin/login" className="text-muted-foreground text-sm underline">
          管理者ログイン
        </Link>
      </header>

      <ReservationBoard
        dateStr={dateStr}
        categories={categories}
        reservations={reservations}
        rooms={rooms}
        windowDays={windowDays}
        showCancelled={showCancelled}
      />
    </div>
  );
}
