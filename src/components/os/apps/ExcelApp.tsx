import { useRef, useState, type KeyboardEvent } from 'react';
import { toast } from 'sonner';
import DocumentBar from '@/components/os/apps/DocumentBar';
import type { VFS } from '@/hooks/useVirtualFileSystem';
import { cellReference, columnLabel, evaluateCell, parseCellReference, type Cells } from '@/lib/formula';

const COLS = 10;
const ROWS = 20;
const COLUMNS = Array.from({ length: COLS }, (_, index) => columnLabel(index));
const ROW_NUMBERS = Array.from({ length: ROWS }, (_, index) => index + 1);

function parseSheet(content: string): Cells | null {
  try {
    const parsed: unknown = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === 'string')) as Cells;
  } catch {
    return null;
  }
}

export default function ExcelApp({ vfs }: { vfs: VFS }) {
  const [cells, setCells] = useState<Cells>({});
  const [selected, setSelected] = useState('A1');
  const [draft, setDraft] = useState('');
  const cellsRef = useRef<Cells>({});

  const replaceCells = (next: Cells) => {
    cellsRef.current = next;
    setCells(next);
  };

  const commit = (id: string, value: string) => {
    if ((cellsRef.current[id] ?? '') === value) return;
    replaceCells({ ...cellsRef.current, [id]: value });
  };

  const select = (id: string) => {
    setSelected(id);
    setDraft(cellsRef.current[id] ?? '');
  };

  const moveSelection = (column: number, row: number) => {
    const next = cellReference(Math.min(Math.max(column, 0), COLS - 1), Math.min(Math.max(row, 1), ROWS));
    select(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { column, row } = parseCellReference(selected);
    if (event.key === 'Enter') {
      event.preventDefault();
      commit(selected, draft);
      moveSelection(column, row + 1);
    } else if (event.key === 'Tab') {
      event.preventDefault();
      commit(selected, draft);
      moveSelection(column + 1, row);
    } else if (event.key === 'Escape') {
      setDraft(cellsRef.current[selected] ?? '');
    }
  };

  const loadSheet = (content: string) => {
    const parsed = parseSheet(content);
    if (!parsed) {
      toast.error('表計算ファイルではありません');
      return;
    }
    replaceCells(parsed);
    select('A1');
  };

  return (
    <div className="flex flex-col h-full bg-window-bg">
      <DocumentBar
        vfs={vfs}
        extension=".sheet.json"
        defaultName="無題の表"
        getContent={() => JSON.stringify(cellsRef.current)}
        onLoad={loadSheet}
        onNew={() => { replaceCells({}); select('A1'); }}
      />

      <div className="flex items-center gap-2 px-2 py-1 border-b border-border">
        <span className="text-xs font-mono text-primary w-12 text-center bg-secondary rounded px-1 py-0.5">{selected}</span>
        <span className="text-muted-foreground text-xs">fx</span>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit(selected, draft)}
          onKeyDown={handleKeyDown}
          aria-label="数式バー"
          placeholder="値または =SUM(A1:A5) のような数式"
          className="flex-1 h-6 px-2 text-xs bg-secondary text-foreground rounded focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-10 h-6 bg-secondary border border-border text-muted-foreground font-normal sticky top-0 z-10" />
              {COLUMNS.map(col => (
                <th key={col} className="min-w-[90px] h-6 bg-secondary border border-border text-muted-foreground font-medium sticky top-0 z-10">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_NUMBERS.map(row => (
              <tr key={row}>
                <td className="bg-secondary border border-border text-center text-muted-foreground font-medium sticky left-0 z-[5] w-10">
                  {row}
                </td>
                {COLUMNS.map(col => {
                  const id = `${col}${row}`;
                  const isSelected = selected === id;
                  return (
                    <td
                      key={id}
                      onClick={() => select(id)}
                      className={`border border-border cursor-cell px-1.5 py-0.5 text-foreground truncate max-w-[160px] ${
                        isSelected ? 'ring-2 ring-primary ring-inset bg-primary/5' : 'hover:bg-secondary/50'
                      }`}
                    >
                      {evaluateCell(cells, id)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-3 py-1 border-t border-border text-[10px] text-muted-foreground">
        <span>Sheet1</span>
        <span>{selected}: {cells[selected] ? evaluateCell(cells, selected) : '空'}</span>
      </div>
    </div>
  );
}
