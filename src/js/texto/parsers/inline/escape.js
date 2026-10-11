import { createText } from "../../document/node.js";
import { INLINE_PRIORITIES } from "../../parsing/priority.js";
import { BaseInlineParser } from "./base.js";
const ESCAPABLE_CHARS = new Set([
  "\\",
  "`",
  "*",
  "_",
  "{",
  "}",
  "[",
  "]",
  "(",
  ")",
  "#",
  "+",
  "-",
  ".",
  "!",
  "|",
  "<",
  ">"
]);

class EscapeParser extends BaseInlineParser {
  constructor() {
    super("escape", INLINE_PRIORITIES.ESCAPED);
  }
  findNext(cursor, _context) {
    const text = cursor.text;
    const textLength = text.length;
    let pos = cursor.pos;
    while (pos < textLength) {
      if (text[pos] === "\\" && pos + 1 < textLength) {
        const nextChar = text[pos + 1];
        if (ESCAPABLE_CHARS.has(nextChar)) {
          return {
            start: pos,
            end: pos + 2,
            content: nextChar,
            escaped: nextChar
          };
        }
        if (nextChar === `
`) {
          return {
            start: pos,
            end: pos + 2,
            content: "",
            escaped: `
`,
            isLineBreak: true
          };
        }
      }
      pos++;
    }
    return null;
  }
  parse(cursor, context, match) {
    const currentPos = cursor.getPosition();
    if (match.isLineBreak) {
      context.builder.createAndAppend("br", {}, {
        start: match.start,
        end: match.end,
        line: currentPos.line,
        column: currentPos.column
      });
    } else {
      const escapedChar = match.escaped || "";
      if (escapedChar) {
        const textNode = createText(escapedChar, {
          start: match.start + 1,
          end: match.end,
          line: currentPos.line,
          column: currentPos.column + 1
        });
        context.builder.getCurrentNode().children.push(textNode);
      }
    }
    return match.end;
  }
}

export { EscapeParser };
