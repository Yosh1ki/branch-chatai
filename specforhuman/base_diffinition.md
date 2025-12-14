# Base Project Definition (Branch MVP)

本ドキュメントでは、Codex / 実装チームへ共有するためのベース定義をまとめる。

---

## 1. Repository Stack Policy

**技術スタック（推奨構成）**

-   Framework: Next.js (App Router) / TypeScript
-   Auth: Auth.js (Google OAuth)
-   ORM: Prisma
-   Database: PostgreSQL

**別スタックの希望がある場合（記入欄）**

-   フロントエンド:
-   API/BFF:
-   その他スタック希望:

---

## 2. Infrastructure Policy

**ホスティング候補**

-   第 1 候補: Vercel
-   第 2 候補: Fly.io / Render（スケール時に検討）

**DB 候補**

-   第 1 候補: Supabase (Postgres として利用)
-   他候補: Railway / Neon / RDS

**最終決定（記入欄）**

-   Hosting: ********\_\_********
-   Database: ********\_\_********

---

## 3. Authentication Settings

**Google OAuth**

-   クライアント ID: `AUTH_GOOGLE_ID`
-   クライアントシークレット: `AUTH_GOOGLE_SECRET`

**Auth.js 用環境変数**

-   `AUTH_SECRET`:
-   `AUTH_URL`:

**発行状況（チェック）**

-   [ ] ローカル用発行済み
-   [ ] 本番ドメイン用発行済み

---

## 4. Payment Requirements (Stripe)

**MVP で Stripe を導入するか**

-   [ ] 入れない（無料 β から開始）
-   [ ] 入れる（有料プランを MVP に組み込む）

**Stripe 関連変数（導入時）**

-   `STRIPE_SECRET_KEY`
-   `STRIPE_WEBHOOK_SECRET`
-   `NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC`
-   `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`

**Price 設計メモ**

-   Free:
-   Plus:
-   Pro:

---

## 5. Model Provider Policy

**利用するモデル（優先度順）**

1. ***
2. ***

**API キー状況**

-   OPENAI_API_KEY: 済 / 未
-   ANTHROPIC_API_KEY: 済 / 未
-   GOOGLE_API_KEY: 済 / 未

**デフォルトモデル**

-   Provider: ********\_\_********
-   Model Name: ********\_\_********

---

## 6. Design Assets

**Figma 状況**

-   [ ] ログイン画面
-   [ ] チャット画面
-   [ ] ブランチ UI
-   [ ] ミニマップ

Figma URL: **********\_\_**********

**ブランド要素**

-   ロゴ: あり / なし
-   カラー:
-   フォント:

---

## 7. Testing & Quality

**必須テスト範囲**

-   [x] Lint / Format
-   [x] Type Check
-   [ ] Unit Test
-   [ ] API Test
-   [ ] E2E Test

**カバレッジ方針**

-   コアロジック: **\_\_\_**%
-   全体: 「重大なバグを防げる範囲」

**CI/CD**

-   GitHub Actions
    -   lint / typecheck / test
    -   main への merge で自動デプロイ（任意）

---

## 8. Schedule Plan

**MVP 目標リリース日**  
`__________________`

**機能優先順位**

1. Google OAuth
2. 基本チャット
3. ブランチ UI
4. ミニマップ
5. プラン表示
6. Stripe 連携（必要であれば）

**マイルストーン**

-   M1: 認証＋チャット
-   M2: ブランチ UI
-   M3: β 公開
-   M4: 課金開始

---

このドキュメントは Codex・開発者向けの基礎仕様として随時更新する。
