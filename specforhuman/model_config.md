---
# モデルコンフィグ仕様書（Branch: MVP版）

本ドキュメントでは、Branchプロダクトにおける利用可能なAIモデルの設定と仕様を定義します。
モデル選択に関する挙動や制限、および開発・運用で参照すべきパラメータなどを記載します。
---

## 🎯 対象モデル一覧（MVP 版）

| モデル名       | プロバイダ | モデル ID        | ストリーミング | 最大入力長  | 想定プラン |
| -------------- | ---------- | ---------------- | -------------- | ----------- | ---------- |
| GPT-4o-mini    | OpenAI     | `gpt-4o-mini`    | ✔︎             | 2048 tokens | Free / Pro |
| Claude 3 Opus  | Anthropic  | `claude-3-opus`  | ✗              | 4096 tokens | Pro のみ   |
| Gemini 1.5 Pro | Google     | `gemini-1.5-pro` | ✔︎             | 8192 tokens | Free / Pro |

---

## ⚙️ モデルごとの詳細設定

### GPT-4o-mini（OpenAI）

-   **モデル名**：`gpt-4o-mini`
-   **用途**：軽量かつ応答性が高く、初期のデフォルトモデルとして利用
-   **ストリーミング対応**：✔︎
-   **標準パラメータ**：
    ```
    temperature: 0.5
    max_tokens: 1024
    top_p: 1
    ```

---

### Claude 3 Opus（Anthropic）

-   **モデル名**：`claude-3-opus`
-   **用途**：深い議論や高精度な推論が必要な場面で使用
-   **ストリーミング対応**：✗（JSON レスポンス）
-   **標準パラメータ**：
    ```
    temperature: 0.2
    max_tokens: 2000
    ```

---

### Gemini 1.5 Pro（Google）

-   **モデル名**：`gemini-1.5-pro`
-   **用途**：マルチモーダルや教育・説明用途に強く、広い入力に対応
-   **ストリーミング対応**：✔︎
-   **標準パラメータ**：
    ```
    temperature: 0.6
    max_tokens: 1500
    ```

---

## 🧪 開発・運用向けメモ

-   モデル ID は `api_spec.md` に準拠してフロントエンドで切替可能とする
-   LangChain での呼び出し例：
    ```ts
    const model = chatModel(model_name, { temperature, max_tokens });
    ```
-   Pro ユーザーかどうかを `users.plan_type` で判定し、制限をかける
-   コスト試算に必要な場合、将来的に「消費トークン量」をログへ記録予定

---

以上。
