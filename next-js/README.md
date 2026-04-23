# MMD Viewer (Next.js)

このディレクトリは、Three.js + MMD の表示を Next.js 上で動かすための実装です。  
元のHTML実装を段階的に移行しています。

## 目的

- HTML直書きの描画処理を Next.js に移行する
- モデル読み込みを public 配下のURLで統一する
- MMD表示の土台を作り、今後ページ分割しやすくする

## 動作環境

- Next.js 16
- three 0.152.2
- Node.js (LTS推奨)

## セットアップ

1. 依存インストール
   npm install

2. 開発サーバー起動
   npm run dev

3. ブラウザで確認
   http://localhost:3000

## モデル配置ルール

- MMDファイルは public 配下に置く
- 例:
  - public/mmd/紅魔館/紅魔館.pmx
- コード側の参照は public を含めず、先頭スラッシュで指定する
  - /mmd/紅魔館/紅魔館.pmx

## 実装メモ

- 描画処理はクライアント側で実行する
- Three.js初期化は useEffect 内で行う
- canvas は querySelector ではなく ref で取得する
- アンマウント時に renderer と controls を破棄する

## よくあるエラー

### 404 Not Found (PMX)
原因:
- ファイルシステムパスをURLとして指定している

対処:
- modelUrl を /mmd/... 形式にする
- 実ファイルが public/mmd/... に存在するか確認する

### Module not found (MMDAnimationHelper)
原因:
- three のバージョン差異
- three.jsのバージョン関連でうまくいかないときは以下をお試しください
npm uninstall three
npm install three@0.152.2

対処:
- three のバージョンを 0.152.2 に固定する

## 今後の予定

- 画面サイズに応じたレスポンシブ化
- テクスチャ読み込みエラーの可視化
- MMD用ページと通常3Dページの分離