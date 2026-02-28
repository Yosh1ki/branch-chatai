# Technology Stack

## アーキテクチャ
Next.js App Router上でReactクライアントコンポーネントを用い、Auth.jsでGoogle OAuth認証、Prisma ORMでPostgreSQLに永続化する構成です。`src/app/api/*` のAPIルートでチャット操作とLLM連携を行い、`/api/chat` はSSEストリーミング応答に対応します。

## 使用技術
### 言語とフレームワーク
- TypeScript 5
- Next.js 16.0.3 (App Router)
- React 19.2.0

### 依存関係
- Auth.js / NextAuth (v5): Google OAuth認証
- @auth/prisma-adapter: Auth.js向けPrismaアダプタ
- @google/genai: Gemini連携
- @langchain/langgraph: 会話オーケストレーション
- @prisma/adapter-pg: Prisma向けPostgreSQLアダプタ
- Prisma: ORM
- PostgreSQL (pg): データベース
- ai / openai: LLM連携
- zustand: 状態管理
- Radix UI: UIコンポーネント
- Tailwind CSS: スタイリング
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

### よく使うコマンド
- 起動: `npm run dev` / `pnpm dev`
- ビルド: `npm run build`
- 起動(本番): `npm run start`
- テスト: `npm run test`
- リント: `npm run lint`
- Prismaマイグレーション: `npx prisma migrate dev`

## 環境変数
- `DATABASE_URL`: PostgreSQL接続URL
- `AUTH_SECRET`: Auth.jsのシークレット
- `AUTH_URL`: 認証コールバックURL
- `AUTH_GOOGLE_ID`: Google OAuthクライアントID
- `AUTH_GOOGLE_SECRET`: Google OAuthクライアントシークレット
- `OPENAI_API_KEY`: OpenAI APIキー
- `ANTHROPIC_API_KEY`: Claude連携用APIキー
- `GEMINI_API_KEY`: Gemini連携用APIキー
- `USE_DEV_ASSISTANT_RESPONSE`: 固定デモ回答の返却フラグ
- `DISABLE_DAILY_LIMIT`: 1日上限チェックの無効化フラグ
- `DISABLE_MODERATION`: モデレーション無効化フラグ
- `MODERATION_FAST_GATE_RULES_JSON`: モデレーションの高速判定ルール(JSON)
- `AUTH_DISABLED`: 開発用の認証無効化フラグ
- `AUTH_DISABLED_USER_ID`: 認証無効化時の固定ユーザーID
- `AUTH_DISABLED_EMAIL`: 認証無効化時の固定メールアドレス
- `AUTH_DISABLED_NAME`: 認証無効化時の固定表示名
