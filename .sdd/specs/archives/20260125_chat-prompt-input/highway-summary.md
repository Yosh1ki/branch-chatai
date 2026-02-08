# Highway Summary

## 変更内容
- `chats/[chatId]` のプロンプト送信フローを状態管理し、送信後にユーザーバブルとAI応答へ内容を更新するようにした。
- プロンプト入力に矢印ボタンを追加し、自動リサイズ（高さのスムーズな変化）を実装した。
- 最新メッセージ取得結果と送信結果の同期ロジックを追加し、カードの使い回し表示を維持した。

## 追加・更新ファイル
- `src/lib/chat-prompt-state.js`
- `tests/chat-prompt-state.test.js`
- `src/components/ChatCanvasShell.tsx`
- `src/components/AssistantCard.tsx`
- `src/components/UserBubble.tsx`

## テスト
- `npm test`
