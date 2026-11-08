# SenniNOS

ブラウザで動くWebデスクトップです。ユーザー名とパスワードでサインインし、ファイル管理・ターミナル・メモ帳・表計算・プレゼン・ペイントなどを使えます。外部のデータベースや認証サービスは使わず、データはすべてブラウザの `localStorage` に保存されます。環境変数の設定は不要です。

## 機能

- ユーザー名とパスワードによるアカウント（このブラウザ内に保存。パスワードはハッシュ化）
- ウィンドウ管理（ドラッグ・リサイズ・最小化・最大化）。マウス・タッチ両対応
- エクスプローラー（新規フォルダー・読み込み・ダウンロード・削除）
- ターミナル（help, ls, cd, mkdir, touch, rm, cat, tree, calc など）
- メモ帳 / SenniWord / SenniSheet / SenniSlide（ドキュメントフォルダーに保存・再読込）
- ストア（時計・カレンダー・ペイントをインストール可能）
- 壁紙などの設定はユーザーごとにブラウザへ保存

### 注意点

- アカウントとデータは**利用中のブラウザ内にのみ**保存されます。別の端末やブラウザではサインインできず、データも共有されません。
- ブラウザのサイトデータ（閲覧履歴の削除・シークレットウィンドウなど）を消去すると、アカウントとファイルも消えます。
- パスワードのハッシュ化はブラウザ内で行うため、サーバー側で管理する認証ほどの強度はありません。個人用・デモ用の用途を想定しています。
- 複数端末で使う場合は、サーバー側にデータを置く構成（バックエンドの追加）が必要です。

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

## Render へのデプロイ

`render.yaml` を含んでいるため、Blueprint として取り込めます。手動で作成する場合は次の設定にします。

- Service type: Static Site
- Build Command: `npm ci --include=dev && npm run build`
- Publish Directory: `dist`
- Rewrite Rule: Source `/*` → Destination `/index.html`（Action: Rewrite）
- Environment Variables: `NODE_VERSION=20`（ほかの環境変数は不要です）

ビルドツールは devDependencies にあるため、`--include=dev` を付けています。

## ディレクトリ構成

- `src/lib/localAuth.ts`: ブラウザ内のアカウント登録・サインイン（PBKDF2 でハッシュ化）
- `src/lib/userData.ts`: ファイルシステムと設定の localStorage への保存・読み込み
- `src/lib/fs.ts`: 仮想ファイルシステム（純粋関数）
- `src/lib/formula.ts`: 安全な計算式・表計算エンジン（eval を使いません）
- `src/hooks/`: 認証・ファイルシステム・設定・ウィンドウ管理のフック
- `src/components/AppErrorBoundary.tsx`: 描画エラー時に白画面ではなくエラー内容を表示
- `src/components/os/`: デスクトップ、タスクバー、ウィンドウ、アプリ登録（`appRegistry.ts`）
- `src/components/os/apps/`: 各アプリ
