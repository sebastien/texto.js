// Indented preformatted block parser
// Handles old-style preformatted blocks with >   prefix
// Example:
//   >   Line 1
//   >   Line 2
//   >   Line 3

import { Cursor } from '../../utils/cursor.ts';
import { RecognitionInfo, BlockResult } from '../../utils/types.ts';
import { ParsingContext } from '../../parsing/context.ts';
import { BaseBlockParser } from './base.ts';
import { BLOCK_PRIORITIES } from '../../parsing/priority.ts';
import { createText } from '../../document/node.ts';

export class IndentedPreBlockParser extends BaseBlockParser {
  constructor() {
    super('indented-pre', BLOCK_PRIORITIES.PRE);
  }

  recognises(
    cursor: Cursor,
    _context: ParsingContext
  ): RecognitionInfo | null {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);

    // Check for old-style pre marker: > followed by tab or 3 spaces
    if (cursor.current() !== '>') {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }

    cursor.advance(); // skip >

    // Must be followed by tab or at least 3 spaces
    let spaceCount = 0;
    let hasTab = false;

    while (cursor.current() === ' ' || cursor.current() === '\t') {
      if (cursor.current() === '\t') {
        hasTab = true;
        cursor.advance();
        break;
      } else {
        spaceCount++;
        cursor.advance();
      }
    }

    // Valid if: has tab, or has 3+ spaces
    if (!hasTab && spaceCount < 3) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }

    // Check that there's content or end of line
    const current = cursor.current();
    if (current !== null && current !== '\n' && current !== '\r') {
      // There should be content after the indentation
      // (already validated by hasTab or spaceCount >= 3)
    }

    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;

    return { type: 'indented-pre', indent: this.countLeadingSpaces(save) };
  }

  process(
    cursor: Cursor,
    context: ParsingContext,
    _info: RecognitionInfo
  ): BlockResult {
    const start = cursor.pos;
    const startIndent = this.countLeadingSpaces(cursor);

    // Collect all lines that match the preformatted pattern
    const lines: string[] = [];
    let iterations = 0;
    const maxIterations = 1000;

    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;

      const lineStart = cursor.pos;
      const lineIndent = this.countLeadingSpaces(cursor);

      // Check if this line starts with > followed by proper indentation
      this.skipLeadingWhitespace(cursor);

      if (cursor.current() !== '>') {
        // Not a pre line - restore and break
        cursor.pos = lineStart;
        cursor.lineNumber = cursor.lineNumber; // Will be recalculated
        break;
      }

      cursor.advance(); // skip >

      // Check for tab or 3+ spaces
      let spaceCount = 0;
      let hasTab = false;
      let spacesStart = cursor.pos;

      while (cursor.current() === ' ' || cursor.current() === '\t') {
        if (cursor.current() === '\t') {
          hasTab = true;
          cursor.advance();
          break;
        } else {
          spaceCount++;
          cursor.advance();
        }
      }

      if (!hasTab && spaceCount < 3) {
        // Not a valid pre line - restore and break
        cursor.pos = lineStart;
        break;
      }

      // Extract content after the marker
      const contentStart = cursor.pos;
      let content = '';

      while (cursor.current() !== null && cursor.current() !== '\n' && cursor.current() !== '\r') {
        content += cursor.current();
        cursor.advance();
      }

      lines.push(content);

      // Skip newline
      if (cursor.current() === '\r') {
        cursor.advance();
      }
      if (cursor.current() === '\n') {
        cursor.advance();
      }

      // Check if next line is also a pre line
      const saved = cursor.clone();
      this.skipLeadingWhitespace(cursor);

      if (cursor.current() !== '>') {
        // Next line doesn't start pre block - restore and we're done
        cursor.pos = saved.pos;
        cursor.lineNumber = saved.lineNumber;
        cursor.columnNumber = saved.columnNumber;
        break;
      }

      // Restore to continue processing
      cursor.pos = saved.pos;
      cursor.lineNumber = saved.lineNumber;
      cursor.columnNumber = saved.columnNumber;
    }

    const end = cursor.pos;

    // Create pre node with position
    const node = context.builder.createAndAppend('pre', {}, { start, end, line: 0, column: 0 });
    node.attributes.set('_format', 'indented');

    // Join lines with newlines
    const content = lines.join('\n');

    if (content) {
      // Calculate content position - start after the markers
      const contentStart = start + (lines.length > 0 ? lines[0].length - content.length + lines[0].indexOf(lines[0].trimStart()) : 0);
      const textNode = createText(content, { start, end, line: 0, column: 0 });
      node.children.push(textNode);
    }

    return {
      consumed: end - start,
      node
    };
  }

  private countLeadingSpaces(cursor: Cursor): number {
    const save = cursor.clone();
    let count = 0;

    while (cursor.current() === ' ' || cursor.current() === '\t') {
      if (cursor.current() === ' ') {
        count++;
      } else if (cursor.current() === '\t') {
        count += 4;
      }
      cursor.advance();
    }

    // Restore cursor position
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;

    return count;
  }
}
