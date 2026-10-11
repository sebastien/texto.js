import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class HorizontalRuleParser extends BaseBlockParser {
  constructor() {
    super("horizontal-rule", BLOCK_PRIORITIES.SEPARATOR + 2);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const firstChar = cursor.current();
    if (firstChar !== "-" && firstChar !== "*" && firstChar !== "_") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    let count = 0;
    const marker = firstChar;
    while (cursor.current() !== null && cursor.current() !== `
`) {
      const current = cursor.current();
      if (current === marker) {
        count++;
        cursor.advance();
      } else if (current === " " || current === "\t") {
        cursor.advance();
      } else {
        cursor.pos = save.pos;
        cursor.lineNumber = save.lineNumber;
        cursor.columnNumber = save.columnNumber;
        return null;
      }
    }
    if (count >= 3) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "horizontal-rule", marker };
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return null;
  }
  process(cursor, context, _info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    this.skipLeadingWhitespace(cursor);
    cursor.readLine();
    if (!cursor.isAtEnd()) {
      cursor.advance();
    }
    const end = cursor.pos;
    const node = context.builder.createAndAppend("horizontal-rule", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    return {
      consumed: end - start,
      node
    };
  }
}

export { HorizontalRuleParser };
