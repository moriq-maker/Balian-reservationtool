import { redirect } from 'next/navigation';

// 静的プリレンダーされるとVercelのエッジキャッシュがデプロイをまたいで
// 古いリダイレクト先を返し続けることがあるため、常に動的にレンダリングする。
export const dynamic = 'force-dynamic';

export default function Home() {
  redirect('/staff');
}
