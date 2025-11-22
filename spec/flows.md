

---
# フロー仕様書（Branches: MVP版）

本ドキュメントでは、Branchesにおける主要機能のシーケンスフロー（処理の流れ）を定義します。  
サーバー／クライアント／LLM間の処理がどのように進むかを明確にします。

---

## 📩 1. チャット送信 → 応答生成フロー

```mermaid
sequenceDiagram
  participant U as User（UI）
  participant FE as Frontend（Next.js）
  participant API as /api/chat
  participant LC as LangChain Wrapper
  participant LG as LangGraph
  participant LLM as LLM Provider（GPT/Claude/Gemini）
  participant DB as DB（Postgres + Prisma）

  U->>FE: 入力欄に質問を入力し、「送信」ボタンを押下
  FE->>API: POST /api/chat + エンコード済みメッセージ
  API->>LC: メッセージ履歴/設定と共にモデル選択リクエスト
  LC->>LG: LangGraphノードを経由して対話コンテキスト構築
  LG->>LLM: モデルに質問文（メッセージ）を送信
  LLM-->>LG: ストリーミング応答 or 完了応答
  LG-->>DB: `messages` / `usage_stats` テーブルに保存
  LG-->>LC: 応答内容を返却
  LC-->>API: フォーマットされた応答を返す（JSON or Stream）
  API-->>FE: フロントに応答を送信
  FE-->>U: 表示領域にAI応答メッセージを追加表示
```

---

## 🌿 2. ブランチ作成フロー（既存メッセージから分岐）

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as /api/messages/{id}/branch
  participant LG as LangGraph
  participant DB as Database

  U->>FE: 任意のメッセージから「ブランチ作成」ボタン押下
  FE->>API: POST /api/messages/{id}/branch + 新規メッセージ内容
  API->>LG: 指定メッセージのidを親としてLangGraphへ送信
  LG->>DB: 新規Messageレコードを作成（parent_message_id設定）
  LG-->>API: ブランチ生成成功レスポンス
  API-->>FE: { newMessageId, parentId, ... }
  FE-->>U: UI上にブランチ線＋新規メッセージを表示
```

---

## 🧭 3. 初回ログイン→会話取得フロー

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as /api/conversations
  participant DB as Database

  U->>FE: /login 画面にアクセス
  FE->>GoogleOAuth: ログインリクエスト
  GoogleOAuth-->>FE: 成功ステータス＋トークン
  FE->>API: GET /api/conversations（Authorizationヘッダー）
  API->>DB: user_idで絞り込みクエリ
  DB-->>API: 会話一覧
  API-->>FE: JSON形式で返却
  FE-->>U: 会話一覧画面に表示
```

---

## 🔐 4. Freeプランの利用制限チェックフロー

```mermaid
sequenceDiagram
  participant API as /api/chat
  participant DB as usage_stats
  participant LG as LangGraph

  API->>DB: 今日の usage_stats を取得（user_id + date）
  DB-->>API: { messageCount: 10 }
  API->>API: Free上限（10回）チェック→超過？
  API-->>FE: 429 Too Many Requests（メッセージ上限）
  Note over API, DB: Proユーザーはこのフローをスキップ
```

---

## 📝 備考

- 本フローはMVP時点での主要処理に着目しています  
- 実装時には `LangGraph` のワークフローノード設計とクライアント側の`UI状態管理`（React / Zustand など）を考慮してください
- 今後、以下の拡張フローを追加予定：
  - モデル切り替え設定フロー
  - Stripeなどの決済処理フロー
  - 共有（Shareableリンク）生成フロー

---

以上。