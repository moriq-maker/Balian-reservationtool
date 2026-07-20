import 'server-only';
import { getAdminSession } from './admin';
import { getStaffSession } from './staff';

export type CurrentActor =
  { type: 'admin'; adminId: string } | { type: 'staff' } | { type: 'anonymous' };

/**
 * 管理者は一般スタッフの全操作を行えるため、管理者セッションを優先的に判定する。
 * (docs/01-requirements.md 3-2)
 */
export async function getCurrentActor(): Promise<CurrentActor> {
  const admin = await getAdminSession();
  if (admin) {
    return { type: 'admin', adminId: admin.adminId };
  }
  const staff = await getStaffSession();
  if (staff) {
    return { type: 'staff' };
  }
  return { type: 'anonymous' };
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/** 一般スタッフ・管理者のどちらでも許可する操作向け(予約系Server Actionsで使用) */
export async function requireStaffOrAdmin(): Promise<CurrentActor> {
  const actor = await getCurrentActor();
  if (actor.type === 'anonymous') {
    throw new UnauthorizedError('ログインが必要です');
  }
  return actor;
}

/** 管理者専用操作向け(施設マスター・利用停止・アナリティクス等) */
export async function requireAdmin(): Promise<Extract<CurrentActor, { type: 'admin' }>> {
  const actor = await getCurrentActor();
  if (actor.type !== 'admin') {
    throw new UnauthorizedError('この操作には管理者権限が必要です');
  }
  return actor;
}
