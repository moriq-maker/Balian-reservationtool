import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // マイグレーション(prisma migrate等)はCLIが直接DDLを実行するため、
  // トランザクションプーラーではなくセッションプーラー/直接接続(DIRECT_URL)を使う。
  // アプリ実行時の接続(src/lib/prisma.ts)は別途DATABASE_URLを使う。
  datasource: {
    url: process.env['DIRECT_URL'],
  },
});
