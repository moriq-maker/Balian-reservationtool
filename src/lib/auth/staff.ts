import 'server-only';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken, verifySessionToken, type SessionPayload } from '@/lib/session';
import {
  STAFF_ACCESS_CODE_SETTING_KEY,
  STAFF_SESSION_COOKIE,
  STAFF_SESSION_MAX_AGE_SECONDS,
} from './constants';

interface StaffAccessCodeSetting {
  hash: string;
  version: number;
}

interface StaffSessionPayload extends SessionPayload {
  role: 'staff';
  codeVersion: number;
}

function getStaffSecret(): string {
  const secret = process.env.STAFF_SESSION_SECRET;
  if (!secret) {
    throw new Error('STAFF_SESSION_SECRET が設定されていません');
  }
  return secret;
}

// 簡易的な試行回数制限。同一サーバーインスタンスのメモリ上でのみ有効なため、
// Vercelの複数インスタンス/再起動をまたいだ永続的な制限にはならない(既知の制約、将来的にDBやKVでの実装に置き換える)。
const attemptStore = new Map<string, { count: number; blockedUntil?: number }>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 10 * 60 * 1000;

function isBlocked(identifier: string): boolean {
  const entry = attemptStore.get(identifier);
  if (!entry?.blockedUntil) return false;
  if (Date.now() > entry.blockedUntil) {
    attemptStore.delete(identifier);
    return false;
  }
  return true;
}

function recordFailedAttempt(identifier: string): void {
  const entry = attemptStore.get(identifier) ?? { count: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }
  attemptStore.set(identifier, entry);
}

function clearAttempts(identifier: string): void {
  attemptStore.delete(identifier);
}

async function getAccessCodeSetting(): Promise<StaffAccessCodeSetting | null> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: STAFF_ACCESS_CODE_SETTING_KEY },
  });
  if (!setting) return null;
  const value = setting.value as unknown as StaffAccessCodeSetting;
  if (typeof value?.hash !== 'string' || typeof value?.version !== 'number') {
    return null;
  }
  return value;
}

export async function verifyStaffAccessCode(
  code: string,
  identifier: string,
): Promise<{ success: boolean; error?: string }> {
  if (isBlocked(identifier)) {
    return {
      success: false,
      error: '試行回数の上限に達しました。しばらく時間をおいて再度お試しください。',
    };
  }

  const setting = await getAccessCodeSetting();
  if (!setting) {
    return {
      success: false,
      error: '共通アクセスコードが設定されていません。管理者にお問い合わせください。',
    };
  }

  const matches = await bcrypt.compare(code, setting.hash);
  if (!matches) {
    recordFailedAttempt(identifier);
    return { success: false, error: 'アクセスコードが正しくありません。' };
  }

  clearAttempts(identifier);
  return { success: true };
}

export async function createStaffSession(): Promise<void> {
  const setting = await getAccessCodeSetting();
  const codeVersion = setting?.version ?? 0;
  const token = createSessionToken(
    { role: 'staff', codeVersion },
    getStaffSecret(),
    STAFF_SESSION_MAX_AGE_SECONDS,
  );
  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

/**
 * セッションを検証する。アクセスコードが管理者によって再発行されていた場合
 * (codeVersionが現在の値と異なる場合)は、古いセッションを無効として扱う。
 * これにより「全セッションの強制無効化」(docs/07-auth-security.md 1-2)を実現する。
 */
export async function getStaffSession(): Promise<StaffSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  const payload = verifySessionToken<StaffSessionPayload>(token, getStaffSecret());
  if (!payload) return null;

  const setting = await getAccessCodeSetting();
  if (!setting || setting.version !== payload.codeVersion) {
    return null;
  }
  return payload;
}
