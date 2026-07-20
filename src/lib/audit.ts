import 'server-only';
import { prisma } from '@/lib/prisma';
import type { AuditEntityType, Prisma } from '@/generated/prisma/client';
import type { CurrentActor } from './auth/require';

interface RecordAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  actor: CurrentActor;
  reason?: string;
  beforeData?: unknown;
  afterData?: unknown;
}

/**
 * 監査ログを記録する。actorがanonymousの場合は呼び出し側の実装ミス
 * (requireAdmin/requireStaffOrAdminを通さずに呼んでいる)なので例外にする。
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  if (params.actor.type === 'anonymous') {
    throw new Error('未認証のactorで監査ログを記録しようとしました');
  }

  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      actorType: params.actor.type,
      actorAdminId: params.actor.type === 'admin' ? params.actor.adminId : null,
      reason: params.reason,
      beforeData: params.beforeData as Prisma.InputJsonValue | undefined,
      afterData: params.afterData as Prisma.InputJsonValue | undefined,
    },
  });
}
