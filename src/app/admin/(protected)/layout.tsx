import { redirect } from 'next/navigation';
import { adminLogoutAction } from '@/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { getAdminSession } from '@/lib/auth/admin';

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="bg-muted/20 min-h-screen">
      <header className="bg-background flex items-center justify-between border-b px-6 py-3">
        <span className="font-bold">管理者画面</span>
        <form action={adminLogoutAction}>
          <Button type="submit" variant="outline" size="sm">
            ログアウト
          </Button>
        </form>
      </header>
      {children}
    </div>
  );
}
