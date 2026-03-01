# 技術設計書

## アーキテクチャ概要
本機能は、既存の Next.js App Router + React + TypeScript 構成に、軽量なアプリ内 i18n レイヤーを追加して統合する。  
`src/lib/i18n` に英語/日本語の辞書とロケール解決ロジックを集約し、画面コンポーネントは辞書キー経由で文言を取得する。  
API/サーバー側で返すユーザー向けエラーメッセージも同じキー体系を使って生成し、UI表示文言と整合させる。  
これにより、既存の分岐チャット、モデル選択、認証、プラン管理の処理フローは維持しつつ、文言のみをロケール切替可能にする。

## 主要コンポーネント
### コンポーネント1：Localization Catalog (`src/lib/i18n`)
- 責務：英語/日本語の表示文言をキー単位で一元管理し、`t(key, locale)` で解決する。
- 入力：`locale`（`"ja"` or `"en"`）、`translationKey`、必要に応じて埋め込み変数。
- 出力：解決済みのローカライズ文字列。
- 依存関係：`src/components/**`、`src/app/**`、`src/lib/**`（エラーメッセージ生成）から参照される。

### コンポーネント2：Locale Resolver (`src/lib/i18n/locale.ts`)
- 責務：リクエストヘッダー、クッキー、クエリパラメータ等から表示ロケールを決定し、未指定時は安全な既定値へフォールバックする。
- 入力：`Accept-Language`、`lang` クエリ、`locale` クッキー（存在する場合）。
- 出力：`LocaleCode`（`"ja"` or `"en"`）。
- 依存関係：`src/app/layout.tsx`、ページコンポーネント、APIルート（ユーザー向けエラーメッセージ返却時）。

### コンポーネント3：Localized UI Adapter（既存画面群）
- 責務：画面内ハードコード文言を辞書キー参照へ置換し、主要機能UIを英語表示可能にする。
- 入力：`t` 関数、`locale`、表示コンテキスト（画面状態、プラン状態、API結果）。
- 出力：ローカライズ済み UI（ボタン、見出し、プレースホルダ、通知文言）。
- 依存関係：`src/components/ChatCanvasShell.tsx`、`src/components/AssistantCard.tsx`、`src/app/settings/page.tsx`、`src/app/login/page.tsx`、`src/components/chats/*` など。

## データモデル
### LocaleCode
- `value`：`"ja" | "en"`、対応言語コード

### TranslationKey
- `value`：`string`（例：`"chat.sendError"`、`"settings.title"`）、辞書参照キー

### TranslationCatalog
- `ja`：`Record<TranslationKey, string>`、日本語文言辞書
- `en`：`Record<TranslationKey, string>`、英語文言辞書
- 説明：キー集合を両言語で一致させ、不足時は既定ロケール文言へフォールバックする

### LocalizedErrorPayload（既存レスポンス拡張）
- `code`：`string`、機械可読なエラーコード
- `message`：`string`、ロケール解決済みの表示メッセージ
- `details`：`string | undefined`、追加説明（必要時のみ）
- 説明：既存 API エラー処理に適用し、UI/サーバーで一貫した英語メッセージを提供する

### 永続化方針
- DBスキーマ変更：初期段階では不要（既存 `User`/`Chat`/`Message` を変更しない）
- 将来拡張：ユーザー単位の言語固定が必要になった場合のみ `User` への `locale` 追加を検討

## 処理フロー
1. リクエスト受信時に `Locale Resolver` が表示ロケールを決定する（明示指定 > 保存値 > 既定値）。
2. ページ/コンポーネントは辞書キー経由で文言を取得して描画する。
3. ユーザー操作（送信、削除、分岐作成、設定操作）で発生する通知・エラーは、同じ辞書キーから解決して表示する。
4. APIルートでユーザー向けメッセージを返す場合は `LocalizedErrorPayload` 形式で返却する。
5. 辞書未定義キーがあればフォールバック文言を使用し、開発時ログで検知可能にする。

## エラーハンドリング
- エラーケース1：翻訳キー未定義
  - 対処法：既定ロケール（`ja`）へフォールバックし、開発環境では警告ログを出力する。
- エラーケース2：不正ロケール指定（例：`lang=fr`）
  - 対処法：サポート対象（`ja`/`en`）のみ許可し、未対応値は既定ロケールへフォールバックする。
- エラーケース3：APIエラー文言がハードコードで残存
  - 対処法：エラーコード基準へ置換し、表示文言を辞書解決に統一する。
- エラーケース4：UI文言置換漏れ
  - 対処法：主要画面（チャット/ログイン/設定）の文言チェックリストを用意し、リリース前に目視確認する。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/app/layout.tsx`：`lang` 属性とロケール配布の導入
  - `src/app/login/page.tsx`：ログイン画面文言の辞書キー化
  - `src/app/settings/page.tsx`：設定・プラン表示文言の辞書キー化
  - `src/app/chats/page.tsx`：日次上限エラーメッセージの辞書キー化
  - `src/components/ChatCanvasShell.tsx`：送信失敗/プレースホルダ/分岐操作文言の辞書キー化
  - `src/components/AssistantCard.tsx`：状態文言（生成中、エラー、再生成など）の辞書キー化
  - `src/components/chats/account-menu.tsx`：設定/ログアウト文言の辞書キー化
  - `src/components/chats/chat-list.tsx`：削除確認・失敗通知などの辞書キー化
  - `src/components/chats/chat-sort-select.tsx`：並び順ラベルの辞書キー化
  - `src/components/chats/prompt-card.tsx`：タグライン/プレースホルダの辞書キー化
  - `src/lib/chat-messages.ts`：既定エラーメッセージの辞書キー化
  - `src/hooks/use-latest-chat-message.ts`：通信失敗文言の辞書キー化
  - `src/components/theme/theme-toggle.tsx`：テーマ関連の表示/エラー文言の辞書キー化
  - `src/components/RichTextOutput.tsx`：フォールバック表示文言の辞書キー化
  - `src/components/UserBubble.tsx`：読み込み/エラー/空状態文言の辞書キー化
- 新規作成ファイル：
  - `src/lib/i18n/types.ts`：`LocaleCode`、`TranslationKey` 型定義
  - `src/lib/i18n/dictionaries/ja.ts`：日本語辞書
  - `src/lib/i18n/dictionaries/en.ts`：英語辞書
  - `src/lib/i18n/index.ts`：`t` 関数と辞書解決エントリ
  - `src/lib/i18n/locale.ts`：ロケール解決ロジック
  - `src/lib/i18n/error-messages.ts`：エラーコードと文言キーの対応定義
