'use client';

import { CheckCircle2, CircleDot, CircleSlash, CircleCheckBig } from 'lucide-react';
import type { Facility, Reservation, ReservationStatus, Room } from '@/generated/prisma/client';
import { getBlockPosition } from '@/lib/reservation-grid';

export type ReservationWithRelations = Reservation & { facility: Facility; room: Room | null };

const STATUS_ICON: Record<ReservationStatus, typeof CircleDot> = {
  reserved: CircleDot,
  in_use: CheckCircle2,
  completed: CircleCheckBig,
  cancelled: CircleSlash,
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  reserved: '予約中',
  in_use: '利用中',
  completed: '利用完了',
  cancelled: 'キャンセル',
};

interface ReservationBlockProps {
  reservation: ReservationWithRelations;
  dayStart: Date;
  dayEnd: Date;
  onClick: () => void;
}

export function ReservationBlock({
  reservation,
  dayStart,
  dayEnd,
  onClick,
}: ReservationBlockProps) {
  const { topPercent, heightPercent, continuesNextDay } = getBlockPosition(
    reservation,
    dayStart,
    dayEnd,
  );
  const Icon = STATUS_ICON[reservation.status];
  const isCancelled = reservation.status === 'cancelled';
  const isCompleted = reservation.status === 'completed';

  const label =
    reservation.guestType === 'staying'
      ? (reservation.room?.roomNumber ?? '-')
      : reservation.guestName;

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

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        top: `${topPercent}%`,
        height: `${Math.max(heightPercent, 4)}%`,
        borderLeftColor: isCancelled ? undefined : reservation.facility.color,
      }}
      className={`absolute inset-x-1 flex flex-col overflow-hidden rounded-md border border-l-4 px-2 py-1 text-left shadow-sm transition-opacity hover:opacity-90 ${
        isCancelled
          ? 'border-border bg-muted/60 text-muted-foreground line-through'
          : isCompleted
            ? 'border-border bg-muted/80 text-foreground'
            : 'bg-card text-card-foreground'
      }`}
    >
      <span className="flex items-center gap-1 text-[11px] font-medium sm:text-xs">
        <Icon className="size-3 shrink-0 sm:size-3.5" />
        {STATUS_LABEL[reservation.status]}
      </span>
      <span className="truncate text-sm font-bold sm:text-base">{label}</span>
      <span className="text-muted-foreground text-[11px] sm:text-xs">
        {startLabel}〜{endLabel}
        {continuesNextDay ? ' (翌日へ)' : ''}
      </span>
    </button>
  );
}
