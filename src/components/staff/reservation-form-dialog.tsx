'use client';

import { useState, type ReactElement } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  cancelReservationAction,
  createReservationAction,
  markInUseAction,
  updateReservationAction,
} from '@/actions/reservation-actions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Facility, GuestType, Reservation, Room } from '@/generated/prisma/client';
import {
  addDaysToDateString,
  combineTokyoDateAndTime,
  computeEndAt,
  toTokyoDateString,
  toTokyoParts,
} from '@/lib/datetime';
import { TIME_OPTIONS } from '@/lib/time-options';
import { reservationFormSchema, type ReservationFormValues } from '@/lib/validation/reservation';

const GUEST_TYPE_LABELS: Record<GuestType, string> = {
  staying: '宿泊中',
  before_checkin: 'チェックイン前',
  after_checkout: 'チェックアウト後',
};

interface ReservationFormDialogProps {
  facilities: Pick<Facility, 'id' | 'name' | 'durationMinutes'>[];
  rooms: Pick<Room, 'id' | 'roomNumber'>[];
  windowDays: number;
  reservation?: Reservation;
  trigger: ReactElement;
  onDone?: () => void;
}

function getDefaultStart(): { date: Date; time: string } {
  const parts = toTokyoParts(new Date());
  let minute = Math.ceil(parts.minute / 15) * 15;
  let hour = parts.hour;
  if (minute === 60) {
    minute = 0;
    hour += 1;
  }
  if (hour >= 24) {
    hour = 23;
    minute = 45;
  }
  return {
    date: new Date(parts.year, parts.month - 1, parts.day),
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

export function ReservationFormDialog({
  facilities,
  rooms,
  windowDays,
  reservation,
  trigger,
  onDone,
}: ReservationFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const initialStart = reservation
    ? (() => {
        const parts = toTokyoParts(reservation.startAt);
        return {
          date: new Date(parts.year, parts.month - 1, parts.day),
          time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
        };
      })()
    : getDefaultStart();

  const [startDate, setStartDate] = useState<Date>(initialStart.date);
  const [startTime, setStartTime] = useState<string>(initialStart.time);

  const defaultValues: ReservationFormValues = reservation
    ? {
        guestType: reservation.guestType,
        roomId: reservation.roomId ?? undefined,
        guestName: reservation.guestName ?? '',
        facilityId: reservation.facilityId,
        startAt: reservation.startAt,
        note: reservation.note ?? '',
      }
    : {
        guestType: 'staying',
        roomId: undefined,
        guestName: '',
        facilityId: '',
        startAt: combineTokyoDateAndTime(initialStart.date, initialStart.time),
        note: '',
      };

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues,
  });

  const guestType = form.watch('guestType');
  const facilityId = form.watch('facilityId');
  const selectedFacility = facilities.find((f) => f.id === facilityId);

  const todayStr = toTokyoDateString(new Date());
  const maxDateStr = addDaysToDateString(todayStr, windowDays);

  function updateStart(date: Date, time: string) {
    setStartDate(date);
    setStartTime(time);
    form.setValue('startAt', combineTokyoDateAndTime(date, time), { shouldValidate: true });
  }

  function resetForm() {
    const next = reservation ? initialStart : getDefaultStart();
    setStartDate(next.date);
    setStartTime(next.time);
    form.reset(defaultValues);
  }

  async function onSubmit(values: ReservationFormValues) {
    const result = reservation
      ? await updateReservationAction(reservation.id, reservation.lockVersion, values)
      : await createReservationAction(values);

    if (!result.success) {
      toast.error(result.error ?? '保存に失敗しました');
      return;
    }

    toast.success(reservation ? '予約内容を変更しました' : '予約を登録しました');
    setOpen(false);
    onDone?.();
  }

  async function handleCancel() {
    if (!reservation) return;
    if (!window.confirm('この予約をキャンセルしますか?この操作は取り消せません。')) {
      return;
    }
    const result = await cancelReservationAction(reservation.id, reservation.lockVersion);
    if (!result.success) {
      toast.error(result.error ?? 'キャンセルに失敗しました');
      return;
    }
    toast.success('予約をキャンセルしました');
    setOpen(false);
    onDone?.();
  }

  async function handleMarkInUse() {
    if (!reservation) return;
    const result = await markInUseAction(reservation.id, reservation.lockVersion);
    if (!result.success) {
      toast.error(result.error ?? '更新に失敗しました');
      return;
    }
    toast.success('利用中に変更しました');
    setOpen(false);
    onDone?.();
  }

  const previewEndAt =
    selectedFacility && form.watch('startAt')
      ? computeEndAt(form.watch('startAt'), selectedFacility.durationMinutes)
      : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{reservation ? '予約内容の変更' : '新規予約'}</DialogTitle>
          <DialogDescription>
            {reservation
              ? `現在のステータス: ${
                  {
                    reserved: '予約中',
                    in_use: '利用中',
                    completed: '利用完了',
                    cancelled: 'キャンセル',
                  }[reservation.status]
                }`
              : '予約者区分を選択してから、施設・日時を入力してください。'}
          </DialogDescription>
        </DialogHeader>

        <form
          id="reservation-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-2">
            <Label>予約者区分</Label>
            <div className="flex gap-2">
              {(Object.keys(GUEST_TYPE_LABELS) as GuestType[]).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={guestType === type ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => form.setValue('guestType', type, { shouldValidate: true })}
                >
                  {GUEST_TYPE_LABELS[type]}
                </Button>
              ))}
            </div>
          </div>

          {guestType === 'staying' ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="reservation-room">部屋番号</Label>
              <Select
                value={form.watch('roomId') ?? ''}
                onValueChange={(value) =>
                  form.setValue('roomId', value ?? undefined, { shouldValidate: true })
                }
              >
                <SelectTrigger id="reservation-room">
                  <SelectValue placeholder="部屋番号を選択" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.roomNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.roomId ? (
                <p className="text-destructive text-sm">{form.formState.errors.roomId.message}</p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="reservation-guest-name">利用者名</Label>
              <Input id="reservation-guest-name" {...form.register('guestName')} />
              {form.formState.errors.guestName ? (
                <p className="text-destructive text-sm">
                  {form.formState.errors.guestName.message}
                </p>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reservation-facility">利用施設</Label>
            <Select
              value={facilityId}
              onValueChange={(value) =>
                form.setValue('facilityId', value ?? '', { shouldValidate: true })
              }
            >
              <SelectTrigger id="reservation-facility">
                <SelectValue placeholder="施設を選択" />
              </SelectTrigger>
              <SelectContent>
                {facilities.map((facility) => (
                  <SelectItem key={facility.id} value={facility.id}>
                    {facility.name}({facility.durationMinutes}分)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.facilityId ? (
              <p className="text-destructive text-sm">{form.formState.errors.facilityId.message}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>利用開始日</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button type="button" variant="outline" className="justify-start">
                      <CalendarIcon className="mr-1 size-4" />
                      {toTokyoDateString(startDate)}
                    </Button>
                  }
                />
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => {
                      if (!date) return;
                      updateStart(date, startTime);
                      setDatePickerOpen(false);
                    }}
                    disabled={(date) => {
                      const dateStr = toTokyoDateString(date);
                      return dateStr < todayStr || dateStr > maxDateStr;
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reservation-time">開始時刻</Label>
              <Select
                value={startTime}
                onValueChange={(value) => value && updateStart(startDate, value)}
              >
                <SelectTrigger id="reservation-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.formState.errors.startAt ? (
            <p className="text-destructive text-sm">{form.formState.errors.startAt.message}</p>
          ) : null}

          {selectedFacility && previewEndAt ? (
            <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-sm">
              終了予定:{' '}
              {previewEndAt.toLocaleString('ja-JP', {
                timeZone: 'Asia/Tokyo',
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              (施設の固定利用時間から自動計算・変更不可)
            </p>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="reservation-note">備考</Label>
            <Textarea id="reservation-note" rows={2} {...form.register('note')} />
          </div>
        </form>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {reservation && reservation.status === 'reserved' ? (
              <Button type="button" variant="outline" onClick={handleMarkInUse}>
                利用中にする
              </Button>
            ) : null}
            {reservation && reservation.status !== 'cancelled' ? (
              <Button type="button" variant="destructive" onClick={handleCancel}>
                キャンセルする
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              閉じる
            </Button>
            <Button type="submit" form="reservation-form" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '保存中...' : '保存する'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
