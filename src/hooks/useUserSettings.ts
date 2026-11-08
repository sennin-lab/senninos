import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  cacheSettings, defaultSettings, loadSettings, readCachedSettings, saveSettings, type UserSettings,
} from '@/lib/userData';

export function useUserSettings(userId: string) {
  const [settings, setSettings] = useState<UserSettings>(() => readCachedSettings(userId) ?? defaultSettings);
  const [ready, setReady] = useState(false);
  const settingsRef = useRef(settings);

  useEffect(() => {
    let active = true;
    setReady(false);
    loadSettings(userId)
      .then(next => {
        if (!active) return;
        settingsRef.current = next;
        setSettings(next);
        cacheSettings(userId, next);
      })
      .catch(() => {
        if (active) toast.warning('設定をクラウドから読み込めませんでした');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    cacheSettings(userId, next);
    saveSettings(userId, patch).catch(() => toast.error('設定をクラウドに保存できませんでした'));
  }, [userId]);

  return { settings, ready, updateSettings };
}
