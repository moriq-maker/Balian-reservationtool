'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Facility, FacilityCategory, Room } from '@/generated/prisma/client';
import { addDaysToDateString, combineTokyoDateAndTime, toTokyoDateString } from '@/lib/datetime';
import {
  getCurrentTimePercent,
  HOUR_LABELS,
  pixelOffsetToQuarterHourTime,
} from '@/lib/reservation-grid';
import { useNow } from '@/lib/use-now';
import { ReservationBlock, type ReservationWithRelations } from './reservation-block';
import { ReservationFormDialog } from './reservation-form-dialog';

const HOUR_HEIGHT_REM = 3.5;
const GRID_HEIGHT_REM = HOUR_HEIGHT_REM * 24;

interface CategoryWithFacilities extends FacilityCategory {
  facilities: Facility[];
}

interface ReservationBoardProps {
  dateStr: string;
  categories: CategoryWithFacilities[];
  reservations: ReservationWithRelations[];
  rooms: Pick<Room, 'id' | 'roomNumber'>[];
  windowDays: number;
  showCancelled: boolean;
}

export function ReservationBoard({
  dateStr,
  categories,
  reservations,
  rooms,
  windowDays,
  showCancelled,
}: ReservationBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id ?? '');
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const now = useNow(30_000);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithRelations | null>(
    null,
  );
  const [selectedSlot, setSelectedSlot] = useState<{ facilityId: string; time: string } | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  const dayStart = combineTokyoDateAndTime(new Date(`${dateStr}T00:00:00`), '00:00');
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);
  const isToday = dateStr === toTokyoDateString(new Date());

  useEffect(() => {
    if (hasScrolledRef.current || !scrollRef.current || !isToday || !now) return;
    const percent = getCurrentTimePercent(now, dayStart, dayEnd);
    if (percent === null) return;
    const targetTop = (percent / 100) * (GRID_HEIGHT_REM * 16) - 200;
    scrollRef.current.scrollTop = Math.max(targetTop, 0);
    hasScrolledRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, isToday]);

  function navigate(nextDateStr: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('date', nextDateStr);
    router.push(`/staff?${params.toString()}`);
  }

  function toggleShowCancelled(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) {
      params.set('showCancelled', '1');
    } else {
      params.delete('showCancelled');
    }
    router.push(`/staff?${params.toString()}`);
  }

  const currentTimePercent = now ? getCurrentTimePercent(now, dayStart, dayEnd) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-10"
            onClick={() => navigate(addDaysToDateString(dateStr, -1))}
            aria-label="前日"
          >
            <ChevronLeft className="size-5" />
          </Button>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger
              render={
                <Button variant="outline" className="h-10 gap-1 px-3 text-base">
                  <CalendarIcon className="size-4" />
                  {dateStr}
                </Button>
              }
            />
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={new Date(`${dateStr}T00:00:00`)}
                onSelect={(date) => {
                  if (!date) return;
                  navigate(toTokyoDateString(date));
                  setDatePickerOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="icon"
            className="size-10"
            onClick={() => navigate(addDaysToDateString(dateStr, 1))}
            aria-label="翌日"
          >
            <ChevronRight className="size-5" />
          </Button>
          <Button
            variant="secondary"
            className="h-10"
            onClick={() => navigate(toTokyoDateString(new Date()))}
          >
            今日
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={showCancelled} onCheckedChange={toggleShowCancelled} />
            <span className="text-muted-foreground text-sm">キャンセル済みを表示</span>
          </div>
          <ReservationFormDialog
            facilities={categories.flatMap((c) => c.facilities)}
            rooms={rooms}
            windowDays={windowDays}
            trigger={
              <Button variant="gold" className="h-10">
                新規予約
              </Button>
            }
          />
        </div>
      </div>

      <Tabs value={activeCategoryId} onValueChange={setActiveCategoryId}>
        <TabsList
          variant="line"
          className="border-border h-12 w-full justify-start gap-4 border-b px-1"
        >
          {categories.map((category) => {
            const facilityIds = new Set(category.facilities.map((f) => f.id));
            const nowOccupiedCount = reservations.filter(
              (r) =>
                facilityIds.has(r.facilityId) &&
                (r.status === 'reserved' || r.status === 'in_use') &&
                now &&
                r.startAt.getTime() <= now.getTime() &&
                r.endAt.getTime() > now.getTime(),
            ).length;
            const hasVacancy = nowOccupiedCount < category.facilities.length;
            return (
              <TabsTrigger
                key={category.id}
                value={category.id}
                className="after:bg-gold data-active:text-foreground flex-none px-1 text-base font-semibold"
              >
                <span
                  className={`mr-1.5 inline-block size-2 rounded-full ${
                    hasVacancy ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {category.name}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-3">
            {category.facilities.length === 0 ? (
              <p className="text-muted-foreground py-10 text-center text-sm">
                このカテゴリには有効な施設がありません。
              </p>
            ) : (
              <div className="bg-card overflow-x-auto rounded-lg border shadow-sm">
                <div className="flex min-w-[480px]">
                  <div className="bg-muted/30 w-14 shrink-0 border-r pt-10">
                    <div style={{ height: `${GRID_HEIGHT_REM}rem` }} className="relative">
                      {HOUR_LABELS.map((label, i) => (
                        <span
                          key={label}
                          style={{ top: `${(i / 24) * 100}%` }}
                          className="text-muted-foreground absolute -translate-y-1/2 pl-1 text-xs"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div ref={scrollRef} className="max-h-[75vh] flex-1 overflow-y-auto">
                    <div className="flex">
                      {category.facilities.map((facility) => {
                        const facilityReservations = reservations.filter(
                          (r) => r.facilityId === facility.id,
                        );
                        return (
                          <div
                            key={facility.id}
                            className="min-w-[180px] flex-1 border-r last:border-r-0"
                          >
                            <div className="bg-background sticky top-0 z-10 flex h-10 items-center gap-1.5 border-b px-2 text-sm font-bold">
                              <span
                                className="inline-block size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: facility.color }}
                              />
                              <span className="truncate">{facility.name}</span>
                            </div>
                            <div
                              className="bg-background relative cursor-pointer"
                              style={{ height: `${GRID_HEIGHT_REM}rem` }}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const time = pixelOffsetToQuarterHourTime(
                                  e.clientY - rect.top,
                                  rect.height,
                                );
                                setSelectedSlot({ facilityId: facility.id, time });
                              }}
                            >
                              {HOUR_LABELS.map((label, i) => (
                                <div
                                  key={label}
                                  style={{ top: `${(i / 24) * 100}%` }}
                                  className="absolute inset-x-0 border-t"
                                />
                              ))}
                              {currentTimePercent !== null ? (
                                <div
                                  style={{ top: `${currentTimePercent}%` }}
                                  className="border-destructive pointer-events-none absolute inset-x-0 z-20 border-t-2"
                                />
                              ) : null}
                              {facilityReservations.map((reservation) => (
                                <ReservationBlock
                                  key={reservation.id}
                                  reservation={reservation}
                                  dayStart={dayStart}
                                  dayEnd={dayEnd}
                                  onClick={() => setSelectedReservation(reservation)}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {selectedReservation ? (
        <ReservationFormDialog
          facilities={categories.flatMap((c) => c.facilities)}
          rooms={rooms}
          windowDays={windowDays}
          reservation={selectedReservation}
          open
          onOpenChange={(next) => {
            if (!next) setSelectedReservation(null);
          }}
        />
      ) : null}

      {selectedSlot ? (
        <ReservationFormDialog
          facilities={categories.flatMap((c) => c.facilities)}
          rooms={rooms}
          windowDays={windowDays}
          defaultFacilityId={selectedSlot.facilityId}
          defaultStart={{ date: new Date(`${dateStr}T00:00:00`), time: selectedSlot.time }}
          open
          onOpenChange={(next) => {
            if (!next) setSelectedSlot(null);
          }}
        />
      ) : null}
    </div>
  );
}
