import { redirect } from 'next/navigation';
import { getStaffSession } from '@/lib/auth/staff';

export default async function StaffProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getStaffSession();
  if (!session) {
    redirect('/staff/login');
  }

  return <div className="bg-muted/20 min-h-screen">{children}</div>;
}
