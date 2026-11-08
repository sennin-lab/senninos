import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  DEFAULT_CWD, createDefaultFS, listChildren, makeDirectoryNode, normalizePath, readFileContent,
  removeNode, resolveNode, today, writeFileNode, type FSNode,
} from '@/lib/fs';
import {
  cacheFileSystem, clearFileSystemDirty, isFileSystemDirty, loadFileSystem, markFileSystemDirty,
  readCachedFileSystem, saveFileSystem,
} from '@/lib/userData';

const SAVE_DELAY = 600;

interface PendingSave {
  userId: string;
  tree: FSNode;
}

export function useVirtualFileSystem(userId: string) {
  const [root, setRoot] = useState<FSNode>(() => readCachedFileSystem(userId) ?? createDefaultFS());
  const [cwd, setCwd] = useState(DEFAULT_CWD);
  const [ready, setReady] = useState(false);
  const rootRef = useRef(root);
  const pendingRef = useRef<PendingSave | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((uid: string, tree: FSNode) => {
    saveFileSystem(uid, tree)
      .then(() => clearFileSystemDirty(uid))
      .catch(() => toast.error('クラウドへの保存に失敗しました。ブラウザには保存済みです'));
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) push(pending.userId, pending.tree);
  }, [push]);

  const commit = useCallback((next: FSNode) => {
    rootRef.current = next;
    setRoot(next);
    cacheFileSystem(userId, next);
    markFileSystemDirty(userId);
    pendingRef.current = { userId, tree: next };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DELAY);
  }, [userId, flush]);

  useEffect(() => {
    let active = true;
    setReady(false);
    const cached = readCachedFileSystem(userId);

    const apply = (tree: FSNode, shouldPush: boolean) => {
      if (!active) return;
      rootRef.current = tree;
      setRoot(tree);
      setCwd(DEFAULT_CWD);
      cacheFileSystem(userId, tree);
      setReady(true);
      if (shouldPush) {
        markFileSystemDirty(userId);
        push(userId, tree);
      }
    };

    if (cached && isFileSystemDirty(userId)) {
      apply(cached, true);
    } else {
      loadFileSystem(userId)
        .then(remote => {
          if (remote) apply(remote, false);
          else apply(cached ?? createDefaultFS(today()), true);
        })
        .catch(() => {
          toast.warning('クラウドに接続できないため、このブラウザのデータを表示しています');
          apply(cached ?? createDefaultFS(today()), false);
        });
    }

    return () => {
      active = false;
    };
  }, [userId, push]);

  useEffect(() => () => flush(), [flush]);

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
    ready,
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
