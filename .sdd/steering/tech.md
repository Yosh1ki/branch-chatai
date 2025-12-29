# Technology Stack

## アーキテクチャ
Next.js App Router上でReactクライアントコンポーネントを用い、Auth.jsでGoogle OAuth認証、Prisma ORMでPostgreSQLに永続化する構成です。APIルートでLLM連携やチャット操作を行います。

## 使用技術
### 言語とフレームワーク
- TypeScript 5
- Next.js 16.0.3 (App Router)
- React 19.2.0

### 依存関係
- Auth.js / NextAuth: Google OAuth認証
- Prisma: ORM
- PostgreSQL (pg): データベース
- ai / openai: LLM連携
- zustand: 状態管理
- Radix UI: UIコンポーネント
- Tailwind CSS: スタイリング

## 開発環境
### 必要なツール
- Node.js
- npm または pnpm
- Prisma CLI
- ESLint

### よく使うコマンド
- 起動: `npm run dev` / `pnpm dev`
- ビルド: `npm run build`
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
- `DEFAULT_MODEL_NAME`: デフォルトモデル名
