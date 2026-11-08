import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

type Mode = 'clock' | 'timer' | 'stopwatch';

const pad = (value: number) => String(value).padStart(2, '0');

const formatDuration = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
};

const formatStopwatch = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  return `${formatDuration(totalSeconds)}.${pad(Math.floor((ms % 1000) / 10))}`;
};

export default function ClockApp() {
  const [mode, setMode] = useState<Mode>('clock');
  const [now, setNow] = useState(() => new Date());

  const [timerMinutes, setTimerMinutes] = useState(5);
  const [timerLeft, setTimerLeft] = useState(300);
  const [timerRunning, setTimerRunning] = useState(false);

  const [swElapsed, setSwElapsed] = useState(0);
  const [swRunning, setSwRunning] = useState(false);
  const swRef = useRef({ base: 0, startedAt: 0 });

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setTimerLeft(prev => Math.max(prev - 1, 0)), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  useEffect(() => {
    if (timerRunning && timerLeft === 0) {
      setTimerRunning(false);
      toast.success('タイマーが終了しました');
    }
  }, [timerRunning, timerLeft]);

  useEffect(() => {
    if (!swRunning) return;
    const tick = () => setSwElapsed(swRef.current.base + Date.now() - swRef.current.startedAt);
    tick();
    const interval = setInterval(tick, 50);
    return () => clearInterval(interval);
  }, [swRunning]);

  const setTimer = (minutes: number) => {
    const safe = Math.min(Math.max(Math.round(minutes) || 0, 1), 180);
    setTimerMinutes(safe);
    setTimerLeft(safe * 60);
    setTimerRunning(false);
  };

  const toggleTimer = () => {
    if (timerLeft === 0) setTimerLeft(timerMinutes * 60);
    setTimerRunning(!timerRunning);
  };

  const resetTimer = () => {
    setTimerRunning(false);
    setTimerLeft(timerMinutes * 60);
  };

  const toggleStopwatch = () => {
    if (swRunning) {
      const total = swRef.current.base + Date.now() - swRef.current.startedAt;
      swRef.current.base = total;
      setSwElapsed(total);
      setSwRunning(false);
    } else {
      swRef.current.startedAt = Date.now();
      setSwRunning(true);
    }
  };

  const resetStopwatch = () => {
    swRef.current = { base: 0, startedAt: 0 };
    setSwElapsed(0);
    setSwRunning(false);
  };

  const tabs: { id: Mode; label: string }[] = [
    { id: 'clock', label: '時計' },
    { id: 'timer', label: 'タイマー' },
    { id: 'stopwatch', label: 'ストップウォッチ' },
  ];

  const buttonClass = 'px-4 py-2 rounded-md text-sm font-medium transition-colors';

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border text-xs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`flex-1 py-2.5 transition-colors ${mode === tab.id ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
        {mode === 'clock' && (
          <>
            <p className="text-5xl sm:text-6xl font-light tabular-nums text-foreground">
              {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
            </p>
            <p className="text-sm text-muted-foreground">
              {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </>
        )}

        {mode === 'timer' && (
          <>
            <p className="text-5xl sm:text-6xl font-light tabular-nums text-foreground">{formatDuration(timerLeft)}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <label htmlFor="timer-minutes">分</label>
              <input
                id="timer-minutes"
                type="number"
                min={1}
                max={180}
                value={timerMinutes}
                disabled={timerRunning}
                onChange={e => setTimer(Number(e.target.value))}
                className="h-8 w-20 px-2 rounded bg-secondary text-foreground text-center focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={toggleTimer} className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90`}>
                {timerRunning ? '一時停止' : '開始'}
              </button>
              <button type="button" onClick={resetTimer} className={`${buttonClass} bg-secondary text-foreground hover:bg-secondary/80`}>リセット</button>
            </div>
          </>
        )}

        {mode === 'stopwatch' && (
          <>
            <p className="text-4xl sm:text-5xl font-light tabular-nums text-foreground">{formatStopwatch(swElapsed)}</p>
            <div className="flex gap-2">
              <button type="button" onClick={toggleStopwatch} className={`${buttonClass} bg-primary text-primary-foreground hover:bg-primary/90`}>
                {swRunning ? 'ストップ' : '開始'}
              </button>
              <button type="button" onClick={resetStopwatch} className={`${buttonClass} bg-secondary text-foreground hover:bg-secondary/80`}>リセット</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
