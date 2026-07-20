-- docs/05-database-design.md 2-5章に基づく追加制約。
-- Prismaのスキーマ言語では表現できないため、`prisma migrate dev --name init` で
-- 基本テーブルを作成した後、以下の手順で追加する。
--
-- 1. npx prisma migrate dev --create-only --name reservation_constraints
-- 2. 生成された空の migration.sql の中身を、このファイルの内容で置き換える
-- 3. npx prisma migrate dev で適用する

-- 重複予約防止のためのGiSTインデックスにfacility_id(UUID)を使えるようにする拡張
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 予約者区分と部屋番号/氏名の整合性チェック
-- (宿泊中 → room_idのみ必須、チェックイン前/チェックアウト後 → guest_nameのみ必須)
ALTER TABLE "reservations" ADD CONSTRAINT "chk_guest_type_fields" CHECK (
  ("guest_type" = 'staying' AND "room_id" IS NOT NULL AND "guest_name" IS NULL)
  OR
  ("guest_type" IN ('before_checkin', 'after_checkout') AND "guest_name" IS NOT NULL AND "room_id" IS NULL)
);

-- 終了日時が開始日時より後であることの保証
ALTER TABLE "reservations" ADD CONSTRAINT "chk_reservation_time_order" CHECK ("end_at" > "start_at");

-- 重複予約防止の本体:同一施設・時間帯が重なる予約を確定的に拒否する。
-- キャンセル済み予約(status = 'cancelled')は判定対象から除外する(部分EXCLUDE制約)。
ALTER TABLE "reservations" ADD CONSTRAINT "excl_reservation_overlap" EXCLUDE USING gist (
  "facility_id" WITH =,
  tsrange("start_at", "end_at", '[)') WITH &&
) WHERE ("status" <> 'cancelled');

-- 利用停止期間の整合性(終了日時未定なら end_at は NULL、それ以外は start_at より後)
ALTER TABLE "facility_closures" ADD CONSTRAINT "chk_closure_period" CHECK (
  ("is_indefinite" = true AND "end_at" IS NULL)
  OR
  ("is_indefinite" = false AND "end_at" IS NOT NULL AND "end_at" > "start_at")
);
