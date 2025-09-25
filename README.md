# Iverse

何かを共にする仲間を探すマッチングアプリ

## 開発環境

- VS Code + Live Server 推奨
  Live Server の導入と使用方法

1. vscode 左側の拡張機能(田に似たアイコン)を押す
2. 開いたサイドバーの上の検索バーに「Live Server Ritwick Dey」を入力して検索
3. install ボタンを押す
4. vscode 画面右下に「Go Live」というボタンが増え、押したら自動的にサイトが開く(url：http://127.0.0.1:5500/ )

- GitHub Pages で公開中(url：https://tanaka-0224.github.io/Iverse/)

👉 最初は GitHub Pages、Next.jsとかに移行後、動作確認が安定したら Netlify とか Vercel に移行。要検討

## 開発手順

--------
この欄は最初の一回だけ

1. リモートリポジトリをローカルにクローン
   git clone https://github.com/tanaka-0224/Iverse.git
2. ディレクトリに移動する: クローンしたリポジトリのディレクトリに移動
   ターミナルにコピペ：cd Iverse
3. ブランチを確認する: 現在のブランチを確認します。クローン直後は通常mainブランチにいることを確認
   ターミナルにコピペ：git branch
4. developブランチに切り替える: 開発はdevelopブランチから始めるので、まずdevelopブランチに切り替え
   ターミナルにコピペ：git checkout develop
--------
branch 命名規則：feature/issue-[実施する issue 番号]

1. 取り組む issue を決める(url：https://github.com/users/tanaka-0224/projects/5/views/1)
   ＊取り組む issue を 1 と仮定

2. 自分がいるブランチが develop であることを確認(ターミナル：git branch→develop の横に*があることを確認)

3. 命名規則に則って branch を切る(ターミナル：git checkout -b feature/issue-1)

4. 作業する

5. 作業完了したら github にコードをあげる(ターミナル：git add . → ターミナル：git commit -m "[やった作業を簡潔に]" → ターミナル：git push origin feature/issue-1)

6. Pull requests タブに遷移(url：https://github.com/tanaka-0224/Iverse/pulls )し、ボタンを押し、テンプレに沿って作成、baseブランチはmainからdevelopに変更

8. Review 依頼を出す(田中か藺牟田)

8. 修正コメントもらったら修正事項を満たすようにfeature/issue-1で作業する(5に戻って8に進む　もらわなかったら9に進む)

9. 承認をもらったら merge する

以下ループ

## 技術スタック

初期

### フロントエンド
* HTML
* CSS
* JavaScript

### バックエンド
* Firebase

### その他ツール
* Git
* GitHub
* Figma

理想
### フロントエンド
* TypeScript
* React
* Next.js
### バックエンド
* Firebase
### その他ツール
* Git
* Github
* Figma


## ファイル構成

```text
tomoya824.github.io/
├─ index.html                # エントリーポイント。断片HTML/CSSを読み込み後、app.jsを起動
├─ scripts/
│  ├─ app.js                 # アプリ初期化・ナビゲーション・ログイン/ログアウト処理
│  ├─ core/
│  │  ├─ dom.js             # DOMユーティリティ：getViews, show, setActiveNav
│  │  └─ state.js           # アプリ状態・推薦ロジック・LocalStorage保存/復元
│  └─ views/
│     ├─ ai.js              # 「AIおすすめ」ビューの描画・操作
│     ├─ chat.js            # チャットビューの初期化・送受信（デモ応答）
│     ├─ home.js            # マイページ：プロフィール保存/反映
│     └─ profile-modal.js   # プロフィール詳細モーダルの開閉/接続導線
├─ styles/
│  ├─ base.css              # 共通スタイル
│  ├─ ai.css                # AIおすすめ用スタイル
│  ├─ chat.css              # チャット用スタイル
│  ├─ home.css              # マイページ用スタイル
│  └─ modal.css             # モーダル用スタイル
└─ views/
   ├─ ai.html               # AIおすすめビュー断片（id="view-ai"）
   ├─ chat.html             # チャットビュー断片（id="view-chat"）
   ├─ home.html             # マイページ断片（id="view-home"）
   └─ profile-modal.html    # プロフィール詳細モーダル断片
```

## 主要ファイルの役割

- `index.html`
  - `data-include` で `views/*.html` を取得し、必要な CSS（`data-css`）を動的に `<head>` へ追加。
  - すべての読み込み完了後に `scripts/app.js` を ES Modules としてロードして起動。
- `scripts/app.js`
  - アプリ全体の初期化、ログイン/ログアウト、ナビゲーション（`getViews`/`show`/`setActiveNav`）の制御。
  - 各ビューの初期化関数を呼び出し、状態に応じた初期表示を切り替え。
- `scripts/core/state.js`
  - `state`（ユーザー/自分の情報）と疑似実績の初期化、ローカル保存（`save`）/復元（`load`）。
  - 推薦スコア計算（`matchScore`, `getTopMatches`）、グルーピング（`makeGroupsByGoal`）等のロジック。
- `scripts/core/dom.js`
  - ビューDOMの取得（`getViews`）、ビュー表示切替（`show`）、ナビ活性化（`setActiveNav`）。
- `scripts/views/home.js`
  - 目的/スキルの保存（`initHome`）と入力欄への反映（`fillHomeFromState`）。
- `scripts/views/ai.js`
  - おすすめ個人/グループのリスト描画（`renderAI`）。プロフィールモーダル/チャット起動導線を提供。
- `scripts/views/chat.js`
  - チャットの初期化、送信処理、デモ応答の表示。送信時に実績を更新して保存。
- `scripts/views/profile-modal.js`
  - モーダルの開閉、対象ユーザーの表示、接続ボタンでチャットへ遷移。

## 拡張/開発のヒント

- 新しいビューを追加するには：
  1) `views/xxx.html` と対応する CSS を `styles/xxx.css` に作成。
  2) `index.html` の `<main>` に `<div data-include="views/xxx.html" data-css="styles/xxx.css"></div>` を追加。
  3) 振る舞いが必要なら `scripts/views/xxx.js` を作成し、必要に応じて `scripts/app.js` から初期化を呼び出す。
  4) ナビボタンを増やす場合は、`index.html` の `<header>` にボタンを追加し、`data-target` にビューIDを設定。

## データ保存

- ブラウザの LocalStorage（キー: `iverse_state_v1`）を使用。`state.me` と `state.users` を保存/復元します。
