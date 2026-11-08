export class FormulaError extends Error {}

export type Cells = Record<string, string>;

type Token = { kind: 'number'; value: number } | { kind: 'operator' | 'paren'; value: string };

const OPERATORS = '+-*/^';
const CELL_REFERENCE = /^([A-Z]{1,2})(\d{1,3})$/;
const AGGREGATE = /(SUM|AVERAGE|MIN|MAX)\(([^()]*)\)/g;
const REFERENCE = /\b([A-Z]{1,2}\d{1,3})\b/g;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) {
      index += 1;
    } else if (/[0-9.]/.test(char)) {
      let end = index;
      while (end < input.length && /[0-9.]/.test(input[end])) end += 1;
      const value = Number(input.slice(index, end));
      if (!Number.isFinite(value)) throw new FormulaError('#VALUE!');
      tokens.push({ kind: 'number', value });
      index = end;
    } else if (OPERATORS.includes(char)) {
      tokens.push({ kind: 'operator', value: char });
      index += 1;
    } else if (char === '(' || char === ')') {
      tokens.push({ kind: 'paren', value: char });
      index += 1;
    } else {
      throw new FormulaError('#VALUE!');
    }
  }
  return tokens;
}

function parse(tokens: Token[]): number {
  let position = 0;
  const peek = (): Token | undefined => tokens[position];
  const consume = (): Token => tokens[position++];
  const isOperator = (...values: string[]) => {
    const token = peek();
    return token?.kind === 'operator' && values.includes(token.value);
  };
  const isParen = (value: string) => {
    const token = peek();
    return token?.kind === 'paren' && token.value === value;
  };

  const parsePrimary = (): number => {
    const token = peek();
    if (token?.kind === 'number') {
      consume();
      return token.value;
    }
    if (isParen('(')) {
      consume();
      const value = parseExpression();
      if (!isParen(')')) throw new FormulaError('#VALUE!');
      consume();
      return value;
    }
    throw new FormulaError('#VALUE!');
  };

  const parseUnary = (): number => {
    if (isOperator('-')) {
      consume();
      return -parseUnary();
    }
    if (isOperator('+')) {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  };

  const parsePower = (): number => {
    const base = parseUnary();
    if (isOperator('^')) {
      consume();
      return Math.pow(base, parsePower());
    }
    return base;
  };

  const parseTerm = (): number => {
    let value = parsePower();
    while (isOperator('*', '/')) {
      const operator = consume().value;
      const right = parsePower();
      if (operator === '/') {
        if (right === 0) throw new FormulaError('#DIV/0!');
        value /= right;
      } else {
        value *= right;
      }
    }
    return value;
  };

  const parseExpression = (): number => {
    let value = parseTerm();
    while (isOperator('+', '-')) {
      const operator = consume().value;
      const right = parseTerm();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  const result = parseExpression();
  if (position !== tokens.length) throw new FormulaError('#VALUE!');
  if (!Number.isFinite(result)) throw new FormulaError('#NUM!');
  return result;
}

export function evaluateExpression(expression: string): number {
  return parse(tokenize(expression));
}

export function columnLabel(index: number): string {
  let number = index + 1;
  let label = '';
  while (number > 0) {
    label = String.fromCharCode(65 + ((number - 1) % 26)) + label;
    number = Math.floor((number - 1) / 26);
  }
  return label;
}

export function parseCellReference(reference: string): { column: number; row: number } {
  const match = CELL_REFERENCE.exec(reference.toUpperCase());
  if (!match) throw new FormulaError('#REF!');
  const column = [...match[1]].reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0) - 1;
  return { column, row: Number(match[2]) };
}

export function cellReference(column: number, row: number): string {
  return `${columnLabel(column)}${row}`;
}

function expandRange(range: string): string[] {
  const [start, end] = range.split(':');
  const from = parseCellReference(start ?? '');
  const to = parseCellReference(end ?? '');
  const ids: string[] = [];
  for (let row = Math.min(from.row, to.row); row <= Math.max(from.row, to.row); row += 1) {
    for (let column = Math.min(from.column, to.column); column <= Math.max(from.column, to.column); column += 1) {
      ids.push(cellReference(column, row));
    }
  }
  return ids;
}

function numericValue(cells: Cells, id: string, stack: string[]): number {
  if (stack.includes(id)) throw new FormulaError('#CYCLE!');
  const raw = (cells[id] ?? '').trim();
  if (raw === '') return 0;
  if (raw.startsWith('=')) return evaluateFormula(cells, raw.slice(1), [...stack, id]);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new FormulaError('#VALUE!');
  return value;
}

function rangeValues(cells: Cells, ids: string[], stack: string[]): number[] {
  return ids.flatMap(id => {
    const raw = (cells[id] ?? '').trim();
    if (raw === '') return [];
    if (raw.startsWith('=')) return [numericValue(cells, id, stack)];
    const value = Number(raw);
    return Number.isFinite(value) ? [value] : [];
  });
}

function literal(value: number): string {
  if (Number.isInteger(value) && Math.abs(value) < 1e15) return String(value);
  return value.toFixed(12);
}

function aggregate(name: string, values: number[]): number {
  if (name === 'SUM') return values.reduce((total, value) => total + value, 0);
  if (name === 'AVERAGE') {
    if (values.length === 0) throw new FormulaError('#DIV/0!');
    return values.reduce((total, value) => total + value, 0) / values.length;
  }
  if (values.length === 0) return 0;
  return name === 'MIN' ? Math.min(...values) : Math.max(...values);
}

function replaceReferences(cells: Cells, expression: string, stack: string[]): string {
  return expression.replace(REFERENCE, reference => literal(numericValue(cells, reference, stack)));
}

function evaluateFormula(cells: Cells, body: string, stack: string[]): number {
  const withAggregates = body.toUpperCase().replace(AGGREGATE, (_match, name: string, args: string) => {
    const values = args.split(',').flatMap(argument => {
      const trimmed = argument.trim();
      if (trimmed.includes(':')) return rangeValues(cells, expandRange(trimmed), stack);
      return [evaluateExpression(replaceReferences(cells, trimmed, stack))];
    });
    return literal(aggregate(name, values));
  });
  return evaluateExpression(replaceReferences(cells, withAggregates, stack));
}

function formatResult(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(12)));
}

export function evaluateCell(cells: Cells, id: string): string {
  const raw = cells[id] ?? '';
  if (!raw.trim().startsWith('=')) return raw;
  try {
    return formatResult(numericValue(cells, id, []));
  } catch (error) {
    return error instanceof FormulaError ? error.message : '#VALUE!';
  }
}
