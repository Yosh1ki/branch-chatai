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
DATABASE_URL="postgresql://xxxxx.supabase.co/postgres"

# Auth.js
AUTH_SECRET="ランダムな64文字の値"
AUTH_URL="http://localhost:3000"

# Google OAuth（開発用クライアント）
AUTH_GOOGLE_ID="xxx-dev.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="xxxxx"

# OpenAI
OPENAI_API_KEY="xxxxx"
DEFAULT_MODEL_NAME="gpt-4o-mini"

# 開発用フラグ（任意）
USE_DEV_ASSISTANT_RESPONSE="false" # trueで固定文言を返す
DISABLE_DAILY_LIMIT="false"        # trueで1日の上限チェックを無効化
```

※ Prisma CLI は `.env.local` を読みません。そのため次の `.env` も必須です。

---

## 🗃 Prisma（データベース関連）

### 3. `.env`（Prisma 用）を作成

Prisma は `.env.local` を読まないため、DATABASE_URL を `.env` にもコピーしてください。

```
DATABASE_URL="postgresql://xxxxx.supabase.co/postgres"
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

## 📚 参考リンク

- Next.js: https://nextjs.org/docs
- Auth.js: https://authjs.dev/
- Prisma: https://www.prisma.io/docs
- Supabase: https://supabase.com/docs
