import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function buildMonthCells(year: number, month: number): (Date | null)[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export default function CalendarApp() {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const cells = buildMonthCells(view.getFullYear(), view.getMonth());

  const shift = (months: number) => setView(prev => new Date(prev.getFullYear(), prev.getMonth() + months, 1));

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="前の月" onClick={() => shift(-1)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><ChevronLeft size={16} /></button>
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-foreground">{view.getFullYear()}年 {view.getMonth() + 1}月</h2>
          <button type="button" onClick={() => setView(new Date(today.getFullYear(), today.getMonth(), 1))} className="text-[10px] px-2 py-0.5 rounded bg-secondary text-foreground hover:bg-secondary/80">今日</button>
        </div>
        <button type="button" aria-label="次の月" onClick={() => shift(1)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><ChevronRight size={16} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((day, index) => (
          <div key={day} className={`py-1 ${index === 0 ? 'text-destructive' : index === 6 ? 'text-primary' : 'text-muted-foreground'}`}>{day}</div>
        ))}
        {cells.map((cell, index) => {
          if (!cell) return <div key={`blank-${index}`} />;
          const isToday = sameDay(cell, today);
          const weekday = cell.getDay();
          return (
            <div
              key={cell.getDate()}
              className={`aspect-square flex items-center justify-center rounded-md text-sm tabular-nums ${
                isToday ? 'bg-primary text-primary-foreground font-semibold' : weekday === 0 ? 'text-destructive/90' : weekday === 6 ? 'text-primary/90' : 'text-foreground'
              } hover:bg-secondary/60`}
            >
              {cell.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
