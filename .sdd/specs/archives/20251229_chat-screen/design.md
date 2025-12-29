# 技術設計書

## アーキテクチャ概要
Next.js App Router上の`src/app/chat/[id]`ページとしてUIを実装し、既存のReactクライアントコンポーネント構成とTailwind CSSでスタイリングする。動作はクライアント内で完結し、API連携やDB更新は行わない。

## 主要コンポーネント
### コンポーネント1：ChatPage
- 責務：chat/[id] 画面全体のレイアウトを描画する（背景、ヘッダー、会話UI、ブランチUI）。
- 入力：Next.jsのルートパラメータ`id`（表示専用、現状はUIのみ）。
- 出力：ページ全体のReactツリー。
- 依存関係：`ChatHeader`、`UserBubble`、`AssistantCard`、`BranchSelector`。

### コンポーネント2：UserBubble
- 責務：ユーザー発話の吹き出しとコピーアイコン、縦ラインの起点を表示する。
- 入力：表示文言（固定文言）。
- 出力：吹き出しUIとコピー操作。
- 依存関係：クリップボードAPI、アイコンコンポーネント。

### コンポーネント3：AssistantCard
- 責務：assistant回答カード、カード内テキスト、コピー/メニュー操作を表示する。
- 入力：カード本文（固定ダミーテキスト）。
- 出力：カードUI、コピー処理、ellipsisメニュー表示状態。
- 依存関係：クリップボードAPI、アイコンコンポーネント、簡易メニューUI。

### コンポーネント4：BranchSelector
- 責務：ブランチポイント、点線、ピル、選択状態を表示する。
- 入力：初期選択状態（中央）。
- 出力：ブランチUIと選択状態の更新。
- 依存関係：SVGまたはCSS描画、状態管理（React state）。

## データモデル
### UI状態
- `selectedBranch`: `'main' | 'left' | 'right'`、ブランチ選択状態。
- `isMenuOpen`: `boolean`、assistantカードのメニュー表示状態。

## 処理フロー
1. ChatPageが背景・ヘッダー・中央カラムを描画する。
2. UserBubbleが固定文言とコピーアイコンを表示し、クリックでクリップボードへコピーする。
3. AssistantCardが本文、メタ情報、アイコン群を描画し、ellipsisクリックで簡易メニューの表示状態を切り替える。
4. BranchSelectorが点線とピルを描画し、クリックで`selectedBranch`を更新して選択丸の色を切り替える。

## エラーハンドリング
- クリップボードAPI失敗時は例外を握りつぶし、UIに影響を与えない。
- メニュー表示はUI内部状態のみで完結し、外部エラーは想定しない。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/app/chats/[chatId]/page.tsx`：chat画面のUIを実装する。
  - `src/components/ChatHeader.tsx`：ヘッダーUI（既存がなければ新規作成）。
  - `src/components/UserBubble.tsx`：ユーザー吹き出しUI（新規）。
  - `src/components/AssistantCard.tsx`：回答カードUI（新規）。
  - `src/components/BranchSelector.tsx`：ブランチUI（新規）。
- 新規作成ファイル：
  - `src/components/ChatHeader.tsx`：ロゴとドロップダウンのヘッダー。
  - `src/components/UserBubble.tsx`：ユーザー吹き出しとコピー。
  - `src/components/AssistantCard.tsx`：回答カードと操作群。
  - `src/components/BranchSelector.tsx`：ブランチ選択UI。
