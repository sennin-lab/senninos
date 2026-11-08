export type AppId = 'notepad' | 'codeeditor' | 'controlpanel';

export interface AppWindow {
  id: string;
  appId: AppId;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  prevRect?: { x: number; y: number; width: number; height: number };
}

export interface DesktopSettings {
  brightness: number;
  volume: number;
  volumeMuted: boolean;
}
