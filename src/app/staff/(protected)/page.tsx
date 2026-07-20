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
    <div className="flex min-h-screen flex-col">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="bg-gold size-2 rounded-full" />
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">予約表</h1>
          </div>
          <Link
            href="/admin/login"
            className="text-primary-foreground/70 hover:text-gold text-sm underline underline-offset-4 transition-colors"
          >
            管理者ログイン
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 sm:p-6">
        <ReservationBoard
          dateStr={dateStr}
          categories={categories}
          reservations={reservations}
          rooms={rooms}
          windowDays={windowDays}
          showCancelled={showCancelled}
        />
      </div>
    </div>
  );
}
