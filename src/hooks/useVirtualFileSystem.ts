import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_CWD, createDefaultFS, listChildren, makeDirectoryNode, normalizePath, readFileContent,
  removeNode, resolveNode, today, writeFileNode, type FSNode,
} from '@/lib/fs';
import { loadFileSystem, saveFileSystem } from '@/lib/userData';

export function useVirtualFileSystem(userId: string) {
  const [root, setRoot] = useState<FSNode>(() => loadFileSystem(userId) ?? createDefaultFS(today()));
  const [cwd, setCwd] = useState(DEFAULT_CWD);
  const rootRef = useRef(root);

  const commit = useCallback((next: FSNode) => {
    rootRef.current = next;
    setRoot(next);
    if (!saveFileSystem(userId, next)) {
      toast.error('ファイルを保存できません。ブラウザの空き容量を確認してください');
    }
  }, [userId]);

  const listDir = useCallback(
    (path?: string): FSNode[] => listChildren(rootRef.current, normalizePath(cwd, path ?? '.')),
    [cwd],
  );

  const readFile = useCallback(
    (path: string): string | null => readFileContent(rootRef.current, normalizePath(cwd, path)),
    [cwd],
  );

  const writeFile = useCallback(
    (path: string, content: string) => commit(writeFileNode(rootRef.current, normalizePath(cwd, path), content, today())),
    [cwd, commit],
  );

  const mkdir = useCallback(
    (path: string) => commit(makeDirectoryNode(rootRef.current, normalizePath(cwd, path), today())),
    [cwd, commit],
  );

  const rm = useCallback(
    (path: string) => commit(removeNode(rootRef.current, normalizePath(cwd, path), today())),
    [cwd, commit],
  );

  const cd = useCallback((path: string): string | null => {
    const full = normalizePath(cwd, path);
    const node = resolveNode(rootRef.current, full);
    if (!node || node.type !== 'folder') return null;
    setCwd(full);
    return full;
  }, [cwd]);

  const resolve = useCallback((path: string) => {
    const fullPath = normalizePath(cwd, path);
    return { node: resolveNode(rootRef.current, fullPath), fullPath };
  }, [cwd]);

  const exists = useCallback(
    (path: string) => resolveNode(rootRef.current, normalizePath(cwd, path)) !== null,
    [cwd],
  );

  return {
    root,
    cwd,
    setCwd,
    // 保存はすべて同期的に行うため、読み込み待ちの状態はありません
    ready: true,
    listDir,
    readFile,
    writeFile,
    mkdir,
    rm,
    cd,
    resolve,
    exists,
    normalizePath: (path: string) => normalizePath(cwd, path),
  };
}

export type VFS = ReturnType<typeof useVirtualFileSystem>;
