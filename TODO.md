# TODO

## P1
- [ ] 将来対応: ミニマップ機能を実装する（現在は未実装）。
- [ ] 将来対応:メッセージ折りたたみ機能を実装する（`isCollapsed` のUI反映）。
- [ ] 将来対応:折りたたみ時に表示する inline title を自動生成・保存・表示する（`autoTitle` の実利用）。
- [ ] ブランチ作成APIを仕様準拠にする（`POST /api/messages/{id}/branch` を追加し、`/api/chat` の暗黙作成は移行期間は互換維持）。
- [ ] 本番DBの作成
- [ ] DBのセキュリティポリシーの作成
- [ ] ダークモードの実装
- [ ] 英語対応

## P2
- [ ] Pro課金（Stripe）の実装を完了する（購読導線/API/Webhook/状態反映）。
- [✖︎] 日次上限リセット時刻を仕様で明確化し、実装をタイムゾーン固定にする（現状はサーバーローカル時刻依存）。

## P3
- [✖︎] `.js` と `.ts` の重複実装を整理し、TypeScriptへ統一する（例: `conversation-history`, `usage-limiter`）。
- [ ] テスト実行時の `MODULE_TYPELESS_PACKAGE_JSON` 警告を解消する。
- [ ] `baseline-browser-mapping` の警告を解消する（依存更新）。
