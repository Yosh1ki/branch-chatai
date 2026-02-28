# 技術設計書

## アーキテクチャ概要
本機能は既存の Next.js App Router + React クライアント構成に、テーマ状態管理レイヤーを追加して統合する。  
サーバー側では Auth.js で特定したユーザーに対してテーマ設定を保存し、クライアント側では初期描画時に `html` 要素へ `dark` クラスを適用して即時反映する。  
UI は `globals.css` のデザイントークン（CSS変数）を中心に運用し、既存のハードコード色（`#f9f7f7` など）を段階的にテーマ対応トークンへ置換する。

## 主要コンポーネント
### コンポーネント1：ThemePreferenceRepository（サーバー）
- 責務：ユーザーのテーマ設定（light/dark）の取得・保存を Prisma 経由で提供する
- 入力：`userId`、`theme`（`"light"` or `"dark"`）
- 出力：永続化済みテーマ値、取得時の初期テーマ値
- 依存関係：`auth`、`prisma`、`prisma/schema.prisma` の `User` モデル

### コンポーネント2：ThemeProvider（クライアント）
- 責務：テーマ状態の保持、`document.documentElement` への `dark` クラス反映、UI への状態提供
- 入力：サーバーから渡された初期テーマ値、ユーザー操作イベント（切り替え）
- 出力：現在テーマ、切り替え関数、反映済み DOM 状態
- 依存関係：`src/app/layout.tsx`、`localStorage`（フォールバック）、テーマ切替UI

### コンポーネント3：ThemeSettingSection（設定画面）
- 責務：設定画面でのテーマ切替 UI 提供と保存トリガー
- 入力：現在テーマ、ユーザー選択値
- 出力：保存要求（Server Action または API 呼び出し）、保存結果表示
- 依存関係：`src/app/settings/page.tsx`、ThemeProvider、ThemePreferenceRepository

### コンポーネント4：ThemeTokenStyleLayer（スタイル）
- 責務：ライト/ダークで切り替わる色トークン定義と、主要UI部品のテーマ適用
- 入力：`.dark` クラス有無
- 出力：背景色・文字色・境界線・コネクタ・ミニマップ等の表示テーマ
- 依存関係：`src/app/globals.css`、各 TSX コンポーネントの className

## データモデル
### ThemePreference（Prisma enum）
- `light`：ライトモード
- `dark`：ダークモード

### User（既存モデル拡張）
- `themePreference`：`ThemePreference`、ユーザーのテーマ設定、`@default(light)`  
  既存の認証/課金情報とは独立し、ユーザー単位で保持する

### クライアント保持データ（補助）
- `localStorage["branch.theme"]`：`light | dark`、サーバー値未取得時の初期表示フォールバック

## 処理フロー
1. `layout.tsx` でログインユーザーのテーマ設定を取得し、初期テーマを ThemeProvider に渡す。
2. 初期描画時、ThemeProvider が `html` の `dark` クラスを同期し、画面全体へ即時反映する。
3. ユーザーが設定画面でテーマを変更すると、UI を即時更新したうえで保存処理を実行する。
4. 保存成功時は DB（`users.theme_preference`）と `localStorage` を同期する。
5. 次回アクセス時・再ログイン時は DB から同じテーマを再取得し、前回設定を復元する。
6. 主要画面（チャット一覧、チャット詳細、設定）の色はテーマトークン経由で描画し、可読性を維持する。

## エラーハンドリング
- エラーケース1：テーマ保存時のDB更新失敗  
  対処法：UI上で保存失敗を通知し、最後に成功したテーマへロールバックまたは再試行導線を表示する。

- エラーケース2：不正なテーマ値（URL/クライアント改ざん）  
  対処法：`light`/`dark` 以外はバリデーションで拒否し、`light` を既定値として適用する。

- エラーケース3：初期描画時のテーマ未取得（ネットワーク・認証状態不整合）  
  対処法：`localStorage` 値、未存在時は `light` にフォールバックし、取得後に再同期する。

- エラーケース4：一部UIがハードコード色のまま残存  
  対処法：対象コンポーネントを洗い出し、デザイントークン化チェックリストに沿って段階的に置換する。

## 既存コードとの統合
- 変更が必要なファイル：
  - `prisma/schema.prisma`：`ThemePreference` enum と `User.themePreference` 追加
  - `src/app/layout.tsx`：初期テーマの受け渡しと ThemeProvider の配置
  - `src/app/globals.css`：ダークテーマ用トークンの再定義と既存カスタム色のテーマ対応
  - `src/app/settings/page.tsx`：テーマ設定セクション追加（切替UIと保存処理）
  - `src/app/chats/page.tsx`：背景・文字・カード色をトークンベースへ移行
  - `src/components/chats/account-menu.tsx`：メニューの背景/境界線/ホバー色をトークン化
  - `src/components/chats/prompt-card.tsx`：入力カードとモデル選択UIのテーマ対応
  - `src/components/ChatCanvasShell.tsx`：チャット詳細画面の主要操作ボタンと背景色のテーマ対応
  - `src/components/UserBubble.tsx`：ユーザーバブルの配色コントラスト調整

- 新規作成ファイル：
  - `src/components/theme/theme-provider.tsx`：テーマ状態管理と DOM クラス同期
  - `src/components/theme/theme-toggle.tsx`：再利用可能なライト/ダーク切替UI
  - `src/lib/theme-preference.ts`：テーマ値バリデーションと変換ロジック
  - `prisma/migrations/*/migration.sql`：`users` テーブルへのテーマ設定列追加
