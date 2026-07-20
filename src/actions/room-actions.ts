'use server';

import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import { tryRequireAdmin } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';
import { roomFormSchema, type RoomFormValues } from '@/lib/validation/room';
import type { ActionResult } from './facility-actions';

export async function createRoomAction(input: RoomFormValues): Promise<ActionResult> {
  const check = await tryRequireAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const parsed = roomFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const duplicate = await prisma.room.findUnique({ where: { roomNumber: parsed.data.roomNumber } });
  if (duplicate) {
    return { success: false, error: 'この部屋番号は既に登録されています' };
  }

  const room = await prisma.room.create({ data: parsed.data });

  await recordAuditLog({
    entityType: 'room',
    entityId: room.id,
    action: 'create',
    actor: check.actor,
    afterData: room,
  });

  revalidatePath('/admin/rooms');
  return { success: true };
}

export async function updateRoomAction(
  roomId: string,
  input: RoomFormValues,
): Promise<ActionResult> {
  const check = await tryRequireAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const parsed = roomFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const before = await prisma.room.findUnique({ where: { id: roomId } });
  if (!before) {
    return { success: false, error: '対象の部屋番号が見つかりません' };
  }

  const duplicate = await prisma.room.findFirst({
    where: { roomNumber: parsed.data.roomNumber, NOT: { id: roomId } },
  });
  if (duplicate) {
    return { success: false, error: 'この部屋番号は既に登録されています' };
  }

  const after = await prisma.room.update({ where: { id: roomId }, data: parsed.data });

  await recordAuditLog({
    entityType: 'room',
    entityId: roomId,
    action: 'update',
    actor: check.actor,
    beforeData: before,
    afterData: after,
  });

  revalidatePath('/admin/rooms');
  return { success: true };
}

export async function setRoomActiveAction(
  roomId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const check = await tryRequireAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const before = await prisma.room.findUnique({ where: { id: roomId } });
  if (!before) {
    return { success: false, error: '対象の部屋番号が見つかりません' };
  }

  const after = await prisma.room.update({ where: { id: roomId }, data: { isActive } });

  await recordAuditLog({
    entityType: 'room',
    entityId: roomId,
    action: isActive ? 'activate' : 'deactivate',
    actor: check.actor,
    beforeData: before,
    afterData: after,
  });

  revalidatePath('/admin/rooms');
  return { success: true };
}
