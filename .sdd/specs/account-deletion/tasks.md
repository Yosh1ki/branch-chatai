# 実装タスクリスト

## セクション1：データモデル実装
- [x] 1.1 アカウント削除レスポンス型と削除対象データの内部構造を定義する
  - `deleteAccountData` が扱う `chatIds` と API 応答形式を設計どおりに整理する
  - 成功/失敗レスポンスの取り扱いを実装側で統一できるようにする
- [x] 1.2 アカウント削除用の永続化ロジックを実装する
  - Prisma トランザクション内で `UsageEvent`、`UsageStat`、`Session`、`Account`、`Branch`、`Message`、`Chat`、`User` を削除する
  - `Message.parentMessageId` と `Message.branchId` の参照整理を含めて削除順序を実装する

## セクション2：ビジネスロジック実装
- [x] 2.1 `deleteAccountData` のコア処理を実装する
  - design.md の処理フロー 5-9 に対応する削除フローを `src/lib/account-deletion.ts` に実装する
  - 対象ユーザー未存在時の扱いを定義する
- [x] 2.2 `DELETE /api/account` の処理を実装する
  - design.md の処理フロー 3-5、10 に対応する認証確認、`AUTH_DISABLED` 判定、レスポンス返却を実装する
  - セッション由来の `userId` のみで削除対象を決定する
- [x] 2.3 エラーハンドリングを実装する
  - `401`、`404`、`409`、`500` の返し分けを行う
  - DB失敗と想定外エラーのサーバーログ出力とクライアント向けメッセージを整理する

## セクション3：インターフェース実装
- [x] 3.1 設定画面のアカウント削除 UI を作成する
  - `src/components/settings/delete-account-section.tsx` を追加し、破壊的操作と分かる見た目で導線を表示する
  - `src/components/settings/settings-sections.tsx` に統合する
- [x] 3.2 削除確認ダイアログと実行状態制御を実装する
  - `@radix-ui/react-dialog` を用いて確認ステップを追加する
  - 実行中の二重送信防止、失敗表示、成功時の `/login` 遷移を実装する
- [x] 3.3 文言とAPI入出力の整合を実装する
  - `src/lib/i18n/dictionaries/ja.ts` と `src/lib/i18n/dictionaries/en.ts` に削除関連文言を追加する
  - API の JSON 応答を UI 側で解釈して適切に表示できるようにする

## セクション4：統合とテスト
- [x] 4.1 設定画面、API、削除ロジックを統合する
  - UI から API、API から削除サービスへの接続を確認する
  - `AUTH_DISABLED` 環境での制約がUI/サーバーで矛盾しないことを確認する
- [x] 4.2 基本的な動作テストを実装する
  - `tests/account-deletion.test.js` を追加し、成功、未認証、`AUTH_DISABLED`、削除失敗のケースを検証する
  - 必要に応じて削除サービス単体と API レイヤーの両方を検証する
- [x] 4.3 要件の受入基準を満たすことを確認する
  - 設定画面に削除導線が表示されることを確認する
  - 確認ステップなしでは削除されないこと、削除後に再ログインが必要になることを確認する
