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

1. Supabase プロジェクトの **SQL Editor** で `supabase/schema.sql` を実行します。テーブル・RLS（行単位のアクセス制御）・新規ユーザー用のトリガーが作成されます。
2. **Authentication → Providers → Email** で **Confirm email をオフ** にします。ユーザー名だけで登録するため、メール確認が有効だと登録できません。
3. **Project Settings → API** の anon（publishable）キーを控えます。

ユーザー名は内部的に `<ユーザー名>@accounts.senninos.app` という形式のメールアドレスとして扱われます。実際にメールは送信されません。

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

- 変更は約 0.8 秒後にまとめて Supabase へ送信されます。送信前の変更は端末にも退避され、ページを閉じても次回ログイン時に送り直されます。
- 複数の端末で同時に編集すると、後に保存された内容が優先されます（last-write-wins）。
- 保存されたデータは行単位セキュリティ（RLS）により、そのアカウントの本人しか読み書きできません。

## ディレクトリ構成

- `src/lib/supabase.ts`: Supabase クライアント
- `src/lib/accountAuth.ts`: 登録・サインイン・セッション検証
- `src/lib/cloudData.ts`: アカウントデータの読み込みと同期（デバウンス・直列送信・退避）
- `src/lib/fileAssociations.ts`: 拡張子ごとに開くアプリの決定
- `src/lib/fs.ts`: 仮想ファイルシステム（純粋関数）
- `src/lib/formula.ts`: 安全な計算式・表計算エンジン（eval を使いません）
- `src/hooks/`: 認証・アカウントデータ・ファイルシステム・設定・ウィンドウ管理のフック
- `src/components/os/`: デスクトップ、タスクバー、ウィンドウ、アプリ登録（`appRegistry.ts`）
- `src/components/os/apps/`: 各アプリ
- `supabase/schema.sql`: テーブル・RLS・トリガー
