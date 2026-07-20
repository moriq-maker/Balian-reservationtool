import { AdminLoginForm } from './login-form';

// 静的プリレンダーされるとVercelのエッジキャッシュがデプロイをまたいで
// 古いビルドのServer Action参照を返し続けることがあるため、常に動的にレンダリングする。
export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return <AdminLoginForm />;
}
