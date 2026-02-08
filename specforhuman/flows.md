---
# フロー仕様書（Branch: MVP版）

本ドキュメントでは、Branchにおける主要機能のシーケンスフロー（処理の流れ）を定義します。
サーバー／クライアント／LLM間の処理がどのように進むかを明確にします。
---

## 📩 1. チャット送信 → 応答生成フロー

```mermaid
sequenceDiagram
  participant U as User（UI）
  participant FE as Frontend（Next.js）
  participant API as /api/chat
  participant LG as LangGraph
  participant LLM as LLM Provider（GPT/Claude/Gemini）
  participant DB as DB（Postgres + Prisma）

  U->>FE: 入力欄に質問を入力し、「送信」ボタンを押下
  FE->>API: POST /api/chat + メッセージ + requestId
  API->>LG: 認証/入力検証/ブランチ整合性チェック
  LG->>DB: usage_stats を参照（Free 上限チェック）
  LG->>DB: 親チェーン履歴の取得（直近 40 件）
  LG->>LG: 40 件超過分は要約 JSON に置換
  LG->>LG: Fast Gate + 外部モデレーション
  LG->>LLM: モデル呼び出し（ストリーミング/フォールバック/再試行）
  LLM-->>LG: ストリーミング応答 or 完了応答
  LG-->>DB: messages / usage_stats を保存（requestId で冪等）
  LG-->>LG: 初回応答後にタイトル生成
  LG-->>API: 応答内容を返却
  API-->>FE: フロントに応答を送信
  FE-->>U: 表示領域に AI 応答メッセージを追加表示
```

---

## 🌿 2. ブランチ作成フロー（既存メッセージから分岐）

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as /api/messages/{id}/branch
  participant DB as Database

  U->>FE: 任意のメッセージから「ブランチ作成」ボタン押下
  FE->>API: POST /api/messages/{id}/branch + 新規メッセージ内容
  API->>DB: 新規 Branch を作成
  API->>DB: 新規 Message を作成（parent_message_id/branch_id 設定）
  API-->>FE: { branchId, messageId }
  FE-->>U: UI上にブランチ線＋新規メッセージを表示
```

---

## 🧭 3. 初回ログイン → チャット取得フロー

```mermaid
sequenceDiagram
  participant U as User
  participant FE as Frontend
  participant API as /api/chats
  participant DB as Database

  U->>FE: /login 画面にアクセス
  FE->>GoogleOAuth: ログインリクエスト
  GoogleOAuth-->>FE: 成功ステータス＋トークン
  FE->>API: GET /api/chats（Authorizationヘッダー）
  API->>DB: user_idで絞り込みクエリ
  DB-->>API: チャット一覧
  API-->>FE: JSON形式で返却
  FE-->>U: チャット一覧画面に表示
```

---

## 🔐 4. Free プランの利用制限チェックフロー

```mermaid
sequenceDiagram
  participant API as /api/chat
  participant DB as usage_stats

  API->>DB: 今日の usage_stats を取得（user_id + date）
  DB-->>API: { messageCount: 10 }
  API->>API: Free上限（10回）チェック→超過？
  API-->>FE: 429 Too Many Requests（メッセージ上限）
  Note over API, DB: Proユーザーはこのフローをスキップ
```

---

## 📝 備考

-   本フローは MVP 時点での主要処理に着目しています
-   実装時には LangGraph のワークフローノード設計と UI 状態管理を考慮してください
-   今後、以下の拡張フローを追加予定：
    -   モデル切り替え設定フロー
    -   Stripe などの決済処理フロー
    -   共有（Shareable リンク）生成フロー

---

以上。
