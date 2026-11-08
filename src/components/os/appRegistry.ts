import type { LucideIcon } from 'lucide-react';
import {
  Calculator, CalendarDays, Clock, FileSpreadsheet, FileText, FolderOpen, Globe, Monitor, Palette,
  Presentation, Settings, Store, Terminal, Music,
} from 'lucide-react';

export interface AppDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  size: [number, number];
  placement: 'pinned' | 'builtin' | 'store';
}

export const appDefinitions: AppDefinition[] = [
  { id: 'terminal', label: 'ターミナル', icon: Terminal, size: [750, 480], placement: 'pinned' },
  { id: 'notepad', label: 'メモ帳', icon: FileText, size: [650, 480], placement: 'pinned' },
  { id: 'files', label: 'エクスプローラー', icon: FolderOpen, size: [850, 520], placement: 'pinned' },
  { id: 'calculator', label: '電卓', icon: Calculator, size: [320, 500], placement: 'pinned' },
  { id: 'browser', label: 'ブラウザ', icon: Globe, size: [900, 600], placement: 'pinned' },
  { id: 'system', label: 'システム情報', icon: Monitor, size: [550, 540], placement: 'pinned' },
  { id: 'settings', label: '設定', icon: Settings, size: [520, 480], placement: 'pinned' },
  { id: 'appstore', label: 'ストア', icon: Store, size: [780, 520], placement: 'pinned' },
  { id: 'word', label: 'SenniWord', icon: FileText, size: [850, 620], placement: 'builtin' },
  { id: 'excel', label: 'SenniSheet', icon: FileSpreadsheet, size: [900, 580], placement: 'builtin' },
  { id: 'powerpoint', label: 'SenniSlide', icon: Presentation, size: [900, 600], placement: 'builtin' },
  { id: 'clock', label: '時計', icon: Clock, size: [360, 480], placement: 'store' },
  { id: 'calendar', label: 'カレンダー', icon: CalendarDays, size: [420, 470], placement: 'store' },
  { id: 'paint', label: 'ペイント', icon: Palette, size: [800, 560], placement: 'store' },
  { id: 'music', label: '音楽プレイヤー', icon: Music, size: [620, 520], placement: 'pinned' },
];

export const getAppDefinition = (appId: string): AppDefinition | undefined =>
  appDefinitions.find(app => app.id === appId);
