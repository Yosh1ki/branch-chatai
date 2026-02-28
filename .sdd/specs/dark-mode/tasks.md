# 実装タスクリスト

## セクション1：データモデル実装
- [x] 1.1 テーマ設定の型定義・データ構造を作成する（目安: 1時間）
  - design.md のデータモデルに従い、`ThemePreference`（`light`/`dark`）を Prisma enum として実装
  - `User.themePreference` を追加し、デフォルト値を `light` に設定
- [x] 1.2 テーマ設定のデータ永続化層を実装する（目安: 2時間）
  - マイグレーション（`prisma/migrations/*/migration.sql`）を作成してDBスキーマを更新
  - `src/lib/theme-preference.ts` に取得/更新のCRUD操作とバリデーションを実装

## セクション2：ビジネスロジック実装
- [x] 2.1 ThemePreferenceRepository のコア処理を実装する（目安: 2時間）
  - design.md の処理フロー1-3に対応（ユーザー特定、初期テーマ取得、切替保存）
  - `auth` + `prisma` を使ってユーザー単位のテーマ読み書きを実装
- [x] 2.2 ThemeProvider の処理を実装する（目安: 2時間）
  - design.md の処理フロー4-5に対応（DB同期値を反映、再訪時復元）
  - `document.documentElement` の `dark` クラス同期と `localStorage["branch.theme"]` 同期を実装
- [x] 2.3 エラーハンドリングを実装する（目安: 1-2時間）
  - design.md で定義したエラーケース1-4（保存失敗、不正値、初期取得失敗、色残存）への対処を実装
  - 失敗時のフォールバック（`light`）と再試行/通知導線を追加

## セクション3：インターフェース実装
- [x] 3.1 UIコンポーネントを作成・統合する（目安: 2時間）
  - `src/components/theme/theme-provider.tsx` と `src/components/theme/theme-toggle.tsx` を作成
  - `src/app/settings/page.tsx` にテーマ設定セクションを追加
- [x] 3.2 入力バリデーションを実装する（目安: 1時間）
  - テーマ更新入力を `light | dark` のみ許可する検証を実装
  - 不正入力時の拒否または `light` フォールバックを実装
- [x] 3.3 出力フォーマット（表示テーマ）を実装する（目安: 2-3時間）
  - `src/app/globals.css` のテーマトークンを調整し、ダーク配色を定義
  - `src/app/chats/page.tsx`、`src/components/chats/account-menu.tsx`、`src/components/chats/prompt-card.tsx`、`src/components/ChatCanvasShell.tsx`、`src/components/UserBubble.tsx` をテーマ対応

## セクション4：統合とテスト
- [x] 4.1 コンポーネントを統合する（目安: 1-2時間）
  - `src/app/layout.tsx` に ThemeProvider を組み込み、主要画面へ適用
  - 設定画面での変更がチャット一覧・チャット詳細へ反映されるデータフローを確認
- [x] 4.2 基本的な動作テストを実装する（目安: 2-3時間）
  - ユニットテスト：テーマ値バリデーション、フォールバック、保存ロジック
  - 統合テスト：切替時即時反映、再読み込み後保持、再ログイン後保持
- [x] 4.3 要件の受入基準を満たすことを確認する（目安: 1-2時間）
  - requirements.md の要件1-3の受入基準チェックを実施
  - 主要UI（本文、入力欄、ボタン、分岐線、ミニマップ）の可読性・コントラストを確認
