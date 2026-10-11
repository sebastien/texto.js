import { INLINE_PRIORITIES } from "../../parsing/priority.js";
import { BaseInlineParser } from "./base.js";

class TextParser extends BaseInlineParser {
  constructor() {
    super("text", INLINE_PRIORITIES.TEXT);
  }
  findNext(cursor, _context) {
    if (cursor.isAtEnd()) {
      return null;
    }
    return {
      start: cursor.pos,
      end: cursor.length,
      content: cursor.slice(cursor.pos, cursor.length)
    };
  }
  parse(cursor, context, match) {
    const currentPos = cursor.getPosition();
    context.builder.addText(match.content, {
      start: match.start,
      end: match.end,
      line: currentPos.line,
      column: currentPos.column
    });
    return match.end;
  }
}

export { TextParser };
