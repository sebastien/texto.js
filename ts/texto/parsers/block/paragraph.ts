// Paragraph block parser (default fallback)

import { Cursor } from '../../utils/cursor.ts';
import { RecognitionInfo, BlockResult } from '../../utils/types.ts';
import { ParsingContext } from '../../parsing/context.ts';
import { BaseBlockParser } from './base.ts';
import { BLOCK_PRIORITIES } from '../../parsing/priority.ts';
import { createText } from '../../document/node.ts';

export class ParagraphParser extends BaseBlockParser {
  constructor() {
    super('paragraph', BLOCK_PRIORITIES.PARAGRAPH);
  }

  recognises(
    _cursor: Cursor,
    _context: ParsingContext
  ): RecognitionInfo | null {
    // Paragraph parser always recognises any non-empty content
    return { type: 'paragraph' };
  }

  process(
    cursor: Cursor,
    context: ParsingContext,
    _info: RecognitionInfo
  ): BlockResult {
    const start = cursor.pos;
    const blockEnd = context.getBlockEnd();
    const text = context.getText();

    // Collect lines until we hit a paragraph boundary
    const lines: string[] = [];
    let iterations = 0;
    const maxIterations = 100;

    // Get base indentation from first line
    const firstLineIndent = this.getLineIndent(text, start);

    while (cursor.pos < blockEnd && !cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;

      const lineStart = cursor.pos;
      const line = this.readLineFromText(text, lineStart);
      
      // Move cursor past this line
      const nextNewline = text.indexOf('\n', lineStart);
      if (nextNewline === -1) {
        cursor.pos = text.length;
      } else {
        cursor.pos = nextNewline + 1;
      }

      // Skip empty lines at the start
      if (lines.length === 0 && line.trim() === '') {
        continue;
      }

      // Check if this line is blank (ends the paragraph)
      if (line.trim() === '') {
        break;
      }

      // Check if next line exists and would end the paragraph
      if (cursor.pos < text.length) {
        const nextLineStart = cursor.pos;
        const nextLineIndent = this.getLineIndent(text, nextLineStart);
        const nextLineContent = this.readLineFromText(text, nextLineStart).trim();
        const nextLineFull = this.readLineFromText(text, nextLineStart);
        
        // If next line is blank, end after this line
        if (nextLineContent === '') {
          lines.push(line);
          break;
        }

        // If next line is significantly less indented, end paragraph
        if (nextLineIndent < firstLineIndent - 2) {
          lines.push(line);
          break;
        }

        // If next line looks like a list item at same or less indent, end paragraph
        // Check for " - " or "* " or "1) " patterns
        const listMarkerMatch = /^\s*([-*]|\[\s\]|\[[xX]\]|\d+[.)])\s/.test(nextLineFull);
        if (listMarkerMatch && nextLineIndent <= firstLineIndent + 2) {
          lines.push(line);
          break;
        }
      }

      lines.push(line);

      // Check if we've reached end of block
      if (cursor.pos >= blockEnd) {
        break;
      }
    }

    // Join lines with spaces and normalize
    let content = lines.join(' ').trim();
    content = content.replace(/[ \t]+/g, ' ');

    const end = cursor.pos;

    // Create paragraph node with position
    const node = context.builder.createAndAppend('p', {}, { start, end, line: 0, column: 0 });

    if (content) {
      // Calculate content position - find where content starts in the original text
      // The text node's position is relative to the paragraph
      const contentStart = text.indexOf(content, start);
      const contentEnd = contentStart >= 0 ? contentStart + content.length : end;
      const contentPosition = contentStart >= 0 ? { start: contentStart, end: contentEnd, line: 0, column: 0 } : undefined;
      const textNode = createText(content, contentPosition);
      node.children.push(textNode);
    }

    return {
      consumed: end - start,
      node
    };
  }

  private getLineIndent(text: string, offset: number): number {
    let indent = 0;
    let pos = offset;
    
    while (pos < text.length) {
      const char = text[pos];
      if (char === ' ') {
        indent++;
        pos++;
      } else if (char === '\t') {
        indent += 4;
        pos++;
      } else if (char === '\n') {
        // Empty line
        break;
      } else {
        break;
      }
    }
    
    return indent;
  }

  private readLineFromText(text: string, offset: number): string {
    const end = text.indexOf('\n', offset);
    if (end === -1) {
      return text.slice(offset);
    }
    return text.slice(offset, end);
  }
}
