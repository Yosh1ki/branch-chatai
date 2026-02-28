# 技術設計書

## アーキテクチャ概要
本機能は既存の Next.js App Router + API ルート + LangGraph 構成へ追加統合する。`/api/chat` から呼ばれる `runChatGraph` の中で日次上限判定を行っているため、上限判定の基準日計算を `src/lib` の共通ロジックへ集約し、判定・加算の両方で同一の基準日を使用する。

日付境界はクライアント時刻やアプリサーバーのローカル時刻ではなく、PostgreSQL の現在時刻（`now()`）を起点に計算する。これにより、ユーザー端末の時計変更や実行環境タイムゾーン差分の影響を受けない日次上限判定を実現する。

## 主要コンポーネント
### コンポーネント1：UsageDayResolver
- 責務：固定タイムゾーン・固定リセット時刻に基づき、日次上限判定用の `usageDay`（`Date`）を算出する。
- 入力：Prismaクライアント、基準タイムゾーン、リセット時刻（時・分）。
- 出力：`usageDay`（`usage_stats.date` と同じ `@db.Date` で比較可能な日付）。
- 依存関係：PostgreSQL（`now()` とタイムゾーン変換）、`src/lib/prisma.ts`。

### コンポーネント2：DailyLimitGuard
- 責務：Freeプラン時に `usageDay` 単位で `usage_stats.message_count` を照会し、上限到達時に 429 を返す。
- 入力：`userId`、`planType`、`usageDay`、日次上限値（既定10）。
- 出力：判定結果（許可）または `ChatActionError(429)`。
- 依存関係：`UsageStat` テーブル、`UsageDayResolver`、`src/lib/chat-errors.ts`。

### コンポーネント3：UsageCounterUpdater
- 責務：メッセージ永続化後に Freeプランの利用件数を `usageDay` で upsert/increment する。
- 入力：`userId`、`planType`、`usageDay`。
- 出力：更新済み使用量レコード（または更新完了）。
- 依存関係：`prisma.usageStat.upsert`、`UsageDayResolver`。

### コンポーネント4：ChatGraph Integration
- 責務：`usage` ノードで算出した `usageDay` を Graph state に保持し、`persist` ノードで再利用する。
- 入力：`GraphState`（`userId`、`planType` など）。
- 出力：`usageDay` を含む更新済み `GraphState`。
- 依存関係：`src/lib/chat-request-graph.ts`、`DailyLimitGuard`、`UsageCounterUpdater`。

## データモデル
### UsageStat（既存）
- `id`：`String`、主キー。
- `userId`：`String`、ユーザーID。
- `date`：`DateTime(@db.Date)`、日次上限判定のキー日付（`usageDay`）。
- `messageCount`：`Int`、当該日の送信済みメッセージ件数。
- `createdAt`：`DateTime`、作成日時。
- `updatedAt`：`DateTime`、更新日時。
- 制約：`@@unique([userId, date])`。

### DailyLimitWindow（アプリ内構造体・新規）
- `timezone`：`string`、日付境界計算に使う固定タイムゾーン。
- `resetHour`：`number`、リセット時刻（時）。
- `resetMinute`：`number`、リセット時刻（分）。
- `usageDay`：`Date`、上限判定と加算で共通使用する日付キー。

## 処理フロー
1. `/api/chat` の `POST` から `runChatGraph` を実行する。
2. `validate` ノードでユーザー/プラン情報を確定する。
3. `usage` ノードで `UsageDayResolver` を呼び、DB時刻ベースの `usageDay` を算出する。
4. `DailyLimitGuard` が `usage_stats(user_id, usageDay)` を照会し、Freeプランで上限到達なら 429 を返す。
5. 上限未到達の場合のみ、履歴構築・安全性チェック・モデル応答生成を進める。
6. `persist` ノードでメッセージ保存後、`UsageCounterUpdater` が同じ `usageDay` で `usage_stats` を upsert/increment する。
7. 次回リクエスト時、同じロジックで新しい `usageDay` が算出され、境界時刻を跨いだ場合に自動で新規日としてカウントされる。

## エラーハンドリング
- エラーケース1：基準タイムゾーンまたはリセット時刻設定が不正。
- 対処法：起動時または初回利用時に設定検証を行い、無効値は 500（設定エラー）として記録する。

- エラーケース2：`usageDay` 算出時のDBアクセス失敗。
- 対処法：`ChatActionError` ではなく内部エラーとして扱い、500 を返しつつサーバーログに原因を記録する。

- エラーケース3：日次上限到達。
- 対処法：`ChatActionError("Daily message limit reached", 429)` を返し、UIには上限到達を明示する。

- エラーケース4：境界時刻付近での判定不整合（時刻源の混在）。
- 対処法：判定・加算の双方で `UsageDayResolver` の戻り値のみを使用し、`new Date().setHours(...)` は利用しない。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/lib/usage-limits.ts`：固定タイムゾーンとリセット時刻の定義、および日次上限関連設定の整理。
  - `src/lib/usage-limiter.ts`：`getStartOfToday()` 依存を除去し、`usageDay` ベース判定へ変更。
  - `src/lib/chat-request-graph.ts`：`GraphState` に `usageDay` を追加し、`usage`/`persist` ノードで共通利用。
  - `tests/usage-limiter.test.js`：固定タイムゾーン基準の判定ケースを追加。

- 新規作成ファイル：
  - `src/lib/usage-day.ts`：DB時刻ベースで `usageDay` を導出する専用モジュール。
  - `tests/usage-day.test.ts`：境界時刻（直前/直後）とタイムゾーン固定のユニットテスト。
