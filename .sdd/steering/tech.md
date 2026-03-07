# Technology Stack

## アーキテクチャ
Next.js App Router上でReactを用いたWebアプリです。認証はAuth.js + Google OAuth、永続化はPrisma ORM + PostgreSQLで構成され、`src/app/api/*` のAPIルートがチャット、認証、課金、テーマ、ロケール設定を扱います。LLM連携は `src/lib/chat-request-graph.ts` と `src/lib/model-invoker.ts` に集約され、Stripe連携はサーバー側からStripe REST APIを直接呼び出す構成です。

## 使用技術
### 言語とフレームワーク
- TypeScript 5 / JavaScript（一部既存実装）
- Next.js 16.0.3 (App Router)
- React 19.2.0
- Auth.js / NextAuth v5 beta
- Prisma 7

### 依存関係
- Auth.js / NextAuth (v5): Google OAuth認証
- @auth/prisma-adapter: Auth.js向けPrismaアダプタ
- @google/genai: Gemini連携
- @langchain/langgraph: 会話オーケストレーション
- @prisma/adapter-pg: Prisma向けPostgreSQLアダプタ
- Prisma: ORM
- PostgreSQL (pg): データベース
- ai / openai: LLM連携
- Stripe REST API: Checkout / Billing Portal / Webhook連携（SDK未使用）
- zustand: 状態管理
- Radix UI: UIコンポーネント
- Tailwind CSS 4 / tw-animate-css: スタイリング
- clsx / class-variance-authority / tailwind-merge: クラス構築ユーティリティ
- react-markdown / remark-gfm / remark-breaks: Markdown表示
- lucide-react: アイコン
- zod: バリデーション

## 開発環境
### 必要なツール
- Node.js
- npm または pnpm
- Prisma CLI
- ESLint
- Stripe CLI（ローカルWebhook検証時）

### よく使うコマンド
- 起動: `npm run dev` / `pnpm dev`
- ビルド: `npm run build`
- 起動(本番): `npm run start`
- テスト: `npm run test`
- リント: `npm run lint`
- Prismaマイグレーション: `npx prisma migrate dev`
- Prismaデプロイ: `npx prisma migrate deploy`

## 環境変数
- `DATABASE_URL`: PostgreSQL接続URL
- `DATABASE_URL_RUNTIME`: アプリ実行時のDB接続URL
- `MIGRATE_DATABASE_URL`: マイグレーション用DB接続URL
- `AUTH_SECRET`: Auth.jsのシークレット
- `AUTH_URL`: 認証コールバックURL
- `NEXTAUTH_URL`: 認証・StripeリダイレクトのベースURL
- `AUTH_GOOGLE_ID`: Google OAuthクライアントID
- `AUTH_GOOGLE_SECRET`: Google OAuthクライアントシークレット
- `OPENAI_API_KEY`: OpenAI APIキー
- `ANTHROPIC_API_KEY`: Claude連携用APIキー
- `GEMINI_API_KEY`: Gemini連携用APIキー
- `DEFAULT_MODEL_NAME`: 既定モデル名
- `STRIPE_SECRET_KEY`: Stripe APIシークレットキー
- `STRIPE_PRICE_ID_PRO`: ProプランのPrice ID
- `NEXT_PUBLIC_STRIPE_PRICE_ID_PRO`: クライアント参照用Price IDのフォールバック
- `STRIPE_WEBHOOK_SECRET`: Stripe Webhook署名検証用シークレット
- `USE_DEV_ASSISTANT_RESPONSE`: 固定デモ回答の返却フラグ
- `DISABLE_DAILY_LIMIT`: 1日上限チェックの無効化フラグ
- `DISABLE_MODERATION`: モデレーション無効化フラグ
- `MODERATION_FAST_GATE_RULES_JSON`: モデレーションの高速判定ルール(JSON)
- `AUTH_DISABLED`: 開発用の認証無効化フラグ
- `AUTH_DISABLED_USER_ID`: 認証無効化時の固定ユーザーID
- `AUTH_DISABLED_EMAIL`: 認証無効化時の固定メールアドレス
- `AUTH_DISABLED_NAME`: 認証無効化時の固定表示名
