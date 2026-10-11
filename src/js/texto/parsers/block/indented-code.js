import { createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class IndentedCodeParser extends BaseBlockParser {
  constructor() {
    super("indented-code", BLOCK_PRIORITIES.PRE + 2);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const indent = cursor.pos - save.pos;
    if (indent >= 4 || indent >= 1 && this.hasTabAtStart(save)) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "indented-code", indent };
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return null;
  }
  process(cursor, context, info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const baseIndent = info.indent || 4;
    const lines = [];
    let iterations = 0;
    const maxIterations = 1000;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const lineStart = cursor.clone();
      this.skipLeadingWhitespace(cursor);
      const currentIndent = cursor.pos - lineStart.pos;
      const firstChar = lineStart.peek(0);
      if (currentIndent >= 4 || firstChar === "\t") {
        cursor.readLine();
        const fullLineEnd = cursor.pos;
        const fullLine = context.getText().slice(lineStart.pos, fullLineEnd);
        const lineWithoutEnding = fullLine.replace(/\r?\n$/, "");
        const stripCount = firstChar === "\t" ? 1 : baseIndent;
        const strippedContent = this.removeIndent(lineWithoutEnding, stripCount);
        lines.push(strippedContent);
      } else if (currentIndent === 0 && cursor.current() === null) {
        break;
      } else {
        const restOfLine = this.peekRestOfLine(cursor);
        if (restOfLine.trim() === "") {
          lines.push("");
          cursor.readLine();
        } else {
          cursor.pos = lineStart.pos;
          cursor.lineNumber = lineStart.lineNumber;
          cursor.columnNumber = lineStart.columnNumber;
          break;
        }
      }
    }
    const end = cursor.pos;
    while (lines.length > 0 && lines[lines.length - 1] === "") {
      lines.pop();
    }
    const node = context.builder.createAndAppend("preformatted", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    node.attributes.set("_format", "indented");
    if (lines.length > 0) {
      const content = lines.join(`
`);
      const contentStart = start + baseIndent;
      const textNode = createText(content, {
        start: contentStart,
        end: contentStart + content.length,
        line: startLine,
        column: startColumn + baseIndent
      });
      node.children.push(textNode);
    }
    return {
      consumed: end - start,
      node
    };
  }
  hasTabAtStart(cursor) {
    return cursor.current() === "\t";
  }
  peekRestOfLine(cursor) {
    const save = cursor.clone();
    let result = "";
    while (cursor.current() !== null && cursor.current() !== `
`) {
      result += cursor.current();
      cursor.advance();
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return result;
  }
  removeIndent(lineContent, targetIndent) {
    let removed = 0;
    let result = "";
    for (const char of lineContent) {
      if (removed < targetIndent && (char === " " || char === "\t")) {
        removed++;
        if (char === "\t") {
          removed += 3;
        }
      } else {
        result += char;
      }
    }
    return result;
  }
}

export { IndentedCodeParser };
