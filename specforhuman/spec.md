# 🌿 Branch – Product Specification (v0.2)

> **Branch** is a mind-map style multi-branching AI chat application
> that allows users to organize chats without losing sight of the main topic.

---

## 1. Product Overview

### 1.1 Product Name

**Branch**

### 1.2 Product Type

Web Application

### 1.3 Background

従来の ChatGPT や Claude のように、チャットが縦方向に一直線で流れると、
話題が少し逸れた際に後から見返す際の視認性が悪くなる。

### 1.4 Goal

-   会話内容をブランチ（枝）として分岐管理できるチャット UI を実現する
-   話題が逸れた場合に、別の枝として管理し、メイン会話を見る際に集中できるようにする
-   複数の AI モデルを用途に合わせて選択できるようにする

---

## 2. Target Audience

-   エンジニア
-   コンサルタント
-   リサーチャー

---

## 3. Branding

-   テーマ：木と枝をイメージした **ライトグリーン**を基調とした明るい印象のデザイン
-   想定ユーザー：**個人ユーザー (toC)** と **企業顧客 (toB)** の両方
-   デザインツール：Figma を使用予定

---

## 4. Key Features

### 4.1 Multi-branching Chat

-   回答生成後、「ブランチを切る？」という UI を表示
-   分岐操作の際、遊び心のあるランダムメッセージを表示（例：「このアイデア、別ルートで深掘りしてみませんか？」）
-   各メッセージには折りたたみ機能付き。折りたたみ時は自動生成タイトルのみ表示
-   ブランチ整合性が崩れているリクエストは 400/409 で拒否する

### 4.2 Mind-map Style Visualization

-   全メッセージはツリー構造で管理されるが、ベースのチャットは縦方向に流れる
-   ブランチは該当メッセージの横に展開され、全体構造は左右＋縦スクロールで視認可能
-   ミニマップ機能により、全体構造を俯瞰し、任意のブランチへ即座にジャンプできる

### 4.3 Automatic Titles

-   各チャットは「生成された言語」で自動要約し、タイトルとして設定
-   メッセージ単位の「インラインタイトル」も自動生成（折りたたみ表示用）
-   タイトル生成は初回応答後に 1 回のみ実行

### 4.4 Model Selection and Reliability

-   サポートモデル：ChatGPT / Claude / Gemini
-   モデルはチャット単位で固定し、失敗時は 1 段のみフォールバック
-   タイムアウト/レート制限時は 1 回のみ再試行

### 4.5 Safety and Usage Limits

-   Free プランは 1 日 10 メッセージまで（Pro は無制限）
-   危険入力は Fast Gate + 外部モデレーションで拒否
-   ログにはモデル名/トークン量/エラーのみを記録し、PII は保存しない

---

## 5. Plan Structure

| Plan     | Message Limit          | Model Usage      | Branching | Price               |
| -------- | ---------------------- | ---------------- | --------- | ------------------- |
| **Free** | 1 日 10 メッセージまで | 全モデル利用可能 | ○         | 無料                |
| **Pro**  | 無制限                 | 全モデル利用可能 | ○         | 月額（Stripe 決済） |

---

## 6. Authentication

-   **Google OAuth** によるログインのみサポート（MVP）
-   認証後のユーザーは Stripe 顧客 ID と紐づける（Pro 利用時）

---

## 7. Data Model (Summary)

```plaintext
users:
  - id (PK)
  - email (unique)
  - name (nullable)
  - image_url
  - plan_type ('free'|'pro')
  - stripe_customer_id (nullable)
  - stripe_subscription_id (nullable)
  - created_at, updated_at

chats:
  - id (PK)
  - user_id (FK -> users.id)
  - title (auto-generated in chat language)
  - language_code ('ja', 'en' etc.)
  - root_message_id (FK -> messages.id, nullable)
  - is_archived (boolean)
  - created_at, updated_at

messages:
  - id (PK)
  - chat_id (FK)
  - parent_message_id (FK -> messages.id, nullable)
  - branch_id (FK -> branches.id, nullable)
  - role ('user'|'assistant'|'system')
  - content (text)
  - model_provider ('openai', 'anthropic', 'google')
  - model_name (e.g. 'gpt-5.2-chat-latest')
  - is_collapsed (boolean, default false)
  - auto_title (nullable)
  - request_id (unique, nullable)
  - created_at, updated_at

branches:
  - id (PK)
  - chat_id (FK)
  - parent_message_id (FK -> messages.id)
  - side ('left'|'right')
  - created_at, updated_at

usage_stats:
  - id (PK)
  - user_id (FK)
  - date (date, JST)
  - message_count (integer)
  - created_at, updated_at
  - unique(user_id, date)
```

---

## 8. Architecture (MVP)

### 8.1 Tech Stack

-   **Next.js** (App Router)
-   **React** (Client Components)
-   **Auth.js**（旧 NextAuth） for Google OAuth
-   **Database**: PostgreSQL + Prisma
-   **AI Layer**: LangChain / LangGraph
-   **Hosting**: Vercel or Fly.io

### 8.2 API Overview

-   `/api/chat`（LLM ストリーミング + LangGraph 実行）
-   `/api/chats`（チャット一覧/作成）
-   `/api/messages/{id}/branch`（ブランチ作成）
-   `/api/usage`（日次使用量）

### 8.3 Chat Execution Flow

1. 認証/入力検証/requestId 生成
2. ブランチ整合性チェック
3. Free プラン上限チェック（超過時は 429）
4. 履歴取得（親チェーン）と 40 件超過分の要約
5. Fast Gate + 外部モデレーション
6. モデル呼び出し（ストリーミング/フォールバック/再試行）
7. メッセージ/使用量保存 + タイトル生成

---

## 9. Random Branching Tips (UI Copy)

-   「話が逸れそうなら、ここで枝を分けておこう。」
-   「寄り道したくなったら、ブランチを切ってメインを守ろう。」
-   「このアイデア、別ルートで深掘りしてみませんか？」
-   「ブランチを作って思考を整理しましょう。」
-   「派生トークは“枝”として育てませんか？」
-   「この話題、別の観点から分岐できます！」
-   「本筋を残して、枝葉を伸ばしてみませんか？」
-   「“分岐”で話をスッキリ整理しましょう！」

---

## 10. Next Steps

1. 画面設計（Figma でワイヤーフレーム化）
    - 会話一覧画面
    - 会話詳細（マインドマップ表示）
    - 設定画面（プラン/アカウント）
    - ミニマップの位置・ノードのデザイン詳細
2. API 仕様定義（/api/chat, /api/messages など）
    - JSON レスポンス形式
    - ストリーミング対応
