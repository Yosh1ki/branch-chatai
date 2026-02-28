# Highway Summary

## 実装方針（TDD）
1. 先にテストを `*-core.ts` 参照へ変更し、`ERR_MODULE_NOT_FOUND` で失敗することを確認（Red）。
2. TypeScript 正規実装として `conversation-history-core.ts` と `usage-limiter-core.ts` を追加（Green）。
3. 既存 `.ts` 実装は core を参照する構成へ変更し、`.js` は互換の再エクスポートだけに縮退（Refactor）。

## 変更内容
- `conversation-history` の親チェーン構築ロジックを `src/lib/conversation-history-core.ts` に集約。
- `usage-limiter` の日次上限判定ロジックを `src/lib/usage-limiter-core.ts` に集約。
- `src/lib/conversation-history.ts` は core ロジックを利用しつつ、`parseMessageContent` による整形を維持。
- `src/lib/usage-limiter.ts` は core ロジックを利用しつつ、既存の `FREE_PLAN_DAILY_LIMIT` とDB照会フローを維持。
- `src/lib/conversation-history.js` / `src/lib/usage-limiter.js` は重複実装を削除し、TypeScript core への再エクスポートに変更。
- テストは `tests/conversation-history.test.js` / `tests/usage-limiter.test.js` を更新し、core 実装を直接検証。

## 対応表（移行元/移行先）
| 移行元（重複） | 移行先（正規） | 備考 |
| --- | --- | --- |
| `src/lib/conversation-history.js` | `src/lib/conversation-history-core.ts` | `.js` は再エクスポートのみ |
| `src/lib/conversation-history.ts` 内の `buildParentChain` ロジック | `src/lib/conversation-history-core.ts` | `.ts` 側は変換処理のみ保持 |
| `src/lib/usage-limiter.js` | `src/lib/usage-limiter-core.ts` | `.js` は再エクスポートのみ |
| `src/lib/usage-limiter.ts` 内の `isDailyLimitReached` ロジック | `src/lib/usage-limiter-core.ts` | `.ts` 側は上限値注入とDBチェックを保持 |

## 追加・更新ファイル
- `src/lib/conversation-history-core.ts`（追加）
- `src/lib/usage-limiter-core.ts`（追加）
- `src/lib/conversation-history.ts`（更新）
- `src/lib/usage-limiter.ts`（更新）
- `src/lib/conversation-history.js`（更新）
- `src/lib/usage-limiter.js`（更新）
- `tests/conversation-history.test.js`（更新）
- `tests/usage-limiter.test.js`（更新）

## 検証結果
- `npm test -- tests/conversation-history.test.js tests/usage-limiter.test.js` : 成功
- `npm test` : 成功（46 tests passed）
- `npm run lint` : 成功
