# 技術設計書

## アーキテクチャ概要
既存の`CanvasViewport`と`ChatCanvasShell`を拡張し、キャンバス操作と固定UIを分離する。ヘッダーやブランチ一覧ボタンはキャンバス外に配置して固定表示し、キャンバス内はパン・ピンチズームのみを担当する。入力処理はクライアント側で完結し、API/DB変更は不要。

## 主要コンポーネント
### コンポーネント1：ChatCanvasShell
- 責務：固定UI（ヘッダー・ブランチ一覧ボタン）とキャンバス表示を分離して配置する。
- 入力：`chatId`。
- 出力：固定UI＋キャンバスの統合ページ。
- 依存関係：`ChatHeader`、`CanvasViewport`、`CanvasControls`、既存チャットUI。

### コンポーネント2：CanvasViewport
- 責務：パン操作とピンチズーム処理を提供する。二本指スクロールはパンに変換し、ホイールズームは無効化する。
- 入力：`CanvasState`、最小/最大倍率、パン範囲。
- 出力：transform適用済みのコンテンツ。
- 依存関係：Pointer/Wheelイベント、`canvas-state`ユーティリティ。

### コンポーネント3：CanvasControls
- 責務：倍率表示とリセット操作を提供する。
- 入力：現在倍率、リセットハンドラ。
- 出力：UIコントロール。
- 依存関係：`CanvasViewport`の状態。

## データモデル
### CanvasState
- `scale`: number、ズーム倍率。
- `offsetX`: number、X方向オフセット。
- `offsetY`: number、Y方向オフセット。

### InputState
- `isDragging`: boolean、ドラッグ中フラグ。
- `allowSelection`: boolean、Commandキー押下時の選択許可。

## 処理フロー
1. `ChatCanvasShell`が固定UIをレンダリングし、キャンバス部分のみ`CanvasViewport`へ渡す。
2. `CanvasViewport`は二本指スクロールをパン操作に変換し、ホイールによるズームを無効化する。
3. ピンチ操作時のみ`scale`を更新し、最小/最大倍率にクランプする。
4. `CanvasControls`が倍率を表示し、リセット操作で初期値に戻す。
5. ドラッグ中は`user-select: none`で選択を抑止し、Commandキー押下時のみ選択を許可する。

## エラーハンドリング
- 入力イベント処理失敗時は直前の状態を維持しUIを崩さない。
- 変換値は常にクランプして範囲外を防ぐ。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/components/ChatCanvasShell.tsx`：固定UIの配置とキャンバス分離。
  - `src/components/CanvasViewport.tsx`：入力処理の変更（ホイールズーム無効化、二本指パン、選択抑制）。
- 新規作成ファイル：
  - 追加の新規ファイルは不要（既存コンポーネントを拡張）。
