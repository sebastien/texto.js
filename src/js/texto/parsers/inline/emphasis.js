import { createText } from "../../document/node.js";
import { INLINE_PRIORITIES } from "../../parsing/priority.js";
import { BaseInlineParser } from "./base.js";

class EmphasisParser extends BaseInlineParser {
  constructor() {
    super("emphasis", INLINE_PRIORITIES.EMPHASIS);
  }
  findNext(cursor, _context) {
    const text = cursor.text;
    const _textLength = text.length;
    const pos = cursor.pos;
    let bestMatch = null;
    let bestStart = 1 / 0;
    const strongAsterisk = text.indexOf("**", pos);
    const strongUnderscore = text.indexOf("__", pos);
    const emAsterisk = text.indexOf("*", pos);
    const emUnderscore = text.indexOf("_", pos);
    if (strongAsterisk !== -1) {
      const closeIdx = text.indexOf("**", strongAsterisk + 2);
      if (closeIdx !== -1 && closeIdx < bestStart) {
        bestStart = strongAsterisk;
        bestMatch = {
          start: strongAsterisk,
          end: closeIdx + 2,
          content: text.slice(strongAsterisk + 2, closeIdx),
          style: "strong",
          delimiter: "**"
        };
      }
    }
    if (strongUnderscore !== -1) {
      const closeIdx = text.indexOf("__", strongUnderscore + 2);
      if (closeIdx !== -1 && strongUnderscore < bestStart) {
        bestStart = strongUnderscore;
        bestMatch = {
          start: strongUnderscore,
          end: closeIdx + 2,
          content: text.slice(strongUnderscore + 2, closeIdx),
          style: "strong",
          delimiter: "__"
        };
      }
    }
    if (emAsterisk !== -1 && emAsterisk !== strongAsterisk) {
      if (text[emAsterisk + 1] !== "*") {
        const closeIdx = text.indexOf("*", emAsterisk + 1);
        if (closeIdx !== -1 && text[closeIdx + 1] !== "*" && emAsterisk < bestStart) {
          bestStart = emAsterisk;
          bestMatch = {
            start: emAsterisk,
            end: closeIdx + 1,
            content: text.slice(emAsterisk + 1, closeIdx),
            style: "emphasis",
            delimiter: "*"
          };
        }
      }
    }
    if (emUnderscore !== -1 && emUnderscore !== strongUnderscore) {
      if (text[emUnderscore + 1] !== "_") {
        const closeIdx = text.indexOf("_", emUnderscore + 1);
        if (closeIdx !== -1 && text[closeIdx + 1] !== "_" && emUnderscore < bestStart) {
          bestStart = emUnderscore;
          bestMatch = {
            start: emUnderscore,
            end: closeIdx + 1,
            content: text.slice(emUnderscore + 1, closeIdx),
            style: "emphasis",
            delimiter: "_"
          };
        }
      }
    }
    return bestMatch;
  }
  parse(cursor, context, match) {
    const tagName = match.style === "strong" ? "strong" : "emphasis";
    const startPos = cursor.getPosition();
    const node = context.builder.createAndAppend(tagName, {}, {
      start: match.start,
      end: match.end,
      line: startPos.line,
      column: startPos.column
    });
    const delimiterLen = match.style === "strong" ? 2 : 1;
    const contentStart = match.start + delimiterLen;
    const contentEnd = match.end - delimiterLen;
    const textNode = createText(match.content, {
      start: contentStart,
      end: contentEnd,
      line: startPos.line,
      column: startPos.column + delimiterLen
    });
    node.children.push(textNode);
    return match.end;
  }
}

export { EmphasisParser };
