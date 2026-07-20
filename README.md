# ホテル地下施設 予約管理ツール

ホテル地下施設(カラオケ・岩盤浴・PJ・ランドリー)の予約管理をGoogleスプレッドシートからWebアプリへ移行するプロジェクトです。仕様の詳細は [docs/](docs/) 配下を参照してください。

- [docs/01-requirements.md](docs/01-requirements.md) 要件定義書
- [docs/05-database-design.md](docs/05-database-design.md) データベース設計・ER図
- [docs/10-deployment-operation.md](docs/10-deployment-operation.md) デプロイ・運用・開発フェーズ計画

## 技術構成

- Next.js(App Router)/ React / TypeScript
- Tailwind CSS + shadcn/ui
- Prisma(スキーマ管理)+ Supabase(PostgreSQL)
- 重複予約防止:PostgreSQLの部分EXCLUDE制約(`prisma/manual-migrations/`)

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com/)で開発用プロジェクトを作成する(無料枠で開始可能)。
2. Project Settings > Database から接続文字列(Connection string, "Session pooler"推奨)を取得する。
3. Project Settings > API から `URL` と `anon public key` を取得する。

### 3. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を開き、Supabaseから取得した値を設定してください。`.env` はGit管理対象外です。

### 4. データベースのマイグレーション

```bash
# 1. schema.prisma に基づく基本テーブルを作成
npx prisma migrate dev --name init

# 2. 重複予約防止のEXCLUDE制約など、Prismaで表現できない制約を追加
npx prisma migrate dev --create-only --name reservation_constraints
# 生成された prisma/migrations/<timestamp>_reservation_constraints/migration.sql の中身を
# prisma/manual-migrations/001_reservation_constraints.sql の内容で置き換えてから、以下を実行
npx prisma migrate dev
```

### 5. 初期データの投入

```bash
# 管理者アカウントのメール/パスワードを指定したい場合は環境変数で上書き可能
# SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD=xxxxxxxx npx prisma db seed
npx prisma db seed
```

施設6件・部屋番号58件・システム設定(予約可能日数など)・管理者アカウント1件が投入されます。**シードで作成される管理者パスワードは仮のものなので、本番投入前に必ず変更してください。**

### 6. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) で確認できます。

## よく使うコマンド

| コマンド               | 内容                                    |
| ---------------------- | --------------------------------------- |
| `npm run dev`          | 開発サーバー起動                        |
| `npm run build`        | 本番ビルド                              |
| `npm run lint`         | ESLintによる静的解析                    |
| `npm run format`       | Prettierによる自動整形                  |
| `npm run format:check` | Prettierのフォーマットチェックのみ      |
| `npx tsc --noEmit`     | 型チェック                              |
| `npx prisma studio`    | DBの中身をブラウザで確認                |
| `npx prisma generate`  | schema.prisma からPrisma Clientを再生成 |

## ディレクトリ構成(現時点)

```
docs/                          仕様書一式
prisma/
  schema.prisma                DBスキーマ定義
  manual-migrations/           PrismaのDSLで表現できない制約(EXCLUDE制約等)のSQL
  seed.ts                      初期データ投入スクリプト
src/
  app/                         Next.js App Router
  components/ui/               shadcn/uiコンポーネント
  lib/
    prisma.ts                  Prisma Clientの共有インスタンス
    utils.ts                   shadcn/ui付属のユーティリティ
  generated/prisma/            Prisma Clientの生成コード(Git管理対象外)
```

一般スタッフ画面・管理者画面・Server Actions等はフェーズ5以降で追加していきます。

## 現時点で未実装の部分

- 一般スタッフ画面・管理者画面のUI(フェーズ5〜9)
- 認証(共通アクセスコード・管理者ログイン、フェーズ5)
- 予約系Server Actions([docs/06-api-design.md](docs/06-api-design.md)、フェーズ7)
- 自動処理・通知([docs/03-notification-jobs.md](docs/03-notification-jobs.md)、フェーズ10〜11)
- アナリティクス(フェーズ13)
- テスト一式(フェーズ14)

開発は [docs/10-deployment-operation.md](docs/10-deployment-operation.md) の開発フェーズ計画に沿って、フェーズごとに進めます。
