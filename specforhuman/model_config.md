---
# モデルコンフィグ仕様書（Branch: MVP版）

本ドキュメントでは、Branchプロダクトにおける利用可能なAIモデルの設定と仕様を定義します。
モデル選択に関する挙動や制限、および開発・運用で参照すべきパラメータなどを記載します。
---

## 🎯 対象モデル一覧（MVP 版）

| モデル名            | プロバイダ | モデル ID            | ストリーミング | 想定プラン |
| ------------------- | ---------- | -------------------- | -------------- | ---------- |
| GPT-5.2 Latest      | OpenAI     | `gpt-5.2-chat-latest`| ✔︎             | Free / Pro |
| GPT-5.2 Thinking    | OpenAI     | `gpt-5.2`            | ✔︎             | Free / Pro |
| Claude Sonnet 4.5   | Anthropic  | `claude-sonnet-4-5`  | ✔︎             | Free / Pro |
| Claude Opus 4.5     | Anthropic  | `claude-opus-4-5`    | ✔︎             | Free / Pro |
| Gemini 3 Pro        | Google     | `gemini-3-pro-preview` | ✔︎           | Free / Pro |
| Gemini 3 Flash      | Google     | `gemini-3-flash-preview` | ✔︎         | Free / Pro |

---

## ⚙️ モデル呼び出しの共通ルール

-   **チャット単位でモデル固定**（ブランチ単位の切替は将来対応）
-   **フォールバックは 1 段のみ**
-   **タイムアウト/レート制限時は 1 回のみ再試行**
-   **入力上限**：8k トークン
-   **出力上限**：800〜1200 トークン（固定レンジ）

---

## 🔁 フォールバック順

1. OpenAI（`gpt-5.2-chat-latest` または `gpt-5.2`）
2. Anthropic（`claude-sonnet-4-5` / `claude-opus-4-5`）
3. Gemini（`gemini-3-pro-preview` / `gemini-3-flash-preview`）

---

## 🧪 開発・運用向けメモ

-   モデル ID は `api_spec.md` に準拠してフロントエンドで切替可能とする
-   LangChain での呼び出し例：
    ```ts
    const model = chatModel(model_name, { temperature, max_tokens });
    ```
-   Pro ユーザーかどうかを `users.plan_type` で判定し、制限をかける
-   コスト試算に必要な場合、消費トークン量をログへ記録する

---

以上。
