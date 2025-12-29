# 技術設計書

## アーキテクチャ概要
Next.js App Routerの`src/app/chats/[chatId]/page.tsx`にキャンバス操作を統合する。既存のUIツリーを維持したまま、ページ全体をパン・ズーム可能なラッパーで包み、クライアント側の状態管理のみで実現する。外部APIやDBへの変更は行わない。

## 主要コンポーネント
### コンポーネント1：ChatCanvasPage
- 責務：`chats/[chatId]` の既存UIを包み込み、キャンバス操作（パン・ズーム・リセット・倍率表示）を提供する。
- 入力：ルートパラメータ`chatId`（既存画面と同様）。
- 出力：キャンバス化されたページ全体のReactツリー。
- 依存関係：`CanvasViewport`、既存チャットUIコンポーネント群。

### コンポーネント2：CanvasViewport
- 責務：ドラッグ/ホイール/ピンチ入力を受け取り、transform（translate/scale）を適用する。
- 入力：初期スケール、最小/最大スケール、パン制限値。
- 出力：変換済みのコンテンツ描画領域。
- 依存関係：ブラウザのPointer/Wheelイベント、React state。

### コンポーネント3：CanvasControls
- 責務：倍率表示とリセット操作を提供する。
- 入力：現在のスケール値、リセット用ハンドラ。
- 出力：UIコントロール（倍率ラベル、リセットボタン）。
- 依存関係：`CanvasViewport`の状態。

## データモデル
### CanvasState
- `scale`: number、現在のズーム倍率。
- `offsetX`: number、X方向のパン量。
- `offsetY`: number、Y方向のパン量。
- `isDragging`: boolean、ドラッグ中フラグ。
- `minScale`: number、最小倍率。
- `maxScale`: number、最大倍率。

## 処理フロー
1. `ChatCanvasPage`が既存UIを`CanvasViewport`内に配置する。
2. `CanvasViewport`がPointerイベントでパン操作を処理し、`offsetX/offsetY`を更新する。
3. ホイール/ピンチ操作で`scale`を更新し、最小/最大倍率で制限する。
4. `CanvasControls`が`scale`を表示し、リセット操作で初期値へ戻す。

## エラーハンドリング
- 入力イベント処理失敗時は例外を握りつぶし、UIを崩さない。
- 変換値が範囲外になった場合はクランプして安全な範囲に戻す。

## 既存コードとの統合
- 変更が必要なファイル：
  - `src/app/chats/[chatId]/page.tsx`：既存UIをキャンバスラッパーに統合する。
- 新規作成ファイル：
  - `src/components/CanvasViewport.tsx`：パン/ズームを適用するラッパー。
  - `src/components/CanvasControls.tsx`：倍率表示とリセット操作。
  - `src/lib/canvas-state.js`：キャンバス状態の型とユーティリティ。
