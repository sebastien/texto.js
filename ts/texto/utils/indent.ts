// Indentation and tab handling

import { TAB_SIZE } from './types.ts';

export function getIndent(text: string, tabSize: number = TAB_SIZE): number {
  const lines = text.split('\n').filter((line) => line.length > 0);
  if (lines.length === 0) return 0;
  if (lines.length === 1) return countLeadingSpaces(lines[0], tabSize);
  
  const indents = lines.map((line) => countLeadingSpaces(line, tabSize));
  return Math.min(...indents);
}

export function countLeadingSpaces(text: string, tabSize: number = TAB_SIZE): number {
  let count = 0;
  for (const char of text) {
    if (char === '\t') {
      count += tabSize - (count % tabSize);
    } else if (char === ' ') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export function removeLeadingSpaces(text: string, maximum?: number): string {
  let count = 0;
  let i = 0;
  
  for (; i < text.length; i++) {
    if (maximum !== undefined && count >= maximum) {
      break;
    }
    
    const char = text[i];
    if (char === '\t') {
      count += TAB_SIZE - (count % TAB_SIZE);
    } else if (char === ' ') {
      count++;
    } else {
      break;
    }
  }
  
  return text.slice(i);
}

export function expandTabs(text: string, tabSize: number = TAB_SIZE): string {
  let result = '';
  let col = 0;
  
  for (const char of text) {
    if (char === '\t') {
      const spaces = tabSize - (col % tabSize);
      result += ' '.repeat(spaces);
      col += spaces;
    } else if (char === '\n') {
      result += char;
      col = 0;
    } else {
      result += char;
      col++;
    }
  }
  
  return result;
}

export function matchesIndent(line: string, indent: number, tabSize: number = TAB_SIZE): boolean {
  const lineIndent = countLeadingSpaces(line, tabSize);
  return lineIndent >= indent;
}
