# 実装タスクリスト

## セクション1：データモデル実装
- [x] 1.1 必要な型定義・データ構造を作成する
  - `src/lib/usage-day.ts` に `DailyLimitWindow` と `usageDay` 算出用の型/戻り値構造を実装する
  - 固定タイムゾーン・固定リセット時刻の設定値バリデーション（時:0-23、分:0-59、タイムゾーン文字列）を実装する
- [x] 1.2 データ永続化層を実装する
  - `UsageDayResolver` で PostgreSQL `now()` を基準に `usageDay` を取得するクエリを実装する
  - `usage_stats` の日付キー（`userId + date`）で参照・upsert できるヘルパーを整備する

## セクション2：ビジネスロジック実装
- [x] 2.1 UsageDayResolver のコア処理を実装する
  - design.md の処理フロー1-3に対応（`/api/chat` 実行時に DB時刻ベースで `usageDay` 算出）
- [x] 2.2 DailyLimitGuard / UsageCounterUpdater の処理を実装する
  - design.md の処理フロー4-5に対応（上限判定で 429、未到達時のみ後続処理実行）
  - design.md の処理フロー6-7に対応（同一 `usageDay` で increment し、日付境界跨ぎを自動反映）
- [x] 2.3 エラーハンドリングを実装する
  - design.md で定義されたエラーケース1-4（設定不正、DB失敗、上限到達、時刻源混在）をそれぞれ処理する

## セクション3：インターフェース実装
- [x] 3.1 APIエンドポイント統合を実装する
  - `src/lib/chat-request-graph.ts` の `usage` / `persist` ノードへ `usageDay` 受け渡しを追加する
  - `src/lib/usage-limiter.ts` から `getStartOfToday()` 依存を除去し、新ロジックへ差し替える
- [x] 3.2 入力バリデーションを実装する
  - タイムゾーン設定値・リセット時刻設定値の検証失敗時に 500 扱いで安全に失敗させる
- [x] 3.3 出力フォーマットを実装する
  - 上限到達時レスポンスを既存仕様どおり `ChatActionError("Daily message limit reached", 429)` に統一する
  - 既存 `/api/chat` エラー整形（JSON/SSE）にそのまま載ることを確認する

## セクション4：統合とテスト
- [x] 4.1 コンポーネントを統合する
  - `UsageDayResolver` / `DailyLimitGuard` / `UsageCounterUpdater` を `ChatGraph Integration` に接続する
  - 判定と加算で同一 `usageDay` が使われるデータフローを確認する
- [x] 4.2 基本的な動作テストを実装する
  - `tests/usage-day.test.js` で境界時刻（直前/直後）と固定タイムゾーン判定を追加する
  - `tests/usage-limiter.test.js` を更新し、上限判定ロジックの回帰を防ぐ
  - 必要に応じて `/api/chat` の 429 応答ケースを既存テストに追加する
- [x] 4.3 要件の受入基準を満たすことを確認する
  - 要件1：リセット時刻と基準タイムゾーンの仕様明文化を確認する
  - 要件2：サーバーローカル時刻非依存（DB時刻基準）を確認する
  - 要件3：リセット直前/直後で期待どおりに件数判定されることを確認する
