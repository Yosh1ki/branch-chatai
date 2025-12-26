# Project Structure

## ルートディレクトリ構成
```
/
├── src/          # アプリ本体
├── prisma/       # Prismaスキーマとマイグレーション
├── public/       # 公開アセット
├── docs/         # 仕様とルール
├── scripts/      # 開発スクリプト
├── .sdd/         # SDD関連ファイル
└── package.json  # Node.js設定
```

## コード構成パターン
- `src/app/`: Next.js App Routerのルーティング
- `src/components/`: UIコンポーネント
- `src/lib/`: 共有ユーティリティ
- `src/store/`: 状態管理
- `src/styles/`: スタイル
- `src/auth.ts`: Auth.js設定

## ファイル命名規則
- TypeScript/TSXファイル: `.ts` / `.tsx`
- Prismaスキーマ: `prisma/schema.prisma`

## 主要な設計原則
- ドメインロジックとインフラの分離
- モジュール間の疎結合
- レイヤー/モジュール構造の採用
