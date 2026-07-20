'use server';

import { revalidatePath } from 'next/cache';
import { recordAuditLog } from '@/lib/audit';
import { tryRequireAdmin } from '@/lib/auth/require';
import { prisma } from '@/lib/prisma';
import { facilityFormSchema, type FacilityFormValues } from '@/lib/validation/facility';

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function createFacilityAction(input: FacilityFormValues): Promise<ActionResult> {
  const check = await tryRequireAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const parsed = facilityFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const duplicate = await prisma.facility.findUnique({ where: { name: parsed.data.name } });
  if (duplicate) {
    return { success: false, error: 'この施設名は既に使用されています' };
  }

  const facility = await prisma.facility.create({ data: parsed.data });

  await recordAuditLog({
    entityType: 'facility',
    entityId: facility.id,
    action: 'create',
    actor: check.actor,
    afterData: facility,
  });

  revalidatePath('/admin/facilities');
  return { success: true };
}

export async function updateFacilityAction(
  facilityId: string,
  input: FacilityFormValues,
): Promise<ActionResult> {
  const check = await tryRequireAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const parsed = facilityFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? '入力内容を確認してください',
    };
  }

  const before = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!before) {
    return { success: false, error: '対象の施設が見つかりません' };
  }

  const duplicate = await prisma.facility.findFirst({
    where: { name: parsed.data.name, NOT: { id: facilityId } },
  });
  if (duplicate) {
    return { success: false, error: 'この施設名は既に使用されています' };
  }

  const after = await prisma.facility.update({ where: { id: facilityId }, data: parsed.data });

  await recordAuditLog({
    entityType: 'facility',
    entityId: facilityId,
    action: 'update',
    actor: check.actor,
    beforeData: before,
    afterData: after,
  });

  revalidatePath('/admin/facilities');
  return { success: true };
}

export async function setFacilityActiveAction(
  facilityId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const check = await tryRequireAdmin();
  if (!check.ok) {
    return { success: false, error: check.error };
  }

  const before = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!before) {
    return { success: false, error: '対象の施設が見つかりません' };
  }

  const after = await prisma.facility.update({ where: { id: facilityId }, data: { isActive } });

  await recordAuditLog({
    entityType: 'facility',
    entityId: facilityId,
    action: isActive ? 'activate' : 'deactivate',
    actor: check.actor,
    beforeData: before,
    afterData: after,
  });

  revalidatePath('/admin/facilities');
  return { success: true };
}
