'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminSession, destroyAdminSession, verifyAdminCredentials } from '@/lib/auth/admin';
import { createStaffSession, verifyStaffAccessCode } from '@/lib/auth/staff';

export interface AuthActionState {
  error?: string;
}

function getClientIdentifier(headerList: Headers): string {
  return headerList.get('x-forwarded-for') ?? headerList.get('x-real-ip') ?? 'unknown';
}

export async function staffLoginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const code = String(formData.get('code') ?? '').trim();
  if (!/^\d{6}$/.test(code)) {
    return { error: 'アクセスコードは6桁の数字で入力してください。' };
  }

  const headerList = await headers();
  const identifier = getClientIdentifier(headerList);
  const result = await verifyStaffAccessCode(code, identifier);
  if (!result.success) {
    return { error: result.error ?? 'アクセスコードが正しくありません。' };
  }

  await createStaffSession();
  redirect('/staff');
}

export async function adminLoginAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください。' };
  }

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    return { error: 'メールアドレスまたはパスワードが正しくありません。' };
  }

  await createAdminSession(admin.id);
  redirect('/admin');
}

export async function adminLogoutAction(): Promise<void> {
  await destroyAdminSession();
  redirect('/admin/login');
}
