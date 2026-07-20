const MINUTES_PER_DAY = 24 * 60;

/** 予約ブロックの、日表示グリッド内でのtop/height(%)を計算する。日をまたぐ場合は当日分だけに切り詰める。 */
export function getBlockPosition(
  reservation: { startAt: Date; endAt: Date },
  dayStart: Date,
  dayEnd: Date,
): {
  topPercent: number;
  heightPercent: number;
  continuesNextDay: boolean;
  startsBeforeDay: boolean;
} {
  const totalMs = dayEnd.getTime() - dayStart.getTime();
  const clippedStart = Math.max(reservation.startAt.getTime(), dayStart.getTime());
  const clippedEnd = Math.min(reservation.endAt.getTime(), dayEnd.getTime());

  return {
    topPercent: ((clippedStart - dayStart.getTime()) / totalMs) * 100,
    heightPercent: Math.max(((clippedEnd - clippedStart) / totalMs) * 100, 0),
    continuesNextDay: reservation.endAt.getTime() > dayEnd.getTime(),
    startsBeforeDay: reservation.startAt.getTime() < dayStart.getTime(),
  };
}

/** グリッド列内でのクリック位置(px)から、15分刻みに丸めた "HH:MM" を求める */
export function pixelOffsetToQuarterHourTime(offsetY: number, columnHeight: number): string {
  const ratio = Math.min(Math.max(offsetY / columnHeight, 0), 1);
  const minutes = Math.floor((ratio * MINUTES_PER_DAY) / 15) * 15;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** 現在時刻ラインのtop(%)。当日でない場合はnull */
export function getCurrentTimePercent(now: Date, dayStart: Date, dayEnd: Date): number | null {
  if (now.getTime() < dayStart.getTime() || now.getTime() >= dayEnd.getTime()) {
    return null;
  }
  const totalMs = dayEnd.getTime() - dayStart.getTime();
  return ((now.getTime() - dayStart.getTime()) / totalMs) * 100;
}

export const HOUR_LABELS: string[] = Array.from(
  { length: 24 },
  (_, hour) => `${String(hour).padStart(2, '0')}:00`,
);
