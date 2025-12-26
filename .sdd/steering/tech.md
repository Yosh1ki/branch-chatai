# Technology Stack

## アーキテクチャ
Next.js App Router上でReactクライアントコンポーネントを用い、Auth.jsでGoogle OAuth認証、Prisma ORMでPostgreSQLに永続化する構成です。APIルートでLLM連携やチャット操作を行います。

## 使用技術
### 言語とフレームワーク
- TypeScript
- Next.js 16 (App Router)
- React 19

### 依存関係
- Auth.js / NextAuth: Google OAuth認証
- Prisma: ORM
- PostgreSQL: データベース
- ai / openai: LLM連携
- zustand: 状態管理
- radix-ui: UIコンポーネント

## 開発環境
### 必要なツール
- Node.js
- npm または pnpm
- Prisma CLI

### よく使うコマンド
- 起動: `npm run dev` / `pnpm dev`
- ビルド: `npm run build`
- テスト: (未記載)
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
