import { Check, Image, User, Monitor, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SenniLogo from '../SenniLogo';
import { wallpapers } from './appearance';

interface SettingsAppProps {
  wallpaperId: string;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
  onWallpaperChange: (id: string) => void;
  userName?: string;
  onSignOut: () => void;
}

export default function SettingsApp({ wallpaperId, theme, onThemeChange, onWallpaperChange, userName, onSignOut }: SettingsAppProps) {
  return (
    <div className="p-5 space-y-6 text-foreground">
      <div className="flex items-center gap-3"><SenniLogo className="w-12 h-12" /><div><h2 className="text-lg font-semibold">SenniNOS</h2><p className="text-xs text-muted-foreground">パーソナル設定</p></div></div>
      <section className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-medium"><Sun size={16} />外観</h3>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={theme === 'light' ? 'default' : 'secondary'} onClick={() => onThemeChange('light')} className="justify-start gap-2"><Sun size={16} />ライトモード {theme === 'light' && <Check size={15} className="ml-auto" />}</Button>
          <Button variant={theme === 'dark' ? 'default' : 'secondary'} onClick={() => onThemeChange('dark')} className="justify-start gap-2"><Moon size={16} />ダークモード {theme === 'dark' && <Check size={15} className="ml-auto" />}</Button>
        </div>
      </section>
      <section className="space-y-3"><h3 className="flex items-center gap-2 text-sm font-medium"><Image size={16} />壁紙</h3>
        <div className="grid grid-cols-3 gap-2">{wallpapers.map(item => <Button key={item.id} variant="ghost" onClick={() => onWallpaperChange(item.id)} aria-pressed={wallpaperId === item.id} className="h-auto flex-col p-1 gap-2 min-w-0"><div className="relative w-full aspect-video"><img src={item.src} alt={item.name} className="w-full h-full object-cover rounded-md" width={180} height={100} />{wallpaperId === item.id && <Check size={16} className="absolute right-1 bottom-1 bg-primary text-primary-foreground rounded-sm" />}</div><span className="text-[10px]">{item.name}</span></Button>)}</div>
      </section>
      <section className="border-t border-border pt-4 space-y-3"><h3 className="flex items-center gap-2 text-sm font-medium"><User size={16} />アカウント</h3><div className="flex items-center justify-between gap-3"><span className="text-sm truncate">{userName}</span><Button variant="secondary" size="sm" onClick={onSignOut}>サインアウト</Button></div></section>
      <section className="border-t border-border pt-4 space-y-2"><h3 className="flex items-center gap-2 text-sm font-medium"><Monitor size={16} />デバイス</h3><p className="text-xs text-muted-foreground">画面：{window.innerWidth} × {window.innerHeight}</p><p className="text-xs text-muted-foreground">言語：{navigator.language}</p><p className="text-xs text-muted-foreground">SenniNOS 1.0.0</p></section>
    </div>
  );
}
