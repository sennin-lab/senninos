# SenniNOS

ブラウザで動くWebデスクトップです。ユーザー名とパスワードでサインインし、ファイル管理・ターミナル・メモ帳・表計算・プレゼン・ペイントなどを使えます。アカウントとデータは **Supabase** に保存されるため、どの端末・ブラウザからでも同じデスクトップを使えます。

## 機能

- ユーザー名とパスワードによるアカウント（Supabase Auth。ユーザー名は小文字の英数字と `_`）
- アカウントに紐づくデータの保存（ファイル構成・壁紙・テーマ・インストール済みアプリ）
- ウィンドウ管理（ドラッグ・リサイズ・最小化・最大化）。マウス・タッチ両対応
- iOS 風のガラス表現とばね（spring）アニメーション。OS の「視差効果を減らす」設定に従います
- エクスプローラー（新規フォルダー・読み込み・ダウンロード・削除）
  - `.txt` などのテキストはメモ帳で開く（ファイルごとに別ウィンドウ）
  - コード（`.ts` `.tsx` `.js` `.py` `.html` `.css` など）はコードエディタで開く
  - 画像は画像ビューアー、`.sdoc` は Senni Document で開く
- メモ帳 / SenniWord / SenniSheet / SenniSlide（ドキュメントフォルダーに保存・再読込）
- ターミナル（help, ls, cd, mkdir, touch, rm, cat, tree, calc など）
- ストア（時計・カレンダー・ペイントをインストール可能）

## Supabase のセットアップ

メールアドレスは使わず、ユーザー名とパスワードだけでアカウントを管理します（Supabase Auth は使いません）。

1. Supabase プロジェクトの **SQL Editor** で `supabase/schema.sql` を全体実行します。アカウント用のテーブルと、アプリが呼び出す関数（`senni_*`）が作成されます。
2. **Project Settings → API** で、Project URL と anon（publishable）キーを控えます。
3. `.env` に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を設定します。これらはビルド時に埋め込まれるため、変更したら再ビルド・再デプロイが必要です。

パスワードは bcrypt でハッシュ化して保存されます。アプリはテーブルを直接読まず、関数経由でのみデータにアクセスします（テーブルは RLS で全面的に拒否）。

## 開発

Node.js 20 以上が必要です。

```sh
cp .env.example .env   # VITE_SUPABASE_ANON_KEY を設定
npm ci
npm run dev
```

よく使うコマンドは次のとおりです。

```sh
npm run test
npm run typecheck
npm run build
```

## Render へのデプロイ

`render.yaml` を含んでいるため、Blueprint として取り込めます。Render の環境変数で `VITE_SUPABASE_ANON_KEY` を設定してください（ビルド時に埋め込まれます）。

手動で作成する場合は次の設定にします。

- Service type: Static Site
- Build Command: `npm ci --include=dev && npm run build`
- Publish Directory: `dist`
- Rewrite Rule: Source `/*` → Destination `/index.html`（Action: Rewrite）
- Environment Variables: `NODE_VERSION=20`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## データの扱い

- セッションのトークンは端末（localStorage）に保存し、サーバーには SHA-256 のハッシュだけを保存します。セッションは 30 日で失効します。
- 変更は約 0.8 秒後にまとめて送信されます。送信前の変更は端末にも退避され、ページを閉じても次回ログイン時に送り直されます。
- 複数の端末で同時に編集すると、後に保存された内容が優先されます（last-write-wins）。
- ログイン試行の回数制限はまだありません（後述の roadmap を参照）。

## ディレクトリ構成

- `src/lib/supabase.ts`: Supabase クライアント（関数呼び出し用）
- `src/lib/rpc.ts`: 関数呼び出しとエラーコードの共通処理
- `src/lib/accountAuth.ts`: 登録・サインイン・セッション検証
- `src/lib/cloudData.ts`: アカウントデータの読み込みと同期（デバウンス・直列送信・退避）
- `src/lib/fileAssociations.ts`: 拡張子ごとに開くアプリの決定
- `src/lib/fs.ts`: 仮想ファイルシステム（純粋関数）
- `src/lib/formula.ts`: 安全な計算式・表計算エンジン（eval を使いません）
- `src/hooks/`: 認証・アカウントデータ・ファイルシステム・設定・ウィンドウ管理のフック
- `src/components/os/`: デスクトップ、タスクバー、ウィンドウ、アプリ登録（`appRegistry.ts`）
- `src/components/os/apps/`: 各アプリ
- `supabase/schema.sql`: テーブル・RLS・アプリ用の関数（senni_*）
