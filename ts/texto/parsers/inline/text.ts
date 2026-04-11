// Text inline parser (fallback)

import { Cursor } from '../../utils/cursor.ts';
import { InlineMatch, Node } from '../../utils/types.ts';
import { ParsingContext } from '../../parsing/context.ts';
import { BaseInlineParser } from './base.ts';
import { INLINE_PRIORITIES } from '../../parsing/priority.ts';

export class TextParser extends BaseInlineParser {
  constructor() {
    super('text', INLINE_PRIORITIES.TEXT);
  }

  findNext(
    cursor: Cursor,
    _context: ParsingContext
  ): InlineMatch | null {
    // Text parser just consumes all remaining text
    // This should be used as a fallback
    if (cursor.isAtEnd()) {
      return null;
    }
    
    return {
      start: cursor.pos,
      end: cursor.length,
      content: cursor.slice(cursor.pos, cursor.length)
    };
  }

  parse(
    cursor: Cursor,
    context: ParsingContext,
    match: InlineMatch
  ): number {
    // Add as text node with position
    const textNode = context.builder.addText(match.content, { start: match.start, end: match.end, line: 0, column: 0 });
    context.builder.getCurrentNode().children.push(textNode);

    return match.end;
  }
}
