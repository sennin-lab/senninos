import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { loadSettings, saveSettings, type UserSettings } from '@/lib/userData';

export function useUserSettings(userId: string) {
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings(userId));
  const settingsRef = useRef(settings);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    if (!saveSettings(userId, next)) {
      toast.error('設定を保存できませんでした。ブラウザの空き容量を確認してください');
    }
  }, [userId]);

  return { settings, ready: true, updateSettings };
}
