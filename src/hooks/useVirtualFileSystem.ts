import { useCallback, useRef, useState } from 'react';
import {
  DEFAULT_CWD, listChildren, makeDirectoryNode, normalizePath, readFileContent,
  removeNode, resolveNode, today, writeFileNode, type FSNode,
} from '@/lib/fs';

interface UseVirtualFileSystemOptions {
  initialRoot: FSNode;
  /** 変更のたびに呼ばれます（クラウド同期に使用）。 */
  onChange: (tree: FSNode) => void;
}

export function useVirtualFileSystem({ initialRoot, onChange }: UseVirtualFileSystemOptions) {
  const [root, setRoot] = useState<FSNode>(initialRoot);
  const [cwd, setCwd] = useState(DEFAULT_CWD);
  const rootRef = useRef(root);

  const commit = useCallback((next: FSNode) => {
    rootRef.current = next;
    setRoot(next);
    onChange(next);
  }, [onChange]);

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
