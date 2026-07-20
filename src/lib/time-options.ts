/** 15分刻みの時刻選択肢("00:00" 〜 "23:45") */
export const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4);
  const minutes = (i % 4) * 15;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});
