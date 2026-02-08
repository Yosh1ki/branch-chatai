---
# API仕様書（Branch: MVP版）

本ドキュメントではBranchプロジェクトにおけるAPIの仕様を定義します。
MVPフェーズのため、必要最低限のエンドポイントのみを対象としています。
---

## 🌐 ベース URL

```
https://api.branch.app
```

※ ローカル開発時は `http://localhost:3000/api/` などに変わります（Next.js API Routes を使用する構成）

---

## ✏️ 共通仕様

-   認証方式：Bearer Token（Google OAuth により発行）
-   リクエスト形式：`application/json`
-   レスポンス形式：`application/json`（ストリーミング時は SSE 形式）
-   エラー時は 400 系/500 系の標準 HTTP エラーコードを使用し、JSON で返されます
-   `requestId` を用いて冪等性を担保する（同一 requestId の再送は同一結果を返す）

---

## 📚 エンドポイント一覧

| メソッド | エンドポイント              | 説明                                         |
| -------- | --------------------------- | -------------------------------------------- |
| `POST`   | `/api/chat`                 | LLM にメッセージを送信し、返答を受け取る     |
| `GET`    | `/api/chats`                | ユーザーのチャット一覧を取得する             |
| `POST`   | `/api/chats`                | 新しいチャットを作成する                     |
| `GET`    | `/api/chats/{id}`           | 指定のチャット内容（メッセージツリー）を取得 |
| `POST`   | `/api/messages/{id}/branch` | 指定メッセージからブランチを作成する         |
| `GET`    | `/api/usage`                | ユーザーの使用状況（残りメッセージなど）     |

---

## 📨 詳細 API 仕様

### 1. `POST /api/chat`

**説明**
メッセージを送信して、選択されたモデルで応答を生成します。

**リクエスト例**

```json
{
    "chatId": "1234",
    "message": "What's the ROI of this investment?",
    "model": "gpt-5.2-chat-latest",
    "parentMessageId": "5678",
    "requestId": "req_abc123"
}
```

**レスポンス例（非ストリーミング）**

```json
{
    "messageId": "abcd1234",
    "message": "The estimated ROI is approximately 14%.",
    "stream": false
}
```

**エラー例**

```json
{
    "error": {
        "code": "LIMIT_EXCEEDED",
        "message": "Free plan daily limit exceeded."
    }
}
```

---

### 2. `GET /api/chats`

**説明**
ログインユーザーのチャット一覧を取得します。

**レスポンス例**

```json
[
    {
        "id": "1234",
        "title": "Marketing Strategy Deep Dive",
        "createdAt": "2025-01-19T14:00:00Z"
    }
]
```

---

### 3. `POST /api/chats`

**説明**
空のチャットを新規作成します。初回メッセージの送信は `/api/chat` で行います。

**リクエスト例**

```json
{
    "title": "New Project Notes"
}
```

**レスポンス例**

```json
{
    "chatId": "abcd1234"
}
```

---

### 4. `GET /api/chats/{id}`

**説明**
指定したチャット ID のメッセージ（ブランチ構造）を取得します。

**レスポンス例**

```json
{
    "id": "1234",
    "title": "Deep Strategy Session",
    "messages": [
        {
            "id": "5678",
            "content": "What are major risks?",
            "parentId": null
        },
        {
            "id": "9012",
            "content": "Regulatory compliance.",
            "parentId": "5678"
        }
    ]
}
```

---

### 5. `POST /api/messages/{id}/branch`

**説明**
指定メッセージを起点として新しいブランチを作成します。

**リクエスト例**

```json
{
    "message": "Could you explain the legal risks?",
    "model": "gpt-5.2-chat-latest"
}
```

**レスポンス例**

```json
{
    "branchId": "branch_1234",
    "messageId": "msg_5678"
}
```

---

### 6. `GET /api/usage`

**説明**
使用状況（例：残りメッセージ数など）を取得します。

**レスポンス例**

```json
{
    "messageQuota": 10,
    "messagesUsedToday": 3
}
```

---

## ⚠️ エラー仕様（共通）

| ステータスコード | 意味             | 備考                               |
| ---------------- | ---------------- | ---------------------------------- |
| 400              | 不正な入力       | パラメータ不足、値エラーなど       |
| 401              | 未認証           | Authorization ヘッダが不足／無効   |
| 409              | 整合性エラー     | ブランチ整合性が崩れている場合など |
| 429              | 制限超過         | Free プランで上限超過した場合など  |
| 500              | サーバー側エラー | モデル呼び出しや DB エラー時に発生 |

---

以上です。
