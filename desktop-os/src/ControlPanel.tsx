import { Sun, Volume2, VolumeX, Monitor, RotateCcw } from 'lucide-react';
import type { DesktopSettings } from './types';

interface ControlPanelProps {
  settings: DesktopSettings;
  onChange: (s: DesktopSettings) => void;
}

export function ControlPanel({ settings, onChange }: ControlPanelProps) {
  const setBrightness = (v: number) => onChange({ ...settings, brightness: v });
  const setVolume = (v: number) => onChange({ ...settings, volume: v, volumeMuted: false });
  const toggleMute = () => onChange({ ...settings, volumeMuted: !settings.volumeMuted });

  return (
    <div className="control-panel">
      <div className="cp-header">
        <h2>コントロールパネル</h2>
        <p>画面の明るさと音量を調整できます</p>
      </div>

      {/* Brightness */}
      <div className="cp-section">
        <div className="cp-section-title">
          <Sun size={18} /> 画面の明るさ
        </div>
        <div className="cp-control">
          <div className="cp-control-label">
            <span>明るさレベル</span>
            <span className="cp-control-value">{settings.brightness}%</span>
          </div>
          <input
            type="range"
            className="cp-slider brightness"
            min={20}
            max={100}
            value={settings.brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
          />
          <div className="cp-preset-row">
            <button className="cp-preset-btn" onClick={() => setBrightness(30)}>暗い (30%)</button>
            <button className="cp-preset-btn" onClick={() => setBrightness(60)}>標準 (60%)</button>
            <button className="cp-preset-btn" onClick={() => setBrightness(80)}>明るい (80%)</button>
            <button className="cp-preset-btn" onClick={() => setBrightness(100)}>最大 (100%)</button>
          </div>
        </div>
      </div>

      {/* Volume */}
      <div className="cp-section">
        <div className="cp-section-title">
          <Volume2 size={18} /> 音量
        </div>
        <div className="cp-control">
          <div className="cp-control-label">
            <span>音量レベル</span>
            <span className="cp-control-value">{settings.volumeMuted ? 'ミュート' : `${settings.volume}%`}</span>
          </div>
          <div className="cp-volume-row">
            <button className="cp-icon-btn" onClick={toggleMute} title="ミュート切替">
              {settings.volumeMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <input
              type="range"
              className="cp-slider volume"
              min={0}
              max={100}
              value={settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
            />
          </div>
          <div className="cp-preset-row">
            <button className="cp-preset-btn" onClick={() => setVolume(20)}>小 (20%)</button>
            <button className="cp-preset-btn" onClick={() => setVolume(50)}>中 (50%)</button>
            <button className="cp-preset-btn" onClick={() => setVolume(80)}>大 (80%)</button>
            <button className="cp-preset-btn" onClick={() => toggleMute()}>ミュート</button>
          </div>
        </div>
      </div>

      {/* Quick info */}
      <div className="cp-section">
        <div className="cp-section-title">
          <Monitor size={18} /> システム情報
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--neutral-600)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sun size={15} /> 明るさ: {settings.brightness}%
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 size={15} /> 音量: {settings.volumeMuted ? 'ミュート' : `${settings.volume}%`}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <button
            className="toolbar-btn"
            style={{ background: 'var(--neutral-100)', border: '1px solid var(--neutral-200)', display: 'flex', gap: 6, alignItems: 'center' }}
            onClick={() => onChange({ brightness: 80, volume: 50, volumeMuted: false })}
          >
            <RotateCcw size={13} /> リセット
          </button>
        </div>
      </div>
    </div>
  );
}
