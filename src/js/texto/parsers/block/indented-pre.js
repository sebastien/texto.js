import { createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class IndentedPreBlockParser extends BaseBlockParser {
  constructor() {
    super("indented-pre", BLOCK_PRIORITIES.PRE);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() !== ">") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.advance();
    let spaceCount = 0;
    let hasTab = false;
    while (cursor.current() === " " || cursor.current() === "\t") {
      if (cursor.current() === "\t") {
        hasTab = true;
        cursor.advance();
        break;
      } else {
        spaceCount++;
        cursor.advance();
      }
    }
    if (!hasTab && spaceCount < 3) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    const current = cursor.current();
    if (current !== null && current !== `
` && current !== "\r") {}
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return { type: "indented-pre", indent: this.countLeadingSpaces(save) };
  }
  process(cursor, context, _info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const _startIndent = this.countLeadingSpaces(cursor);
    const lines = [];
    const contentPositions = [];
    let iterations = 0;
    const maxIterations = 1000;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const lineStart = cursor.pos;
      const _lineStartLine = cursor.lineNumber;
      const _lineStartCol = cursor.columnNumber;
      const _lineIndent = this.countLeadingSpaces(cursor);
      this.skipLeadingWhitespace(cursor);
      if (cursor.current() !== ">") {
        cursor.pos = lineStart;
        break;
      }
      cursor.advance();
      let spaceCount = 0;
      let hasTab = false;
      while (cursor.current() === " " || cursor.current() === "\t") {
        if (cursor.current() === "\t") {
          hasTab = true;
          cursor.advance();
          break;
        } else {
          spaceCount++;
          cursor.advance();
        }
      }
      if (!hasTab && spaceCount < 3) {
        cursor.pos = lineStart;
        break;
      }
      const contentStart = cursor.pos;
      const contentStartLine = cursor.lineNumber;
      const contentStartCol = cursor.columnNumber;
      let content = "";
      while (cursor.current() !== null && cursor.current() !== `
` && cursor.current() !== "\r") {
        content += cursor.current();
        cursor.advance();
      }
      lines.push(content);
      contentPositions.push({
        start: contentStart,
        end: cursor.pos,
        lineStart: contentStartLine,
        colStart: contentStartCol
      });
      if (cursor.current() === "\r") {
        cursor.advance();
      }
      if (cursor.current() === `
`) {
        cursor.advance();
      }
      const saved = cursor.clone();
      this.skipLeadingWhitespace(cursor);
      if (cursor.current() !== ">") {
        cursor.pos = saved.pos;
        cursor.lineNumber = saved.lineNumber;
        cursor.columnNumber = saved.columnNumber;
        break;
      }
      cursor.pos = saved.pos;
      cursor.lineNumber = saved.lineNumber;
      cursor.columnNumber = saved.columnNumber;
    }
    const end = cursor.pos;
    const node = context.builder.createAndAppend("preformatted", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    node.attributes.set("_format", "indented");
    const content = lines.join(`
`);
    if (content && contentPositions.length > 0) {
      const firstContent = contentPositions[0];
      const lastContent = contentPositions[contentPositions.length - 1];
      const totalContentStart = firstContent.start;
      const totalContentEnd = lastContent.end;
      const textNode = createText(content, {
        start: totalContentStart,
        end: totalContentEnd,
        line: firstContent.lineStart,
        column: firstContent.colStart
      });
      node.children.push(textNode);
    }
    return {
      consumed: end - start,
      node
    };
  }
  countLeadingSpaces(cursor) {
    const save = cursor.clone();
    let count = 0;
    while (cursor.current() === " " || cursor.current() === "\t") {
      if (cursor.current() === " ") {
        count++;
      } else if (cursor.current() === "\t") {
        count += 4;
      }
      cursor.advance();
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return count;
  }
}

export { IndentedPreBlockParser };
