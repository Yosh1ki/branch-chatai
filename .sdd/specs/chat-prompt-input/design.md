# 技術設計書

## アーキテクチャ概要
Next.js App RouterのAPIルートでLangGraphを用いて会話履歴の取得・要約・モデル呼び出しをオーケストレーションし、Prisma経由でPostgreSQLへ永続化する既存構成に統合する。LLM連携は既存の`/api/chat`フロー内でLangGraphのグラフ実行として組み込み、履歴取得・要約・安全チェック・使用量制御を`src/lib`のユーティリティとして分離する。

## 主要コンポーネント
### コンポーネント1：ChatRequestGraph（LangGraph）
- 責務：入力検証、使用量チェック、履歴取得/要約、モデル呼び出し、永続化、タイトル生成をグラフノードとして定義し、順序と分岐を制御する。
- 入力：ユーザーID、チャットID、現在のブランチ/メッセージID、requestId、ユーザー入力、モデル設定。
- 出力：ストリーミングレスポンス、保存済みメッセージID、必要ならタイトル生成結果。
- 依存関係：ConversationHistoryBuilder、HistorySummarizer、ModelInvoker、UsageLimiter、MessagePersister、SafetyFilter、Logger、LangGraphランタイム。

### コンポーネント2：GraphNode群（LangGraphノード）
- 責務：履歴取得、要約、危険入力判定、モデル呼び出し、保存、タイトル生成などの処理を個別ノードとして実装する。
- 入力：グラフ状態（履歴、要約、入力、モデル設定、メタデータ）。
- 出力：更新されたグラフ状態、エラー/リトライ指示。
- 依存関係：各種ユーティリティ関数、LangGraphの状態管理。

### コンポーネント3：ConversationHistoryBuilder
- 責務：現在ブランチの親チェーンをルートまで遡り、共通履歴を含めつつ兄弟ブランチを除外し、時系列で結合する。
- 入力：chatId、currentMessageId/branchId、取得上限（40件）。
- 出力：時系列の履歴メッセージ配列、要約対象の古い履歴。
- 依存関係：Message/Branchのリレーション（Prisma）。

### コンポーネント4：HistorySummarizer
- 責務：40件超過分の履歴をメモリ要約（JSON）に置換する。
- 入力：超過履歴、要約ポリシー。
- 出力：メモリ要約JSON。
- 依存関係：固定の要約モデル（`gpt-4o-mini`）。
- メモリ要約スキーマ：
  - summary / key_facts / user_goal / action_items / sentiment / entities / last_updated / turn_count

### コンポーネント5：ModelInvoker
- 責務：チャット単位のモデル固定、フォールバック1段、タイムアウト/レート制限時の再試行1回、入力8k/出力800〜1200の固定上限を守ってLLMを呼び出す。context超過時は長コンテキスト優先のフォールバック規則を適用する。
- 入力：システムプロンプト、整形済み履歴、ユーザー入力、モデル設定、ストリーミング設定。
- 出力：ストリーミングレスポンス、使用量メタデータ、エラー情報。
- 依存関係：OpenAI/Claude/GeminiのSDKラッパー。
- フォールバック順：
  1. OpenAI（`gpt-4.1-latest` または `gpt-4o`）
  2. Anthropic（`claude-sonnet-4-5` / `claude-opus-4-5`）
  3. Gemini（`gemini-2.5-pro` / `gemini-2.5-flash`）

### コンポーネント6：UsageLimiter / MessagePersister / SafetyFilter
- 責務：Freeプラン上限(10/日)の判定、メッセージ/使用量の永続化、Fast Gateと外部モデレーション（OpenAI `omni-moderation-latest`優先）による危険入力の拒否、出力のモデレーション、PIIを残さないログ出力。
- 入力：userId、date、requestId、メッセージ内容、モデル名、トークン量。
- 出力：429/エラー、保存済みメッセージ、ログイベント。
- 依存関係：UsageStat、Message、Logger、外部モデレーションAPI。
- Fast Gateルールはハードコードの最低限ルール＋`MODERATION_FAST_GATE_RULES_JSON`で上書き可能。
- モデレーション判定は`flagged`に加え、重要カテゴリは0.2、その他は0.5を閾値にする。

## データモデル
### Chat
- id：String、チャットID
- userId：String、所有者
- title：String、チャットタイトル
- languageCode：String、言語
- rootMessageId：String?、ルートメッセージ

### Message
- id：String、メッセージID
- chatId：String、所属チャット
- parentMessageId：String?、親メッセージ
- branchId：String?、所属ブランチ
- role：String、user/assistant
- content：String、本文
- modelProvider：String?、プロバイダ
- modelName：String?、モデル名
- autoTitle：String?、インラインタイトル
- isCollapsed：Boolean、折りたたみ状態
- requestId：String?、冪等性キー（追加予定、ユニーク制約）

### Branch
- id：String、ブランチID
- chatId：String、所属チャット
- parentMessageId：String、分岐元メッセージ
- side：String、表示位置

### UsageStat
- userId：String、ユーザーID
- date：Date、対象日
- messageCount：Int、送信回数

## 処理フロー
1. `/api/chat` で入力を受け取り、LangGraphのグラフ実行を開始する。
2. GraphNodeで認証・requestId生成/検証・ブランチ整合性を検証する。
3. UsageLimiterノードでFreeプランの上限チェックを行い、超過時は429を返す。
4. ConversationHistoryBuilderノードで親チェーン履歴を取得し、時系列で結合する。
5. 40件を超える履歴がある場合、HistorySummarizerノードでメモリ要約（JSON）に置換する。
6. SafetyFilterノードでFast Gateと外部モデレーションで危険入力を拒否し、固定のシステムプロンプトを組み込む。
7. ModelInvokerノードでストリーミング応答を開始し、失敗時は1段フォールバック、タイムアウト/レート制限は1回のみ再試行する。
8. 出力を外部モデレーションでチェックする。
9. MessagePersisterノードでメッセージ・使用量・モデル情報を保存し、requestIdの冪等性を担保する。
10. 初回応答後に1回だけタイトル生成ノードを実行する。

## エラーハンドリング
- ブランチ整合性欠損：400/409でエラーを返し、保存しない。
- Freeプラン上限超過：429を返す。
- 危険入力：400で拒否し、ログのみ残す。
- 出力がモデレーション不合格：400で拒否し、ログのみ残す。
- モデル失敗：フォールバック1段で再試行し、最終的に失敗した場合はエラーを返す（LangGraphの分岐/再試行で制御）。
- タイムアウト/レート制限：1回のみ再試行し、それでも失敗したらエラーを返す（LangGraphの分岐/再試行で制御）。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/app/api/chat/route.ts`：履歴取得、要約、フォールバック、再試行、冪等性、タイトル生成のオーケストレーションを追加。
  - `src/lib/chat-conversation.js`：親チェーン取得と時系列結合ロジックを追加/拡張。
  - `src/lib/chat-messages.ts`：履歴取得と永続化の補助関数を追加。
  - `src/lib/chat-service.ts`：モデル呼び出し/ストリーミング対応の拡張。
  - `prisma/schema.prisma`：`Message.requestId`の追加とユニーク制約。
- 新規作成ファイル：
  - `src/lib/history-summarizer.ts`：履歴要約ロジックの実装。
  - `src/lib/usage-limiter.ts`：日次上限チェックを集約。
  - `src/lib/safety-filter.ts`：危険入力の検出と拒否。
  - `src/lib/moderation-client.ts`：外部モデレーションAPIのラッパー。
