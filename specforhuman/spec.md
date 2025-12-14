# 🌿 Branches – Product Specification (v0.1)

> **Branches** is a mind-map style multi-branching AI chat application  
> that allows users to organize chats without losing sight of the main topic.

---

## 1. Product Overview

### 1.1 Product Name
**Branches**

### 1.2 Product Type
Web Application

### 1.3 Background
従来のChatGPTやClaudeのように、チャットが縦方向に一直線で流れると、  
話題が少し逸れた際に後から見返す際の視認性が悪くなる。

### 1.4 Goal
- 会話内容をブランチ（枝）として分岐管理できるチャットUIを実現する
- 話題が逸れた場合に、別の枝として管理し、メイン会話を見る際に集中できるようにする
- 様々なAIモデルを利用可能にし、用途に合わせたモデル選択をサポートする

---

## 2. Target Audience

- エンジニア
- コンサルタント
- リサーチャー

---

## 3. Branding

- テーマ：木と枝をイメージした **ライトグリーン**を基調とした明るい印象のデザイン
- 想定ユーザー：**個人ユーザー (toC)** と **企業顧客 (toB)** の両方
- デザインツール：Figmaを使用予定

---

## 4. Key Features

### 4.1 Multi-branching Chat
- 回答生成後、「ブランチを切る？」というUIを表示
- 分岐操作の際、遊び心のあるランダムメッセージを表示（例：「このアイデア、別ルートで深掘りしてみませんか？」）
- 各メッセージには折りたたみ機能付き。折りたたみ時はタイトルのみ表示

### 4.2 Mind-map Style Visualization
- 全メッセージはツリー構造で管理されるが、ベースのチャットは縦方向に流れる
- ブランチは該当メッセージの横に展開され、全体構造は左右＋縦スクロールで視認可能
- ミニマップ機能により、全体的な構造を俯瞰し、任意のブランチへ即座にジャンプできる

### 4.3 Automatic Chat Titles
- 各チャットは「生成された言語」で自動要約し、タイトルとして設定
- メッセージ単位の「インラインタイトル」も自動生成（折りたたみ表示用）

### 4.4 Model Selection
- サポートモデル：
  - **ChatGPT**
  - **Claude**
  - **Gemini**
- ブランチごとのモデル変更は将来的に対応予定（現時点では会話単位）

### 4.5 Mini Map (概要表示)
- チャット全体のブランチ構造を俯瞰表示するミニマップを画面右上に配置
- 現在表示中のブランチ位置をハイライト
- ミニマップのノードをクリックすることで該当箇所にスクロール

---

## 5. Plan Structure

| Plan      | Message Limit       | Model Usage       | Branching | Price     |
|-----------|---------------------|-------------------|-----------|-----------|
| **Free**  | 1日10メッセージまで | 全モデル利用可能  | ○         | 無料      |
| **Pro**   | 無制限              | 全モデル利用可能  | ○         | 月額（Stripe決済） |

---

## 6. Authentication

- **Google OAuth** によるログインのみサポート（MVP）  
- 認証後のユーザーは Stripe顧客IDと紐づける（Pro利用時）

---

## 7. Data Model (Draft)

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
  - role ('user'|'assistant'|'system')
  - content (text or jsonb)
  - model_provider ('openai', 'anthropic', 'google')
  - model_name (e.g. 'gpt-4.1-mini')
  - is_collapsed (boolean, default false)
  - auto_title (nullable)
  - created_at, updated_at

usage_stats:
  - id (PK)
  - user_id (FK)
  - date (date, JST)
  - message_count (integer)
  - created_at, updated_at
```

## 8. Architecture (MVP Proposal)

### 8.1 Tech Stack

- **Next.js** (App Router)
- **React** (Client Components)
- **Auth.js**（旧 NextAuth） for Google OAuth
- **API Routes**
  - `/api/chat`（LLMストリーミング）
  - `/api/chats`（チャット一覧・作成）
  - `/api/messages`（CRUD）
- **Database**
  - PostgreSQL（Supabase or Railway/Renderなど）
  - Prisma ORM
- **AI Layer**
  - LangChain or LangGraph-based custom graph
- **Hosting**
  - Vercel or Fly.io（予定）

- **UI補助**
  - ミニマップ表示用のカスタムコンポーネント（React＋SVG）を実装

### 8.2 Architecture Diagram (MVP)

```
Browser (React UI)
   |
Next.js (App Router, API Routes)
   |-- Auth.js (Google OAuth)
   |-- /api/chat -> LangChain/LangGraph -> ChatGPT/Claude/Gemini
   |-- /api/messages -> Prisma -> Postgres
   |
Database: Postgres
```

---

## 9. Random Branching Tips (UI Copy)

- 「話が逸れそうなら、ここで枝を分けておこう。」
- 「寄り道したくなったら、ブランチを切ってメインを守ろう。」
- 「このアイデア、別ルートで深掘りしてみませんか？」
- 「ブランチを作って思考を整理しましょう。」
- 「派生トークは“枝”として育てませんか？」
- 「この話題、別の観点から分岐できます！」
- 「本筋を残して、枝葉を伸ばしてみませんか？」
- 「“分岐”で話をスッキリ整理しましょう！」

---

## 10. Next Steps

1. 画面設計（Figmaでワイヤーフレーム化）
   - 会話一覧画面
   - 会話詳細（マインドマップ表示）
   - 設定画面（プラン/アカウント）
   - ミニマップの位置・ノードのデザイン詳細
2. API仕様定義（/api/chat, /api/messages, etc.）
   - JSONレスポンスの形式
   - ストリーミング対応の有無
3. Stripe 連携仕様決め
   - プランの定義（PriceID / Billing Period / Webhook Handling）
4. MVP実装フェーズへ
   - Frontend → Model Integration → Auth/Billing → Deploy

---
