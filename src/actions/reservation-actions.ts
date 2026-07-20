'use server';

import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import { tryRequireStaffOrAdmin } from '@/lib/auth/require';
import { computeEndAt, isQuarterHour, isWithinReservationWindow } from '@/lib/datetime';
import { prisma } from '@/lib/prisma';
import { reservationFormSchema, type ReservationFormValues } from '@/lib/validation/reservation';
import type { Facility, Reservation } from '@/generated/prisma/client';
import type { ActionResult } from './facility-actions';

interface ReservationActionResult extends ActionResult {
  reservation?: Reservation;
}

async function getReservationWindowDays(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'reservation_window_days' },
  });
  const value = setting?.value;
  return typeof value === 'number' ? value : 3;
}

async function findOverlappingReservation(
  facilityId: string,
  startAt: Date,
  endAt: Date,
  excludeReservationId?: string,
) {
  return prisma.reservation.findFirst({
    where: {
      facilityId,
      status: { not: 'cancelled' },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
    },
  });
}

function isExclusionViolation(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('excl_reservation_overlap') || message.includes('23P01');
}

type ValidationResult =
  { ok: true; facility: Facility; endAt: Date } | { ok: false; error: string };

/**
 * 予約作成・変更で共通のバリデーション(施設有効性・利用停止・予約可能期間・重複)を行う。
 * DB側のEXCLUDE制約が最終防衛線だが、その手前でも分かりやすい日本語エラーを返せるようにする。
 */
async function validateAndPrepare(
  data: ReservationFormValues,
  excludeReservationId?: string,
): Promise<ValidationResult> {
  if (!isQuarterHour(data.startAt)) {
    return { ok: false, error: '開始時刻は15分単位で選択してください' };
  }

  const facility = await prisma.facility.findUnique({ where: { id: data.facilityId } });
  if (!facility || !facility.isActive) {
    return { ok: false, error: 'この施設は現在利用できません' };
  }

  const activeClosure = await prisma.facilityClosure.findFirst({
    where: {
      facilityId: data.facilityId,
      releasedAt: null,
      startAt: { lte: data.startAt },
      OR: [{ isIndefinite: true }, { endAt: { gte: data.startAt } }],
    },
  });
  if (activeClosure) {
    return { ok: false, error: 'この施設は現在利用停止中です' };
  }

  const windowDays = await getReservationWindowDays();
  if (!isWithinReservationWindow(data.startAt, windowDays)) {
    return { ok: false, error: `予約可能期間は本日から${windowDays}日先までです` };
  }

  const endAt = computeEndAt(data.startAt, facility.durationMinutes);

  const overlapping = await findOverlappingReservation(
    data.facilityId,
    data.startAt,
    endAt,
    excludeReservationId,
  );
  if (overlapping) {
    return {
      ok: false,
      error: `選択した時間帯には、すでに${facility.name}の予約が入っています。別の時間を選択してください。`,
    };
  }

  return { ok: true, facility, endAt };
}

export async function createReservationAction(
  input: ReservationFormValues,
): Promise<ReservationActionResult> {
  const check = await tryRequireStaffOrAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const parsed = reservationFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }
  const data = parsed.data;

  const validation = await validateAndPrepare(data);
  if (!validation.ok) {
    return { success: false, error: validation.error };
  }

  try {
    const reservation = await prisma.reservation.create({
      data: {
        facilityId: data.facilityId,
        guestType: data.guestType,
        roomId: data.guestType === 'staying' ? (data.roomId ?? null) : null,
        guestName: data.guestType === 'staying' ? null : (data.guestName ?? null),
        startAt: data.startAt,
        endAt: validation.endAt,
        note: data.note || null,
        createdByType: check.actor.type,
        createdByAdminId: check.actor.type === 'admin' ? check.actor.adminId : null,
      },
    });

    await recordAuditLog({
      entityType: 'reservation',
      entityId: reservation.id,
      action: 'create',
      actor: check.actor,
      afterData: reservation,
    });

    revalidatePath('/staff');
    return { success: true, reservation };
  } catch (error) {
    if (isExclusionViolation(error)) {
      return {
        success: false,
        error: `選択した時間帯には、すでに${validation.facility.name}の予約が入っています。別の時間を選択してください。`,
      };
    }
    console.error('createReservationAction failed', error);
    return {
      success: false,
      error: '通信に失敗しました。ネットワークを確認して、もう一度お試しください。',
    };
  }
}

export async function updateReservationAction(
  reservationId: string,
  lockVersion: number,
  input: ReservationFormValues,
): Promise<ReservationActionResult> {
  const check = await tryRequireStaffOrAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const parsed = reservationFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }
  const data = parsed.data;

  const before = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!before) {
    return { success: false, error: '対象の予約が見つかりません' };
  }
  if (before.status === 'cancelled') {
    return { success: false, error: 'キャンセル済みの予約は変更できません' };
  }

  const validation = await validateAndPrepare(data, reservationId);
  if (!validation.ok) {
    return { success: false, error: validation.error };
  }

  try {
    const updateResult = await prisma.reservation.updateMany({
      where: { id: reservationId, lockVersion },
      data: {
        facilityId: data.facilityId,
        guestType: data.guestType,
        roomId: data.guestType === 'staying' ? (data.roomId ?? null) : null,
        guestName: data.guestType === 'staying' ? null : (data.guestName ?? null),
        startAt: data.startAt,
        endAt: validation.endAt,
        note: data.note || null,
        lockVersion: { increment: 1 },
      },
    });

    if (updateResult.count === 0) {
      return {
        success: false,
        error: '他の端末で予約内容が変更されました。最新情報を再読み込みしてください。',
      };
    }

    const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });

    await recordAuditLog({
      entityType: 'reservation',
      entityId: reservationId,
      action: 'update',
      actor: check.actor,
      beforeData: before,
      afterData: after,
    });

    revalidatePath('/staff');
    return { success: true, reservation: after };
  } catch (error) {
    if (isExclusionViolation(error)) {
      return {
        success: false,
        error: `選択した時間帯には、すでに${validation.facility.name}の予約が入っています。別の時間を選択してください。`,
      };
    }
    console.error('updateReservationAction failed', error);
    return {
      success: false,
      error: '通信に失敗しました。ネットワークを確認して、もう一度お試しください。',
    };
  }
}

export async function cancelReservationAction(
  reservationId: string,
  lockVersion: number,
  reason?: string,
): Promise<ActionResult> {
  const check = await tryRequireStaffOrAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const before = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!before) {
    return { success: false, error: '対象の予約が見つかりません' };
  }
  if (before.status === 'cancelled') {
    return { success: true };
  }

  const updateResult = await prisma.reservation.updateMany({
    where: { id: reservationId, lockVersion },
    data: { status: 'cancelled', cancelReason: reason || null, lockVersion: { increment: 1 } },
  });

  if (updateResult.count === 0) {
    return {
      success: false,
      error: '他の端末で予約内容が変更されました。最新情報を再読み込みしてください。',
    };
  }

  const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });

  await recordAuditLog({
    entityType: 'reservation',
    entityId: reservationId,
    action: 'cancel',
    actor: check.actor,
    reason,
    beforeData: before,
    afterData: after,
  });

  revalidatePath('/staff');
  return { success: true };
}

export async function markInUseAction(
  reservationId: string,
  lockVersion: number,
): Promise<ActionResult> {
  const check = await tryRequireStaffOrAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const before = await prisma.reservation.findUnique({ where: { id: reservationId } });
  if (!before) {
    return { success: false, error: '対象の予約が見つかりません' };
  }
  if (before.status !== 'reserved') {
    return { success: false, error: 'この予約は現在「利用中」に変更できない状態です' };
  }

  const updateResult = await prisma.reservation.updateMany({
    where: { id: reservationId, lockVersion, status: 'reserved' },
    data: { status: 'in_use', lockVersion: { increment: 1 } },
  });

  if (updateResult.count === 0) {
    return {
      success: false,
      error: '他の端末で予約内容が変更されました。最新情報を再読み込みしてください。',
    };
  }

  const after = await prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });

  await recordAuditLog({
    entityType: 'reservation',
    entityId: reservationId,
    action: 'mark_in_use',
    actor: check.actor,
    beforeData: before,
    afterData: after,
  });

  revalidatePath('/staff');
  return { success: true };
}
