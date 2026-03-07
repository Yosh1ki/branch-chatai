# 技術設計書

## アーキテクチャ概要
既存の Next.js App Router + Auth.js + Prisma + PostgreSQL 構成に、設定画面から呼び出すアカウント削除機能を追加する。UI は `src/components/settings/` 配下のクライアントコンポーネントとして実装し、削除実行は認証済みユーザー向けの API ルートで受ける。サーバー側では `src/lib/` に削除専用のドメインロジックを置き、Prisma トランザクションでユーザー本人の関連データを一括削除する。

この機能では新しい永続データは追加しない。既存の `User`、`Account`、`Session`、`Chat`、`Message`、`Branch`、`UsageStat`、`UsageEvent` を削除対象として扱い、削除完了後は `/login` へ戻す。`AUTH_DISABLED=true` の開発モードでは `auth()` が固定ユーザーを毎回 `upsert` するため、通常の削除後状態を保証できない。したがって、このモードでは削除 API を未対応として失敗させる。

## 主要コンポーネント
### コンポーネント1：`DeleteAccountSection`
- 責務：設定画面内にアカウント削除の導線、警告文、確認ダイアログ、実行中/失敗状態を表示する
- 入力：ロケールに応じた翻訳文言
- 出力：`DELETE /api/account` の呼び出し、成功時の `/login` への遷移、失敗時のエラーメッセージ表示
- 依存関係：`src/components/settings/settings-sections.tsx`、`src/components/ui/button.tsx`、`@radix-ui/react-dialog`、`src/components/i18n/i18n-provider`

### コンポーネント2：`DELETE /api/account`
- 責務：認証済みユーザー本人からのアカウント削除要求を受け付け、削除サービスを呼び出してHTTPレスポンスを返す
- 入力：Auth.js セッション情報
- 出力：成功時は `{ success: true, redirectTo: "/login" }`、失敗時はエラー JSON と適切な HTTP ステータス
- 依存関係：`src/auth.ts`、`NextResponse`、`src/lib/account-deletion.ts`

### コンポーネント3：`deleteAccountData`
- 責務：ユーザー削除に必要な関連データ削除を Prisma トランザクションで一貫実行する
- 入力：`userId`
- 出力：削除完了の成否。成功時は値を返さず完了し、失敗時は例外を送出する
- 依存関係：`src/lib/prisma.ts`、Prisma Client、既存の `users` / `accounts` / `sessions` / `chats` / `messages` / `branches` / `usage_stats` / `usage_events` テーブル

## データモデル
### 既存エンティティ：`User`
- `id`：`String`、削除対象の主キー
- `email`：`String`、設定画面の本人情報表示に利用
- `planType`：`PlanType`、画面内の既存表示で利用。削除判定条件には使わない
- `stripeCustomerId` / `stripeSubscriptionId` / `stripeSubscriptionStatus`：`String?`、アプリ内の課金状態として保持される既存フィールド

### 既存エンティティ：認証関連
- `Account.userId`：`String`、Google OAuth アカウントのひも付け。削除対象
- `Session.userId`：`String`、ログインセッション。削除完了後の継続利用を防ぐため削除対象

### 既存エンティティ：利用データ
- `Chat.userId`：`String`、ユーザー所有のチャット
- `Message.chatId`：`String`、チャット配下メッセージ
- `Message.parentMessageId`：`String?`、自己参照。削除前に `null` 化可能
- `Message.branchId`：`String?`、ブランチ参照。削除前に `null` 化可能
- `Branch.chatId`：`String`、チャット配下ブランチ
- `Branch.parentMessageId`：`String`、分岐元メッセージ参照
- `UsageStat.userId`：`String`、日次利用量
- `UsageEvent.userId`：`String`、トークン利用イベント

### 削除用データ構造
- 新規DBスキーマは追加しない
- サーバー内部では `chatIds: string[]` を一時的に取得し、対象ユーザーのチャット配下データをまとめて削除する
- 返却レスポンスは `{ success: boolean, redirectTo?: string, error?: string }` の JSON 形式に統一する

## 処理フロー
1. 設定画面の `DeleteAccountSection` が破壊的操作セクションを表示し、ユーザーが削除ボタンを押す
2. クライアントで確認ダイアログを開き、ユーザーが最終確認を行った場合のみ `DELETE /api/account` を送信する
3. API ルートは `auth()` でセッションを確認し、未認証なら `401 Unauthorized` を返す
4. API ルートは `AUTH_DISABLED === "true"` の場合、削除後に固定ユーザーが再生成されるため `409 Conflict` で処理を中断する
5. API ルートは `deleteAccountData(userId)` を呼び出す
6. `deleteAccountData` は Prisma トランザクション内で対象ユーザーの `chatIds` を取得する
7. 同一トランザクション内で `UsageEvent`、`UsageStat`、`Session`、`Account` を `userId` で削除する
8. 対象チャットの `Message` を `updateMany` し、`branchId` と `parentMessageId` を `null` にして循環参照をほどく
9. `Branch`、`Message`、`Chat` を `chatIds` / `userId` ベースで削除し、最後に `User` を削除する
10. API ルートは成功レスポンスを返し、クライアントは `/login` へ画面遷移する

## エラーハンドリング
- 未認証アクセス：API は `401 Unauthorized` を返し、クライアントは削除完了扱いにせずエラー表示する
- `AUTH_DISABLED` 環境：API は `409 Conflict` を返し、開発モードでは削除未対応であることを表示する
- 対象ユーザーが存在しない：API は `404 Not Found` を返し、クライアントは `/login` へ戻すか再読み込みを促す
- 不正な削除対象指定：対象ユーザーIDはセッションからのみ取得し、リクエストボディやURLパラメータで任意指定させない
- DB削除失敗：サーバーログに詳細を出しつつ、クライアントには汎用エラーを返す。Prisma トランザクションにより部分削除を防ぐ
- ネットワーク失敗：クライアントは実行中状態を解除し、再試行可能なエラー表示を行う

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/components/settings/settings-sections.tsx`：設定画面にアカウント削除セクションを追加する
  - `src/lib/i18n/dictionaries/ja.ts`：削除導線、警告、確認、失敗文言を追加する
  - `src/lib/i18n/dictionaries/en.ts`：英語文言を追加する
  - `src/auth.ts`：既存の `AUTH_DISABLED` 挙動を前提条件として利用し、削除API側の制約と整合させる

- 新規作成ファイル：
  - `src/components/settings/delete-account-section.tsx`：確認ダイアログ付きの削除UI
  - `src/app/api/account/route.ts`：アカウント削除 API
  - `src/lib/account-deletion.ts`：削除順序を管理するトランザクションロジック
  - `tests/account-deletion.test.js`：削除サービスまたは API の振る舞い検証
