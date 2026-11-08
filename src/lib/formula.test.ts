import { describe, expect, it } from 'vitest';
import { cellReference, columnLabel, evaluateCell, evaluateExpression, parseCellReference } from './formula';

describe('evaluateExpression', () => {
  it('respects operator precedence and parentheses', () => {
    expect(evaluateExpression('2+3*4')).toBe(14);
    expect(evaluateExpression('(2+3)*4')).toBe(20);
    expect(evaluateExpression('10/4')).toBe(2.5);
  });
  it('supports right-associative powers and unary minus', () => {
    expect(evaluateExpression('2^3^2')).toBe(512);
    expect(evaluateExpression('-3+5')).toBe(2);
    expect(evaluateExpression('2*-4')).toBe(-8);
  });
  it('rejects division by zero and malformed input', () => {
    expect(() => evaluateExpression('1/0')).toThrow('#DIV/0!');
    expect(() => evaluateExpression('2+')).toThrow('#VALUE!');
    expect(() => evaluateExpression('2 3')).toThrow('#VALUE!');
    expect(() => evaluateExpression('alert(1)')).toThrow('#VALUE!');
    expect(() => evaluateExpression('')).toThrow('#VALUE!');
  });
});

describe('spreadsheet cells', () => {
  it('computes references and SUM over a range', () => {
    const cells = { A1: '2', A2: '3', A3: '=A1+A2*2', B1: '=SUM(A1:A3)' };
    expect(evaluateCell(cells, 'A3')).toBe('8');
    expect(evaluateCell(cells, 'B1')).toBe('13');
  });
  it('supports AVERAGE, MIN and MAX', () => {
    const cells = { A1: '2', A2: '3', B1: '=AVERAGE(A1:A2)', B2: '=MIN(A1:A2)', B3: '=MAX(A1:A2, 10)' };
    expect(evaluateCell(cells, 'B1')).toBe('2.5');
    expect(evaluateCell(cells, 'B2')).toBe('2');
    expect(evaluateCell(cells, 'B3')).toBe('10');
  });
  it('ignores blank and text cells inside ranges', () => {
    const cells = { A1: '4', A2: '', A3: 'memo', A4: '6', B1: '=SUM(A1:A4)' };
    expect(evaluateCell(cells, 'B1')).toBe('10');
  });
  it('treats blank references as zero', () => {
    expect(evaluateCell({ A1: '=B1+5' }, 'A1')).toBe('5');
  });
  it('reports cycles, text arithmetic and division errors', () => {
    expect(evaluateCell({ A1: '=A2', A2: '=A1' }, 'A1')).toBe('#CYCLE!');
    expect(evaluateCell({ A1: 'abc', A2: '=A1+1' }, 'A2')).toBe('#VALUE!');
    expect(evaluateCell({ A1: '=1/0' }, 'A1')).toBe('#DIV/0!');
  });
  it('returns plain values unchanged', () => {
    expect(evaluateCell({ A1: 'hello' }, 'A1')).toBe('hello');
    expect(evaluateCell({ A1: '1.50' }, 'A1')).toBe('1.50');
  });
  it('converts between column labels and references', () => {
    expect(columnLabel(0)).toBe('A');
    expect(columnLabel(9)).toBe('J');
    expect(columnLabel(26)).toBe('AA');
    expect(parseCellReference('c3')).toEqual({ column: 2, row: 3 });
    expect(cellReference(1, 12)).toBe('B12');
  });
});
