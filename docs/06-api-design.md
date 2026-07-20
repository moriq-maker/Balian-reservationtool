# 06. API設計書

Next.js App RouterのServer Actionsを基本とし、Cron/外部トリガー用にのみRoute Handler(REST的なAPI Route)を用意する方針とする。権限区分は「一般スタッフ(認証コードセッションのみ)」「管理者(共通アカウントログイン済み)」の2種類。

## 1. 予約系

### getReservations(予約一覧取得)

- 種別:Server Action(読み取り)
- リクエスト:`{ date: string(YYYY-MM-DD), includeCancelled?: boolean }`
- レスポンス:`{ reservations: Reservation[] }`(施設情報・部屋番号/氏名を含む)
- 権限:スタッフ/管理者共通
- 備考:呼び出し時に [03-notification-jobs.md](03-notification-jobs.md) の同期処理(利用完了化・清掃中化・通知生成)を実行してから結果を返す。

### checkAvailability(空き状況確認)

- 種別:Server Action
- リクエスト:`{ facilityId: string, startAt: string, endAt: string, excludeReservationId?: string }`
- レスポンス:`{ available: boolean, conflictingReservation?: {...} }`
- 権限:共通
- バリデーション:facilityIdの存在・有効性
- 用途:新規予約モーダル/変更モーダルでの事前チェック(最終防御はDB制約)

### createReservation(新規予約)

- 種別:Server Action(書き込み、トランザクション必須)
- リクエスト:`{ guestType, roomId?, guestName?, facilityId, startAt, note? }`
- 処理:施設の`duration_minutes`から`endAt`をサーバー側で算出(クライアントの計算値は信用しない)
- レスポンス:`{ reservation: Reservation }` または `{ error: { code, message } }`
- バリデーション:[07. バリデーション一覧](#7-バリデーション一覧)参照
- 権限:共通
- 想定エラー:重複予約(`23P01`)、予約可能期間外、施設利用停止中、施設無効化、入力不備
- トランザクション:必要(予約INSERT + audit_logs INSERT + notifications INSERTを同一トランザクションで実行)

### updateReservation(予約変更)

- 種別:Server Action(書き込み、トランザクション必須)
- リクエスト:`{ reservationId, lockVersion, guestType?, roomId?, guestName?, facilityId?, startAt?, note? }`
- 処理:施設または開始日時変更時は`endAt`を再計算し重複チェック
- 権限:共通
- 想定エラー:楽観的ロック不一致、重複予約、施設利用停止/無効化
- トランザクション:必要(UPDATE + audit_logs INSERT + notifications INSERT)

### cancelReservation(予約キャンセル)

- 種別:Server Action
- リクエスト:`{ reservationId, lockVersion, reason? }`
- 処理:`status = 'cancelled'`に更新(物理削除しない)
- 権限:共通
- トランザクション:必要(UPDATE + audit_logs + notifications)

### markInUse(利用中への変更)

- 種別:Server Action
- リクエスト:`{ reservationId, lockVersion }`
- 処理:`status = 'reserved' → 'in_use'`(他ステータスからの遷移は拒否)
- 権限:共通

### moveReservation(ドラッグ&ドロップ移動)

- 種別:Server Action(書き込み、トランザクション必須)
- リクエスト:`{ reservationId, lockVersion, newFacilityId, newStartAt }`
- 処理:`updateReservation`と同様のロジックを共有(内部的に同一関数を呼ぶ)。施設変更時は確認モーダル通過後にのみ呼び出される想定
- 権限:共通
- 想定エラー:重複予約、施設利用停止/無効化、楽観的ロック不一致

### completeCleaning(清掃完了)

- 種別:Server Action
- リクエスト:`{ facilityId }`
- 処理:`facilities.is_cleaning = false`、`cleaning_started_at = NULL`
- 権限:共通
- バリデーション:`has_cleaning = true`の施設のみ許可

## 2. 施設・部屋マスター系(管理者専用)

### listFacilities / createFacility / updateFacility / deactivateFacility

- 種別:Server Action
- 権限:**管理者のみ**(一般スタッフが呼んだ場合は403相当のエラー「この操作には管理者権限が必要です」)
- createFacility リクエスト:`{ categoryId, name, durationMinutes, displayOrder, color, hasCleaning, description?, adminNote? }`
- updateFacility リクエスト:`{ facilityId, ...変更項目 }`
- deactivateFacility リクエスト:`{ facilityId }` → `is_active = false`(物理削除しない)
- トランザクション:更新系はaudit_logs記録と合わせて必要

### setFacilityClosure(施設利用停止設定)

- 種別:Server Action(トランザクション必須)
- リクエスト:`{ facilityId, startAt, endAt?, isIndefinite, reason }`
- 処理フロー:
  1. 対象期間と重複する予約(`reserved`/`in_use`)を検索
  2. 重複がなければそのまま`facility_closures`にINSERT
  3. 重複がある場合はレスポンスで一覧を返し、クライアントに選択させる(中止 or 一括キャンセルして停止)
- レスポンス(重複あり時):`{ requiresConfirmation: true, conflictingReservations: [...] }`
- 権限:管理者のみ

### confirmFacilityClosureWithBulkCancel(重複予約を一括キャンセルして利用停止確定)

- 種別:Server Action(トランザクション必須)
- リクエスト:`{ facilityId, startAt, endAt?, isIndefinite, reason, conflictingReservationIds: string[] }`
- 処理:対象予約をすべて`cancelled`に更新(理由="施設利用停止に伴う一括キャンセル")→ `facility_closures`にINSERT → 各予約・停止設定をaudit_logsに記録 → 利用停止通知を作成
- 権限:管理者のみ

### releaseFacilityClosure(利用停止解除)

- 種別:Server Action
- リクエスト:`{ closureId }` → `released_at = now()`
- 権限:管理者のみ

### listRooms / createRoom / updateRoom / deactivateRoom

- 種別:Server Action、権限:管理者のみ。部屋番号マスターのCRUD(無効化のみ、物理削除なし)。

## 3. 通知系

### listNotifications(通知一覧取得)

- 種別:Server Action、権限:共通
- レスポンス:`{ notifications: Notification[] }`(新しい順)

### markNotificationRead(通知既読化)

- 種別:Server Action
- リクエスト:`{ notificationId }` または `{ markAllAsRead: true }`
- 処理:`is_read = true`(全スタッフ共通で反映)
- 権限:共通

## 4. 履歴系

### getReservationHistory(予約単位の履歴取得)

- 種別:Server Action
- リクエスト:`{ reservationId }`
- レスポンス:`audit_logs`から`entity_type='reservation' AND entity_id=?`を時系列取得
- 権限:共通

### searchAuditLogs(履歴検索)

- 種別:Server Action
- リクエスト:`{ entityType?, action?, actorType?, dateFrom?, dateTo?, page, pageSize }`
- 権限:**管理者のみ**

## 5. アナリティクス系(管理者専用)

### getAnalytics(集計取得)

- 種別:Server Action
- リクエスト:`{ dateFrom, dateTo, facilityIds?, categoryIds?, guestTypes?, statuses?, includeCancelled: boolean, granularity: 'day'|'week'|'month'|'hour' }`
- レスポンス:施設別件数、期間別推移、時間帯別利用数、予約者区分割合など(→[08-analytics.md](08-analytics.md))
- 権限:管理者のみ
- 備考:集計はAsia/Tokyo基準で行う(UTC保存データを変換してから集計)

## 6. 管理者認証系

### adminLogin(管理者ログイン)

- 種別:Server Action
- リクエスト:`{ email, password }`
- 処理:パスワードハッシュ照合 → セッションCookie発行(管理者用、httpOnly/secure/sameSite=strict)
- レスポンス:成功時リダイレクト、失敗時「メールアドレスまたはパスワードが正しくありません」
- 権限:未認証で呼び出し可能(ログイン自体のため)

### adminLogout(管理者ログアウト)

- 種別:Server Action
- 処理:管理者セッションCookieを破棄

### システム設定変更(updateSystemSetting)

- 種別:Server Action
- リクエスト:`{ key, value }`(例:`{ key: 'reservation_window_days', value: 5 }`)
- 権限:管理者のみ
- トランザクション:system_settings UPDATE + audit_logs INSERT

## 7. バリデーション一覧

フロントエンド(Zod + React Hook Form)・サーバーサイド(同一Zodスキーマを共有)の両方で以下を検証する。

| 検証項目 | エラーメッセージ例 |
|---|---|
| 予約者区分が未選択 | 「予約者区分を選択してください」 |
| 宿泊中なのに部屋番号未選択 | 「部屋番号を選択してください」 |
| チェックイン前/後なのに氏名未入力 | 「利用者名を入力してください」 |
| 施設未選択 | 「施設を選択してください」 |
| 開始日時未選択 | 「利用開始日時を選択してください」 |
| 予約可能期間外 | 「予約可能期間は本日から{N}日先までです」 |
| 15分単位でない | (UI上選択式のため通常発生しないが)「開始時刻は15分単位で選択してください」 |
| 重複予約 | 「選択した時間帯には、すでに{施設名}の予約が入っています。別の時間を選択してください。」 |
| 施設利用停止中 | 「この施設は現在利用停止中です」 |
| 施設が無効化されている | 「この施設は現在利用できません」 |
| 氏名・備考が長すぎる(氏名50文字、備考500文字を上限の目安とする) | 「入力できる文字数を超えています」 |
| 不正なHTML/スクリプト入力 | サーバー側でサニタイズ(自動除去)し、疑わしい入力はエラーではなく無害化して保存する |
| 管理者専用操作を一般スタッフが実行 | 「この操作には管理者権限が必要です」 |
| 楽観的ロック不一致 | 「他の端末で予約内容が変更されました。最新情報を再読み込みしてください」 |
| 通信エラー | 「通信に失敗しました。ネットワークを確認して、もう一度お試しください」 |
| 保存処理中の多重送信 | ボタン無効化+「保存中です。しばらくお待ちください」表示で防止 |

技術的なエラー内容・スタックトレースは一般スタッフ向け画面には表示せず、サーバー側のエラーログにのみ記録する。
