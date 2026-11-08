import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Operator = '+' | '-' | '×' | '÷';

const ERROR_TEXT = 'エラー';
const MAX_DIGITS = 15;

const calculate = (left: number, right: number, operator: Operator): number | null => {
  switch (operator) {
    case '+': return left + right;
    case '-': return left - right;
    case '×': return left * right;
    case '÷': return right === 0 ? null : left / right;
  }
};

const format = (value: number) => String(Number(value.toPrecision(12)));

const KEY_OPERATORS: Record<string, Operator> = { '+': '+', '-': '-', '*': '×', '/': '÷', 'x': '×' };

export default function CalculatorApp() {
  const [display, setDisplay] = useState('0');
  const [accumulator, setAccumulator] = useState<number | null>(null);
  const [pending, setPending] = useState<Operator | null>(null);
  const [freshInput, setFreshInput] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const fail = () => {
    setDisplay(ERROR_TEXT);
    setAccumulator(null);
    setPending(null);
    setFreshInput(true);
  };

  const inputDigit = (digit: string) => {
    if (display === ERROR_TEXT) setDisplay(digit);
    else if (freshInput) setDisplay(digit);
    else if (display === '0') setDisplay(digit);
    else if (display.replace(/[-.]/g, '').length < MAX_DIGITS) setDisplay(display + digit);
    setFreshInput(false);
  };

  const inputDecimal = () => {
    if (display === ERROR_TEXT || freshInput) {
      setDisplay('0.');
      setFreshInput(false);
    } else if (!display.includes('.')) {
      setDisplay(`${display}.`);
    }
  };

  const operate = (operator: Operator) => {
    if (display === ERROR_TEXT) return;
    const current = Number(display);
    let base = accumulator ?? current;
    if (pending && accumulator !== null && !freshInput) {
      const result = calculate(accumulator, current, pending);
      if (result === null) return fail();
      base = result;
      setDisplay(format(result));
    }
    setAccumulator(base);
    setPending(operator);
    setFreshInput(true);
  };

  const equals = () => {
    if (display === ERROR_TEXT || pending === null || accumulator === null) return;
    const result = calculate(accumulator, Number(display), pending);
    if (result === null) return fail();
    setDisplay(format(result));
    setAccumulator(null);
    setPending(null);
    setFreshInput(true);
  };

  const clear = () => {
    setDisplay('0');
    setAccumulator(null);
    setPending(null);
    setFreshInput(true);
  };

  const toggleSign = () => {
    if (display === ERROR_TEXT || display === '0') return;
    setDisplay(current => (current.startsWith('-') ? current.slice(1) : `-${current}`));
  };

  const percent = () => {
    if (display === ERROR_TEXT) return;
    setDisplay(format(Number(display) / 100));
    setFreshInput(true);
  };

  const backspace = () => {
    if (display === ERROR_TEXT || freshInput) return;
    setDisplay(current => (current.length > 1 ? current.slice(0, -1) : '0'));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (/^[0-9]$/.test(key)) inputDigit(key);
    else if (key === '.' || key === ',') inputDecimal();
    else if (key in KEY_OPERATORS) operate(KEY_OPERATORS[key]);
    else if (key === 'Enter' || key === '=') equals();
    else if (key === 'Backspace') backspace();
    else if (key === 'Escape' || key === 'Delete') clear();
    else return;
    event.preventDefault();
  };

  const digitClass = 'bg-secondary text-foreground hover:bg-secondary/80';
  const operatorClass = 'bg-primary text-primary-foreground hover:bg-primary/80';
  const functionClass = 'bg-muted text-foreground hover:bg-muted/80';
  const buttonBase = 'flex items-center justify-center h-12 rounded-lg text-base font-medium transition-all active:scale-95';

  return (
    <div ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown} className="flex flex-col h-full p-3 gap-2 outline-none">
      <div className="text-right text-3xl font-light px-2 py-4 text-foreground truncate" aria-live="polite">{display}</div>
      <div className="grid grid-cols-4 gap-1.5 flex-1">
        <button type="button" onClick={clear} className={`${buttonBase} ${functionClass} col-span-2`}>AC</button>
        <button type="button" onClick={toggleSign} className={`${buttonBase} ${functionClass}`}>±</button>
        <button type="button" onClick={() => operate('÷')} className={`${buttonBase} ${operatorClass}`}>÷</button>

        {['7', '8', '9'].map(n => <button type="button" key={n} onClick={() => inputDigit(n)} className={`${buttonBase} ${digitClass}`}>{n}</button>)}
        <button type="button" onClick={() => operate('×')} className={`${buttonBase} ${operatorClass}`}>×</button>

        {['4', '5', '6'].map(n => <button type="button" key={n} onClick={() => inputDigit(n)} className={`${buttonBase} ${digitClass}`}>{n}</button>)}
        <button type="button" onClick={() => operate('-')} className={`${buttonBase} ${operatorClass}`}>−</button>

        {['1', '2', '3'].map(n => <button type="button" key={n} onClick={() => inputDigit(n)} className={`${buttonBase} ${digitClass}`}>{n}</button>)}
        <button type="button" onClick={() => operate('+')} className={`${buttonBase} ${operatorClass}`}>+</button>

        <button type="button" onClick={() => inputDigit('0')} className={`${buttonBase} ${digitClass} col-span-2`}>0</button>
        <button type="button" onClick={inputDecimal} className={`${buttonBase} ${digitClass}`}>.</button>
        <button type="button" onClick={equals} className={`${buttonBase} ${operatorClass}`}>=</button>
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        <button type="button" onClick={percent} className="hover:text-foreground">％</button>
        <span>キーボード操作に対応</span>
      </div>
    </div>
  );
}
