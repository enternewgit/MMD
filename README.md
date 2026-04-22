# MMD Viewer Setup

このプロジェクトは、`src/index.html` から MMD モデルを読み込みます。
モデル本体が重い場合は、実体を外部ドライブに置いたまま、
workspace 側では相対パスで参照する運用が可能です。

## 方針

- workspace 側: 相対パスで参照する
- 実体データ: 外部ドライブに置く
- つなぎ込み: Windows の Junction (ジャンクション) を使う

## 例: 紅魔館モデルを外部ドライブから参照

前提:

- モデル実体: `D:\MMD\紅魔館\紅魔館\紅魔館.pmx`
- プロジェクト: `\practice\MMD`

### 1. workspace 側にジャンクションを作る

PowerShell でプロジェクトルートへ移動して実行します。

```powershell
Set-Location "\practice\MMD"
New-Item -ItemType Junction -Path ".\mmd\紅魔館" -Target "D:\MMD\紅魔館\紅魔館"
```

すでに存在する場合はこの作成コマンドは不要です。

### 2. コードは相対パスで読む

`src/index.html` のモデル URL を以下のように設定します。

```js
const modelUrl = '../mmd/紅魔館/紅魔館.pmx';
```

### 3. 接続確認

```powershell
Set-Location "\practice\MMD"
Test-Path ".\mmd\紅魔館\紅魔館.pmx"
Get-Item ".\mmd\紅魔館" | Select-Object FullName, LinkType, Target
```

- `Test-Path` が `True` なら到達できています。
- `LinkType` が `Junction` なら設定できています。

## 削除・張り直し

ジャンクションのみ削除します。外部ドライブ側の実体データは削除されません。

```powershell
Set-Location "\practice\MMD"
Remove-Item ".\mmd\紅魔館"
```

その後、必要なら `New-Item -ItemType Junction ...` で再作成します。

## 注意点

- `D:\...` の絶対パスをブラウザから直接読み込む方法は、環境によって失敗しやすいです。
- ローカルファイル直開きより、ローカルサーバー経由で開く方が安定します。
