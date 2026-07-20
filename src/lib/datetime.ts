export const APP_TIMEZONE = 'Asia/Tokyo';

const tokyoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const tokyoPartsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** 指定した日時をAsia/Tokyoの暦日で "YYYY-MM-DD" 形式にする */
export function toTokyoDateString(date: Date): string {
  return tokyoDateFormatter.format(date);
}

/** 指定した日時をAsia/Tokyo基準の年月日時分に分解する */
export function toTokyoParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const map: Record<string, string> = {};
  for (const part of tokyoPartsFormatter.formatToParts(date)) {
    map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) {
    hour = 0;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
  };
}

/**
 * カレンダーで選択された日付(ブラウザのローカル日付として扱う)と "HH:MM" 形式の時刻を
 * 組み合わせ、それをAsia/Tokyoの壁時計時刻として解釈したUTC上のDateを返す。
 * Asia/Tokyoは夏時間のない固定UTC+9のため、時刻から9時間引いてUTCとして扱えばよい。
 */
export function combineTokyoDateAndTime(dateOnly: Date, timeString: string): Date {
  const [hourStr, minuteStr] = timeString.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  return new Date(
    Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), hour - 9, minute),
  );
}

/** Asia/Tokyoの暦日("YYYY-MM-DD")に対応するUTC上の開始・終了(排他)瞬間を返す */
export function getTokyoDayRange(dateString: string): { start: Date; end: Date } {
  const [year, month, day] = dateString.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -9, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day + 1, -9, 0, 0));
  return { start, end };
}

/** "YYYY-MM-DD" 形式の日付文字列に日数を加算する(タイムゾーンに依存しないカレンダー計算) */
export function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const utcMidnight = new Date(Date.UTC(year, month - 1, day));
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() + days);
  return utcMidnight.toISOString().slice(0, 10);
}

/** 施設の固定利用時間から終了日時を自動計算する(日付またぎも自然に扱える) */
export function computeEndAt(startAt: Date, durationMinutes: number): Date {
  return new Date(startAt.getTime() + durationMinutes * 60_000);
}

/** 開始時刻が15分刻みか(秒・ミリ秒も0か)を検証する */
export function isQuarterHour(date: Date): boolean {
  return (
    date.getUTCMinutes() % 15 === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
  );
}

/**
 * 予約可能期間(当日を含め設定日数先まで、Asia/Tokyo基準)内かどうかを判定する。
 * 過去すぎる開始時刻(フォーム送信の遅延を考慮し5分の猶予あり)も対象外とする。
 */
export function isWithinReservationWindow(
  startAt: Date,
  windowDays: number,
  now: Date = new Date(),
): boolean {
  const graceMs = 5 * 60_000;
  if (startAt.getTime() < now.getTime() - graceMs) {
    return false;
  }

  const todayStr = toTokyoDateString(now);
  const maxDateStr = addDaysToDateString(todayStr, windowDays);
  const startDateStr = toTokyoDateString(startAt);
  return startDateStr >= todayStr && startDateStr <= maxDateStr;
}
