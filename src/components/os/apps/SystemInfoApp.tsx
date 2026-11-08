import { useEffect, useState } from 'react';
import { Cpu, HardDrive, Monitor, Wifi, Clock, Zap } from 'lucide-react';
import { formatSize } from '@/lib/fs';

type MemoryInfo = { usedJSHeapSize: number; jsHeapSizeLimit: number };

export default function SystemInfoApp() {
  const [uptime, setUptime] = useState(() => Math.round(performance.now() / 1000));
  const [storage, setStorage] = useState<{ usage: number; quota: number } | null>(null);
  const memory = (performance as Performance & { memory?: MemoryInfo }).memory;

  useEffect(() => {
    const interval = setInterval(() => setUptime(Math.round(performance.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    navigator.storage?.estimate?.()
      .then(estimate => setStorage({ usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 }))
      .catch(() => setStorage(null));
  }, []);

  const formatUptime = (s: number) => `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;

  const meters = [
    memory && { label: 'メモリ（JS ヒープ）', value: memory.usedJSHeapSize, max: memory.jsHeapSizeLimit },
    storage && storage.quota > 0 && { label: 'ストレージ', value: storage.usage, max: storage.quota },
  ].filter(Boolean) as { label: string; value: number; max: number }[];

  const info = [
    { icon: <Monitor size={16} />, label: 'OS', value: 'SenniNOS 1.0.0' },
    { icon: <Cpu size={16} />, label: 'CPU', value: `Virtual Core × ${navigator.hardwareConcurrency || 4}` },
    { icon: <HardDrive size={16} />, label: '画面', value: `${window.innerWidth} × ${window.innerHeight}` },
    { icon: <Wifi size={16} />, label: 'ネットワーク', value: navigator.onLine ? (connection?.effectiveType?.toUpperCase() ?? '接続中') : 'オフライン' },
    { icon: <Clock size={16} />, label: '稼働時間', value: formatUptime(uptime) },
    { icon: <Zap size={16} />, label: 'カーネル', value: 'WebKernel' },
  ];

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">システム情報</h2>
      <div className="space-y-2">
        {info.map(item => (
          <div key={item.label} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary">
            <span className="text-primary">{item.icon}</span>
            <span className="text-sm text-muted-foreground w-24 shrink-0">{item.label}</span>
            <span className="text-sm text-foreground truncate">{item.value}</span>
          </div>
        ))}
      </div>

      {meters.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-secondary space-y-3">
          <h3 className="text-sm font-medium text-foreground">使用状況</h3>
          {meters.map(meter => {
            const percent = Math.min(100, Math.round((meter.value / meter.max) * 100));
            return (
              <div key={meter.label} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{meter.label}</span>
                  <span>{formatSize(meter.value)} / {formatSize(meter.max)}（{percent}%）</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
