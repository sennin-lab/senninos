// エクスプローラーでファイルを開いたときに、どのアプリで開くかを決めます（Windows の関連付けに近い動き）。
export interface FileOpener {
  appId: 'notepad' | 'codeeditor' | 'imageviewer' | 'documentviewer';
  label: string;
  size: [number, number];
}

const TEXT_EXTENSIONS = new Set(['txt', 'text', 'log', 'csv']);
const CODE_EXTENSIONS = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'html', 'htm', 'css', 'scss', 'json', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
  'cs', 'php', 'rb', 'go', 'rs', 'sh', 'yml', 'yaml', 'xml', 'md', 'sql', 'toml', 'ini',
]);
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'svg', 'bmp', 'webp', 'avif']);

/** 拡張子を小文字で返します。隠しファイル（.gitignore など）や拡張子なしは空文字。 */
export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 && dot < fileName.length - 1 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/**
 * 開くアプリを返します。
 * - .txt などのテキスト・拡張子なし → メモ帳
 * - コードの拡張子 → コードエディタ
 * - 画像・Senni Document → それぞれのビューアー
 * - それ以外（音声・動画・Office 形式など）→ null（開けない）
 */
export function resolveFileOpener(fileName: string): FileOpener | null {
  const ext = getExtension(fileName);
  if (IMAGE_EXTENSIONS.has(ext)) return { appId: 'imageviewer', label: '画像ビューアー', size: [850, 620] };
  if (ext === 'sdoc') return { appId: 'documentviewer', label: 'Senni Document', size: [820, 680] };
  if (CODE_EXTENSIONS.has(ext)) return { appId: 'codeeditor', label: 'コードエディタ', size: [900, 650] };
  if (ext === '' || TEXT_EXTENSIONS.has(ext)) return { appId: 'notepad', label: 'メモ帳', size: [650, 480] };
  return null;
}
