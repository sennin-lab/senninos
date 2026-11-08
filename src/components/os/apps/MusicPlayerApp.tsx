import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Disc3, ListMusic, Music2, Pause, Play, Plus, SkipBack, SkipForward, Volume2 } from 'lucide-react';

type Track = { id: string; name: string; url: string; file: File };

export default function MusicPlayerApp() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement>(null);
  const tracksRef = useRef<Track[]>([]);
  const current = tracks[active];

  useEffect(() => { const handler = (event: Event) => { const value = (event as CustomEvent<number>).detail; if (typeof value === 'number') setVolume(Math.max(0, Math.min(1, value))); }; window.addEventListener('senninos-volume-change', handler); return () => { window.removeEventListener('senninos-volume-change', handler); tracksRef.current.forEach(track => URL.revokeObjectURL(track.url)); }; }, []);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audio.src = current.url;
    audio.volume = volume;
    setProgress(0);
    if (playing) void audio.play().catch(() => setPlaying(false));
  }, [current?.id]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const added = Array.from(files).filter(file => file.type.startsWith('audio/')).map(file => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, url: URL.createObjectURL(file), file }));
    if (!added.length) return;
    tracksRef.current = [...tracksRef.current, ...added];
    setTracks(prev => [...prev, ...added]);
    if (!current) { setActive(0); setPlaying(false); }
  };
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { try { await audio.play(); setPlaying(true); } catch { setPlaying(false); } }
  };
  const move = (step: number) => {
    if (!tracks.length) return;
    setActive(index => (index + step + tracks.length) % tracks.length);
    setPlaying(true);
  };
  const format = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

  return <div className="h-full min-h-0 flex flex-col text-foreground bg-background">
    <audio ref={audioRef} onTimeUpdate={e => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)} onEnded={() => move(1)} />
    <div className="p-4 border-b border-border flex items-center justify-between"><div className="flex items-center gap-2"><Music2 size={18} className="text-primary"/><div><h2 className="font-semibold text-sm">音楽プレイヤー</h2><p className="text-[11px] text-muted-foreground">このデバイスの音楽ファイルを再生</p></div></div><label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs hover:opacity-90 transition"><Plus size={14}/>曲を追加<input className="hidden" type="file" accept="audio/*" multiple onChange={e => { addFiles(e.target.files); e.currentTarget.value = ''; }}/></label></div>
    <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-[1fr_210px]">
      <div className="flex flex-col items-center justify-center p-6 min-h-[220px]">
        <motion.div animate={{ rotate: playing ? 360 : 0 }} transition={{ duration: 12, repeat: playing ? Infinity : 0, ease: 'linear' }} className="w-40 h-40 rounded-full flex items-center justify-center shadow-xl" style={{background:'radial-gradient(circle at center, hsl(var(--window-bg)) 0 12%, hsl(var(--primary)) 13% 15%, #171923 16% 62%, #303443 63% 65%, #10131a 66%)'}}><Disc3 size={38} className="text-white/80"/></motion.div>
        <div className="mt-5 text-center max-w-full"><p className="font-semibold text-sm truncate">{current?.name ?? '曲を選択してください'}</p><p className="text-xs text-muted-foreground mt-1">{current ? 'ローカルライブラリ' : '音楽ファイルを追加して再生できます'}</p></div>
        <div className="w-full max-w-md mt-5"><input aria-label="再生位置" type="range" min={0} max={duration || 1} step="0.1" value={Math.min(progress, duration || 1)} onChange={e => { const value = Number(e.target.value); if (audioRef.current) audioRef.current.currentTime = value; setProgress(value); }} className="w-full accent-primary"/><div className="flex justify-between text-[10px] text-muted-foreground tabular-nums"><span>{format(progress)}</span><span>{format(duration)}</span></div></div>
        <div className="flex items-center gap-5 mt-4"><button aria-label="前の曲" onClick={() => move(-1)} disabled={!tracks.length} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><SkipBack/></button><motion.button whileTap={{scale:.88}} aria-label={playing ? '一時停止' : '再生'} onClick={toggle} disabled={!current} className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg disabled:opacity-40">{playing ? <Pause/> : <Play className="ml-0.5"/>}</motion.button><button aria-label="次の曲" onClick={() => move(1)} disabled={!tracks.length} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><SkipForward/></button></div>
        <div className="flex items-center gap-2 mt-5 w-40"><Volume2 size={15} className="text-muted-foreground"/><input aria-label="音量" type="range" min="0" max="1" step="0.01" value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-full accent-primary"/></div>
      </div>
      <aside className="border-t sm:border-t-0 sm:border-l border-border min-h-0 flex flex-col"><div className="p-3 flex items-center gap-2 text-xs font-semibold"><ListMusic size={15}/>再生リスト <span className="text-muted-foreground font-normal">{tracks.length}</span></div><div className="overflow-auto flex-1 px-2 pb-2"><AnimatePresence initial={false}>{tracks.map((track, index) => <motion.button key={track.id} layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,x:12}} onClick={() => {setActive(index);setPlaying(true);}} className={`w-full text-left p-2.5 rounded-lg flex items-center gap-2 text-xs mb-1 transition ${active === index ? 'bg-primary/15 text-primary' : 'hover:bg-secondary text-foreground'}`}><Music2 size={15}/><span className="truncate flex-1">{track.name}</span>{active === index && playing && <span className="text-[10px]">再生中</span>}</motion.button>)}</AnimatePresence>{!tracks.length && <p className="text-[11px] text-muted-foreground text-center py-8">まだ曲がありません</p>}</div></aside>
    </div>
  </div>;
}
