import 'server-only';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createSessionToken, verifySessionToken, type SessionPayload } from '@/lib/session';
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_MAX_AGE_SECONDS } from './constants';

interface AdminSessionPayload extends SessionPayload {
  role: 'admin';
  adminId: string;
}

function getAdminSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET が設定されていません');
  }
  return secret;
}

export async function verifyAdminCredentials(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) {
    return null;
  }
  const matches = await bcrypt.compare(password, admin.passwordHash);
  if (!matches) {
    return null;
  }
  return admin;
}

export async function createAdminSession(adminId: string): Promise<void> {
  const token = createSessionToken(
    { role: 'admin', adminId },
    getAdminSecret(),
    ADMIN_SESSION_MAX_AGE_SECONDS,
  );
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionToken<AdminSessionPayload>(token, getAdminSecret());
}

export async function destroyAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
