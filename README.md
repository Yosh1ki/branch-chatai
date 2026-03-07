# Branch Chatai – 開発用 README

このプロジェクトは **Next.js + Auth.js + Prisma + Supabase(PostgreSQL)** を利用したチャットアプリケーションです。

開発者が迷わないように、セットアップ方法から開発サーバー起動、DBマイグレーションまでの手順をまとめています。

---

## 🔧 開発環境のセットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

---

## 🔐 環境変数の設定

### 2. `.env` を作成（Next.js 用）

プロジェクト直下に `.env` を作成し、以下を記入してください。

```
# Supabase（開発環境）接続URL
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"

# 本番で推奨: 実行用とマイグレーション用を分離
# DATABASE_URL_RUNTIME="postgresql://app_prisma:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"
# MIGRATE_DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"

# Auth.js
AUTH_SECRET="ランダムな64文字の値"
AUTH_URL="http://localhost:3000"

# Google OAuth（開発用クライアント）
AUTH_GOOGLE_ID="xxx-dev.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="xxxxx"

# OpenAI
OPENAI_API_KEY="xxxxx"
DEFAULT_MODEL_NAME="gpt-4o-mini"

# Stripe Billing（ローカル / テスト）
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_PRICE_ID_PRO="price_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"

# 開発用フラグ（任意）
USE_DEV_ASSISTANT_RESPONSE="false" # trueで固定文言を返す
DISABLE_DAILY_LIMIT="false"        # trueで1日の上限チェックを無効化
```

※ Prisma CLI は `.env.local` を読みません。そのため次の `.env` も必須です。

---

## 🗃 Prisma（データベース関連）

### 3. `.env`（Prisma 用）を作成

Prisma は `.env.local` を読まないため、`.env` を利用してください。  
本番では `DATABASE_URL_RUNTIME`（アプリ）と `MIGRATE_DATABASE_URL`（マイグレーション）を分離する運用を推奨します。

```
DATABASE_URL="postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require"
```

### 4. Prisma を DB に反映（Supabase 開発環境にテーブル作成）

```bash
npx prisma migrate dev --name init
```

これで Supabase 上に必要なテーブルが作成されます。

---

## ▶ 開発サーバーの起動

### 5. Next.js を起動

```bash
pnpm dev
# または npm run dev
```

以下にアクセスするとアプリが動作します：

http://localhost:3000

---

## 💳 Stripe Billing セットアップ

このプロジェクトでは、Free ユーザーが `/settings` から Stripe Checkout を開始し、支払い状態は webhook で同期します。

### ローカルで Stripe を試す

1. Stripe Dashboard で `Test mode` を ON にする
2. 商品 `Pro` と月額サブスクリプション Price を 1 つ作成する
3. `price_...` を `.env` の `STRIPE_PRICE_ID_PRO` に設定する
4. `API keys` から `sk_test_...` を取得し、`.env` の `STRIPE_SECRET_KEY` に設定する
5. Stripe CLI をインストールする

```bash
brew install stripe/stripe-cli/stripe
```

6. Stripe CLI でログインする

```bash
stripe login
```

7. ローカル webhook 転送を開始する

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

8. 表示された `whsec_...` を `.env` の `STRIPE_WEBHOOK_SECRET` に設定する
9. 開発サーバーを起動してログインし、設定画面から Pro へのアップグレード導線を開く
10. Stripe のテストカードで決済を試す

```text
Card number: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
Name: Test User
Postal code: 12345
```

`Test mode` で `sk_test_...` とテスト用 `price_...` を使っている限り、実際の課金は発生しません。

### 本番環境で Stripe を有効にする

1. Stripe Dashboard を `Live mode` に切り替える
2. 本番用の商品と月額 Price を作成する
3. 本番の `sk_live_...` をホスティング先の `STRIPE_SECRET_KEY` に設定する
4. 本番用 `price_...` を `STRIPE_PRICE_ID_PRO` に設定する
5. Stripe Dashboard で webhook endpoint を追加する

```text
https://<your-domain>/api/webhooks/stripe
```

6. endpoint の `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定する
7. `AUTH_URL` または `NEXTAUTH_URL` を本番ドメインに設定する
8. デプロイ後、Checkout と Billing Portal の両方を実際に確認する

### Stripe で最低限必要な環境変数

```env
STRIPE_SECRET_KEY="sk_test_xxx or sk_live_xxx"
STRIPE_PRICE_ID_PRO="price_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
AUTH_URL="http://localhost:3000 or https://<your-domain>"
NEXTAUTH_URL="http://localhost:3000 or https://<your-domain>"
```

`AUTH_URL` と `NEXTAUTH_URL` は両方必須ではありません。この実装ではどちらか一方が設定されていれば Stripe のリダイレクト URL 解決に使われます。

---

## 🧪 開発用フラグ

開発中に挙動を切り替えたい場合は、`.env` に以下のフラグを追加してください。

- `USE_DEV_ASSISTANT_RESPONSE=true` で固定のデモ回答を返します。
- `DISABLE_DAILY_LIMIT=true` でFreeプランの1日上限チェックを無効化します。

本番環境では未設定か `false` を推奨します。

---

## 📁 主なファイル構成

- `app/` — Next.js アプリケーションルート
- `src/auth.ts` — Auth.js（Google OAuth）の設定ファイル
- `prisma/schema.prisma` — Prisma モデル定義
- `prisma/migrations/` — マイグレーション履歴
- `spec/` — 仕様ドキュメント

---

## 🔄 データベースのデプロイ（開発環境）

```
npx prisma migrate dev
```

本番環境に反映したい場合は：

```
npx prisma migrate deploy
```

---

## 🔒 Supabase本番セキュリティ（必須）

1. マイグレーション適用後に [scripts/sql/supabase-hardening.sql](scripts/sql/supabase-hardening.sql) を SQL Editor で実行  
2. アプリ接続は `DATABASE_URL_RUNTIME` に `app_prisma` ロールを設定  
3. `MIGRATE_DATABASE_URL` は `postgres` ロールで運用  
4. Supabase Dashboard で `Data API` を未使用なら OFF  
5. Supabase Dashboard で DB パスワード / API キーをローテーションし、ホスティング側の環境変数も更新

追加の運用チェックは [docs/security/supabase-production-checklist.md](docs/security/supabase-production-checklist.md) を参照。

---

## 📚 参考リンク

- Next.js: https://nextjs.org/docs
- Auth.js: https://authjs.dev/
- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
