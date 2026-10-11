import { createText } from "../../document/node.js";
import { INLINE_PRIORITIES } from "../../parsing/priority.js";
import { BaseInlineParser } from "./base.js";

class CodeParser extends BaseInlineParser {
  constructor() {
    super("code", INLINE_PRIORITIES.CODE);
  }
  findNext(cursor, _context) {
    const text = cursor.text;
    let pos = cursor.pos;
    while (pos < text.length) {
      if (text[pos] === "`") {
        let tickCount = 0;
        const startTicks = pos;
        while (pos < text.length && text[pos] === "`") {
          tickCount++;
          pos++;
        }
        const contentStart = pos;
        let endTicks = -1;
        while (pos < text.length) {
          if (text[pos] === "`") {
            let closeCount = 0;
            const potentialEnd = pos;
            while (pos < text.length && text[pos] === "`") {
              closeCount++;
              pos++;
            }
            if (closeCount === tickCount) {
              endTicks = potentialEnd;
              break;
            }
          } else {
            pos++;
          }
        }
        if (endTicks !== -1) {
          return {
            start: startTicks,
            end: endTicks + tickCount,
            content: text.slice(contentStart, endTicks),
            style: "code",
            tickCount
          };
        }
        pos = startTicks + 1;
      } else {
        pos++;
      }
    }
    return null;
  }
  parse(cursor, context, match) {
    const currentPos = cursor.getPosition();
    const tickCount = match.tickCount || 1;
    const contentStart = match.start + tickCount;
    const contentEnd = match.end - tickCount;
    const node = context.builder.createAndAppend("code", {}, {
      start: match.start,
      end: match.end,
      line: currentPos.line,
      column: currentPos.column
    });
    if (match.content) {
      const textNode = createText(match.content, {
        start: contentStart,
        end: contentEnd,
        line: currentPos.line,
        column: currentPos.column + tickCount
      });
      node.children.push(textNode);
    }
    return match.end;
  }
}

export { CodeParser };
