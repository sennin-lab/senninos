# SenniNOS

ブラウザで動くWebデスクトップです。ユーザー名とパスワードでサインインし、ファイル管理・ターミナル・メモ帳・表計算・プレゼン・ペイントなどを使えます。データは Supabase に保存され、Render で配信できます。

## 機能

- ユーザー名方式のアカウント（Supabase Auth）と、ユーザーごとのプロフィール
- ウィンドウ管理（ドラッグ・リサイズ・最小化・最大化）。マウス・タッチ両対応
- エクスプローラー（新規フォルダー・読み込み・ダウンロード・削除）
- ターミナル（help, ls, cd, mkdir, touch, rm, cat, tree, calc など）
- メモ帳 / SenniWord / SenniSheet / SenniSlide（ドキュメントフォルダーに保存・再読込）
- ストア（時計・カレンダー・ペイントをインストール可能）
- 壁紙などの設定は Supabase に保存され、どの端末でも同じ

## 開発

Node.js 20 以上が必要です。

```sh
npm ci
npm run dev
```

よく使うコマンドは次のとおりです。

```sh
npm run test
npm run typecheck
npm run build
```

環境変数は `.env` に次の2つを設定します。

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable key>
```

## Supabase のセットアップ

1. Supabase の SQL エディタで `supabase/schema.sql` を実行します。何度実行しても安全です。
2. Authentication → Providers → Email で「Confirm email」をオフにします。ユーザー名方式はメールを受け取れないため、オフにしないと登録が完了しません。
3. Authentication → URL Configuration で Site URL と Redirect URLs に配信先の URL（例: `https://senninos.onrender.com`）を登録します。

テーブル構成は次のとおりです。
- `profiles`: ユーザー名（トリガーで登録時に自動作成）
- `user_settings`: 壁紙・インストール済みアプリ
- `user_filesystems`: ファイルシステム全体（JSON）

すべてのテーブルは RLS で、本人の行だけ読み書きできます。

## Render へのデプロイ

`render.yaml` を含んでいるため、Blueprint として取り込めます。手動で作成する場合は次の設定にします。

- Service type: Static Site
- Build Command: `npm ci --include=dev && npm run build`
- Publish Directory: `dist`
- Rewrite Rule: Source `/*` → Destination `/index.html`（Action: Rewrite）
- Environment Variables: `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`、`NODE_VERSION=20`

ビルドツールは devDependencies にあるため、`--include=dev` を付けて `NODE_ENV=production` でも確実にインストールされるようにしています。

## ディレクトリ構成

- `src/lib/fs.ts`: 仮想ファイルシステム（純粋関数）
- `src/lib/formula.ts`: 安全な計算式・表計算エンジン（eval を使いません）
- `src/lib/userData.ts`: Supabase への保存・読み込みとローカルキャッシュ
- `src/hooks/`: ファイルシステム・設定・ウィンドウ管理のフック
- `src/components/os/`: デスクトップ、タスクバー、ウィンドウ、アプリ登録（`appRegistry.ts`）
- `src/components/os/apps/`: 各アプリ
- `supabase/schema.sql`: データベース定義
