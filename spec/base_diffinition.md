

# Base Project Definition (Branches MVP)

本ドキュメントでは、Codex / 実装チームへ共有するためのベース定義をまとめる。

---

## 1. Repository Stack Policy

**技術スタック（推奨構成）**

- Framework: Next.js (App Router) / TypeScript  
- Auth: Auth.js (Google OAuth)  
- ORM: Prisma  
- Database: PostgreSQL  

**別スタックの希望がある場合（記入欄）**

- フロントエンド:  
- API/BFF:  
- その他スタック希望:  

---

## 2. Infrastructure Policy

**ホスティング候補**

- 第1候補: Vercel  
- 第2候補: Fly.io / Render（スケール時に検討）  

**DB候補**

- 第1候補: Supabase (Postgresとして利用)  
- 他候補: Railway / Neon / RDS  

**最終決定（記入欄）**

- Hosting: __________________  
- Database: __________________  

---

## 3. Authentication Settings

**Google OAuth**

- クライアントID: `AUTH_GOOGLE_ID`  
- クライアントシークレット: `AUTH_GOOGLE_SECRET`  

**Auth.js 用環境変数**

- `AUTH_SECRET`:  
- `AUTH_URL`:  

**発行状況（チェック）**

- [ ] ローカル用発行済み  
- [ ] 本番ドメイン用発行済み  

---

## 4. Payment Requirements (Stripe)

**MVPでStripeを導入するか**

- [ ] 入れない（無料βから開始）  
- [ ] 入れる（有料プランをMVPに組み込む）  

**Stripe関連変数（導入時）**

- `STRIPE_SECRET_KEY`  
- `STRIPE_WEBHOOK_SECRET`  
- `NEXT_PUBLIC_STRIPE_PRICE_ID_BASIC`  
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`  

**Price設計メモ**

- Free:  
- Plus:  
- Pro:  

---

## 5. Model Provider Policy

**利用するモデル（優先度順）**

1. __________________  
2. __________________  

**APIキー状況**

- OPENAI_API_KEY: 済 / 未  
- ANTHROPIC_API_KEY: 済 / 未  
- GOOGLE_API_KEY: 済 / 未  

**デフォルトモデル**

- Provider: __________________  
- Model Name: __________________  

---

## 6. Design Assets

**Figma 状況**

- [ ] ログイン画面  
- [ ] チャット画面  
- [ ] ブランチUI  
- [ ] ミニマップ  

Figma URL: ______________________

**ブランド要素**

- ロゴ: あり / なし  
- カラー:  
- フォント:  

---

## 7. Testing & Quality

**必須テスト範囲**

- [x] Lint / Format  
- [x] Type Check  
- [ ] Unit Test  
- [ ] API Test  
- [ ] E2E Test  

**カバレッジ方針**

- コアロジック: _______%  
- 全体: 「重大なバグを防げる範囲」  

**CI/CD**

- GitHub Actions  
  - lint / typecheck / test  
  - main への merge で自動デプロイ（任意）

---

## 8. Schedule Plan

**MVP目標リリース日**  
`__________________`

**機能優先順位**

1. Google OAuth  
2. 基本チャット  
3. ブランチUI  
4. ミニマップ  
5. プラン表示  
6. Stripe連携（必要であれば）  

**マイルストーン**

- M1: 認証＋チャット  
- M2: ブランチUI  
- M3: β公開  
- M4: 課金開始  

---

このドキュメントは Codex・開発者向けの基礎仕様として随時更新する。