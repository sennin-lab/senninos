import { useCallback, useRef, useState } from 'react';
import type { UserSettings } from '@/lib/userData';

interface UseUserSettingsOptions {
  initialSettings: UserSettings;
  onChange: (settings: UserSettings) => void;
}

/** 設定の状態を管理し、変更を onChange（クラウド同期）へ渡します。 */
export function useUserSettings({ initialSettings, onChange }: UseUserSettingsOptions) {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const settingsRef = useRef(settings);

  const updateSettings = useCallback((patch: Partial<UserSettings>) => {
    const next = { ...settingsRef.current, ...patch };
    settingsRef.current = next;
    setSettings(next);
    onChange(next);
  }, [onChange]);

  return { settings, updateSettings };
}
