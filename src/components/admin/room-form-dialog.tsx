'use client';

import { useState, type ReactElement } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { createRoomAction, updateRoomAction } from '@/actions/room-actions';
import { Button } from '@/components/ui/button';
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
import type { Room } from '@/generated/prisma/client';
import { roomFormDefaultValues, roomFormSchema, type RoomFormValues } from '@/lib/validation/room';

interface RoomFormDialogProps {
  room?: Room;
  trigger: ReactElement;
}

export function RoomFormDialog({ room, trigger }: RoomFormDialogProps) {
  const [open, setOpen] = useState(false);

  const defaultValues: RoomFormValues = room
    ? { roomNumber: room.roomNumber, displayOrder: room.displayOrder }
    : roomFormDefaultValues;

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues,
  });

  async function onSubmit(values: RoomFormValues) {
    const result = room ? await updateRoomAction(room.id, values) : await createRoomAction(values);

    if (!result.success) {
      toast.error(result.error ?? '保存に失敗しました');
      return;
    }

    toast.success(room ? '部屋番号を更新しました' : '部屋番号を追加しました');
    setOpen(false);
    form.reset(defaultValues);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          form.reset(defaultValues);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{room ? '部屋番号を編集' : '部屋番号を追加'}</DialogTitle>
          <DialogDescription>予約時に選択できる部屋番号マスターです。</DialogDescription>
        </DialogHeader>

        <form id="room-form" className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor="room-number">部屋番号</Label>
            <Input id="room-number" placeholder="例: 301" {...form.register('roomNumber')} />
            {form.formState.errors.roomNumber ? (
              <p className="text-destructive text-sm">{form.formState.errors.roomNumber.message}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="room-order">表示順</Label>
            <Input
              id="room-order"
              type="number"
              {...form.register('displayOrder', { valueAsNumber: true })}
            />
            {form.formState.errors.displayOrder ? (
              <p className="text-destructive text-sm">
                {form.formState.errors.displayOrder.message}
              </p>
            ) : null}
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button type="submit" form="room-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '保存中...' : '保存する'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
