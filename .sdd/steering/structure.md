# Project Structure

## ルートディレクトリ構成
```
/
├── src/            # Next.jsアプリ、UI、ドメインロジック
├── tests/          # Node.jsテストスイート
├── prisma/         # Prismaスキーマとマイグレーション
├── public/         # 公開アセット
├── docs/           # specs / rules / securityドキュメント
├── specforhuman/   # 人間向け詳細仕様
├── scripts/        # 検証・補助スクリプト
├── .sdd/           # SDD関連ファイルとアーカイブ
└── package.json    # スクリプトと依存関係定義
```

## コード構成パターン
- `src/app/`: Next.js App Routerのルーティング
- `src/app/api/`: 認証、チャット、課金、テーマ、ロケール、WebhookのAPIルート
- `src/components/`: 画面コンポーネントと機能別UI
- `src/hooks/`: Reactフック
- `src/lib/`: チャット、モデル呼び出し、課金、利用制限、テーマなどの共有ロジック
- `src/stores/`: Zustandストア
- `src/styles/`: スタイル
- `src/auth.ts`: Auth.js設定
- `prisma/schema.prisma`: ユーザー、チャット、メッセージ、ブランチ、利用量、課金状態のデータモデル
- `tests/`: API・状態管理・UI補助ロジックの振る舞いテスト

## ファイル命名規則
- Next.jsルート: `page.tsx` / `layout.tsx` / `route.ts`
- TypeScript/TSXファイル: `.ts` / `.tsx`
- JavaScriptファイル（既存実装）: `.js`
- テスト: `*.test.js`
- 機能ファイル: kebab-case が中心、一部共有コンポーネントは PascalCase
- Prismaスキーマ: `prisma/schema.prisma`

## 主要な設計原則
- ドメインロジックとインフラの分離
- モジュール間の疎結合
- レイヤー/モジュール構造の採用
- 可読性とテスト容易性を優先
