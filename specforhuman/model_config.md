

---
# モデルコンフィグ仕様書（Branches: MVP版）

本ドキュメントでは、Branchesプロダクトにおける利用可能なAIモデルの設定と仕様を定義します。  
モデル選択に関する挙動や制限、および開発・運用で参照すべきパラメータなどを記載します。

---

## 🎯 対象モデル一覧（MVP版）

| モデル名           | プロバイダ      | モデルID            | ストリーミング | 最大入力長     | 想定プラン |
|--------------------|------------------|---------------------|----------------|---------------|------------|
| GPT-4o-mini        | OpenAI           | `gpt-4o-mini`       | ✔︎              | 2048 tokens   | Free / Pro |
| Claude 3 Opus      | Anthropic        | `claude-3-opus`     | ✗              | 4096 tokens   | Proのみ    |
| Gemini 1.5 Pro     | Google           | `gemini-1.5-pro`    | ✔︎              | 8192 tokens   | Free / Pro |

---

## ⚙️ モデルごとの詳細設定

### GPT-4o-mini（OpenAI）

- **モデル名**：`gpt-4o-mini`
- **用途**：軽量かつ応答性が高く、初期のデフォルトモデルとして利用
- **ストリーミング対応**：✔︎
- **標準パラメータ**：
  ```
  temperature: 0.5
  max_tokens: 1024
  top_p: 1
  ```

---

### Claude 3 Opus（Anthropic）

- **モデル名**：`claude-3-opus`
- **用途**：深い議論や高精度な推論が必要な場面で使用
- **ストリーミング対応**：✗（JSONレスポンス）
- **標準パラメータ**：
  ```
  temperature: 0.2
  max_tokens: 2000
  ```

---

### Gemini 1.5 Pro（Google）

- **モデル名**：`gemini-1.5-pro`
- **用途**：マルチモーダルや教育・説明用途に強く、広い入力に対応
- **ストリーミング対応**：✔︎
- **標準パラメータ**：
  ```
  temperature: 0.6
  max_tokens: 1500
  ```

---

## 🧪 開発・運用向けメモ

- モデルIDは `api_spec.md` に準拠してフロントエンドで切替可能とする
- LangChainでの呼び出し例：
  ```ts
  const model = chatModel(model_name, { temperature, max_tokens });
  ```
- Proユーザーかどうかを `users.plan_type` で判定し、制限をかける
- コスト試算に必要な場合、将来的に「消費トークン量」をログへ記録予定

---

以上。