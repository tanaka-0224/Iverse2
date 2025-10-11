# Iverse

何かを共にする仲間を探すマッチングアプリ

## 開発環境

### 1. 環境変数の設定
プロジェクトルートに`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**重要**: `.env`ファイルは`.gitignore`に含まれているため、GitHubにアップロードされません。

### 2. 依存関係のインストールと実行
1. vscodeのターミナルでIverse2にいることを確認
2. npm installをターミナルにて実行
3. npm run devをターミナルにて実行
4. 次のURLで動作確認　url：http://localhost:5173/

- 公開中(url：https://cmez2u4bpnhzy0uklzjgm00sv.bolt.host/)

👉 最初は GitHub Pages、Next.jsとかに移行後、動作確認が安定したら Netlify とか Vercel に移行。要検討

## 開発手順

--------
この欄は最初の一回だけ

1. リモートリポジトリをローカルにクローン
   git clone https://github.com/tanaka-0224/Iverse2.git
2. ディレクトリに移動する: クローンしたリポジトリのディレクトリに移動
   ターミナルにコピペ：cd Iverse2
3. ブランチを確認する: 現在のブランチを確認します。クローン直後は通常mainブランチにいることを確認
   ターミナルにコピペ：git branch
4. developブランチに切り替える: 開発はdevelopブランチから始めるので、まずdevelopブランチに切り替え
   ターミナルにコピペ：git checkout develop
--------
branch 命名規則：feature/issue-[実施する issue 番号]

1. 取り組む issue を決める(url：https://github.com/users/tanaka-0224/projects/9/views/1)
   ＊取り組む issue を 1 と仮定

2. 自分がいるブランチが develop であることを確認(ターミナル：git branch→develop の横に*があることを確認)

3. 命名規則に則って branch を切る(ターミナル：git checkout -b feature/issue-1)

4. 作業する

5. 作業完了したら github にコードをあげる(ターミナル：git add . → ターミナル：git commit -m "[やった作業を簡潔に]" → ターミナル：git push origin feature/issue-1)

6. Pull requests タブに遷移(url：https://github.com/tanaka-0224/Iverse2/pulls )し、ボタンを押し、
base repository:はtanaka-0224/Iverse2に、
baseはdevelopに変更、
head repository:はtanaka-0224/Iverse2に、
compareはfeature/issue-1になってるのを確認し、
(base repository:はtanaka-0224/Iverse2に変更した際にリロード入って、base:develop　compare: featre/issue-1になっていてもOK)
テンプレに沿って作成

8. Review 依頼を出す(田中か藺牟田)

8. 修正コメントもらったら修正事項を満たすようにfeature/issue-1で作業する(5に戻って8に進む　もらわなかったら9に進む)

9. 承認をもらったら merge する

以下ループ

## 技術スタック

初期

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
* bolt

## ルートディレクトリ構成

### 設定ファイル
- **`package.json`** - プロジェクトの依存関係とスクリプトを定義
- **`vite.config.ts`** - Viteの設定ファイル（ビルドツール設定）
- **`tsconfig.json`** - TypeScriptの設定ファイル
- **`tailwind.config.js`** - Tailwind CSSの設定ファイル
- **`eslint.config.js`** - ESLintの設定ファイル（コード品質管理）
- **`postcss.config.js`** - PostCSSの設定ファイル

### その他のファイル
- **`index.html`** - アプリケーションのエントリーポイントHTML
- **`README.md`** - プロジェクトの説明書
- **`LICENSE`** - ライセンスファイル

## src/ ディレクトリ構成

### エントリーポイント
- **`main.tsx`** - アプリケーションのエントリーポイント（Reactアプリの起動）
- **`App.tsx`** - メインアプリケーションコンポーネント（認証状態管理、画面切り替え）

### ライブラリ・設定
- **`lib/supabase.ts`** - Supabaseクライアントの設定と初期化
- **`types/database.types.ts`** - データベースの型定義（TypeScript用）
- **`index.css`** - グローバルスタイルシート

### カスタムフック
- **`hooks/useAuth.ts`** - 認証関連のカスタムフック（ログイン、ログアウト、ユーザー状態管理）
- **`hooks/useProfile.ts`** - プロフィール関連のカスタムフック

### コンポーネント構成

#### 認証関連 (`components/auth/`)
- **`AuthForm.tsx`** - ログイン・新規登録フォームコンポーネント

#### ナビゲーション (`components/navigation/`)
- **`BottomNav.tsx`** - ボトムナビゲーションバーコンポーネント

#### 投稿関連 (`components/posts/`)
- **`CreatePostScreen.tsx`** - 投稿作成画面コンポーネント
- **`PostBoardScreen.tsx`** - 投稿一覧画面コンポーネント

#### チャット関連 (`components/chat/`)
- **`ChatScreen.tsx`** - チャット画面コンポーネント

#### アカウント関連 (`components/account/`)
- **`AccountScreen.tsx`** - アカウント設定画面コンポーネント

#### おすすめ機能 (`components/recommendations/`)
- **`RecommendationsScreen.tsx`** - おすすめ画面コンポーネント
- **`RecommendationCard.tsx`** - おすすめカードコンポーネント

#### UIコンポーネント (`components/ui/`)
- **`Button.tsx`** - 再利用可能なボタンコンポーネント
- **`Input.tsx`** - 入力フィールドコンポーネント
- **`TextArea.tsx`** - テキストエリアコンポーネント
- **`LoadingSpinner.tsx`** - ローディングスピナーコンポーネント

## 主要な技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全性のための言語
- **Vite** - 高速なビルドツール
- **Tailwind CSS** - ユーティリティファーストのCSSフレームワーク

### バックエンド・データベース
- **Supabase** - バックエンドサービス（認証、データベース、リアルタイム機能）

### 開発ツール
- **ESLint** - コード品質管理
- **PostCSS** - CSS処理ツール
- **Lucide React** - アイコンライブラリ

## データベース構造

### 主要テーブル
- **`users`** - ユーザー情報（名前、メール、スキル、目的等）
- **`board`** - ボード情報（タイトル、目的、参加者制限等）
- **`board_participants`** - ボード参加者管理（参加ステータス）
- **`message`** - メッセージデータ（ボード内のチャット）
- **`like`** - いいね機能（ボードへのいいね）
