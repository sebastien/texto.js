import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class ReferenceDefinitionParser extends BaseBlockParser {
  constructor() {
    super("reference-definition", BLOCK_PRIORITIES.REFERENCE);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() !== "[") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.advance();
    let label = "";
    while (cursor.current() !== null && cursor.current() !== "]" && cursor.current() !== `
`) {
      label += cursor.current();
      cursor.advance();
    }
    if (cursor.current() !== "]") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.advance();
    if (cursor.current() !== ":") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.advance();
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() === null || cursor.current() === `
`) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    const _urlStart = cursor.pos;
    let url = "";
    if (cursor.current() === "<") {
      cursor.advance();
      while (cursor.current() !== null && cursor.current() !== ">" && cursor.current() !== `
`) {
        url += cursor.current();
        cursor.advance();
      }
      if (cursor.current() === ">") {
        cursor.advance();
      }
    } else {
      while (cursor.current() !== null && cursor.current() !== " " && cursor.current() !== "\t" && cursor.current() !== `
`) {
        url += cursor.current();
        cursor.advance();
      }
    }
    if (!url) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return {
      type: "reference-definition",
      label: label.trim().toLowerCase(),
      url
    };
  }
  process(cursor, context, info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    this.skipLeadingWhitespace(cursor);
    cursor.advance();
    const label = info.label || "";
    cursor.advance(label.length + 2);
    cursor.advance();
    this.skipLeadingWhitespace(cursor);
    const url = info.url || "";
    if (cursor.current() === "<") {
      cursor.advance();
      cursor.advance(url.length);
      if (cursor.current() === ">") {
        cursor.advance();
      }
    } else {
      cursor.advance(url.length);
    }
    let title = "";
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() === '"' || cursor.current() === "'" || cursor.current() === "(") {
      const quoteChar = cursor.current() === "(" ? ")" : cursor.current();
      cursor.advance();
      while (cursor.current() !== null && cursor.current() !== quoteChar && cursor.current() !== `
`) {
        title += cursor.current();
        cursor.advance();
      }
      if (cursor.current() === quoteChar) {
        cursor.advance();
      }
    }
    cursor.readLine();
    if (!cursor.isAtEnd()) {
      cursor.advance();
    }
    if (!title && !cursor.isAtEnd()) {
      const nextLineStart = cursor.clone();
      this.skipLeadingWhitespace(nextLineStart);
      if (nextLineStart.current() === '"' || nextLineStart.current() === "'" || nextLineStart.current() === "(") {
        const quoteChar = nextLineStart.current() === "(" ? ")" : nextLineStart.current();
        nextLineStart.advance();
        while (nextLineStart.current() !== null && nextLineStart.current() !== quoteChar && nextLineStart.current() !== `
`) {
          title += nextLineStart.current();
          nextLineStart.advance();
        }
        if (nextLineStart.current() === quoteChar) {
          nextLineStart.advance();
        }
        nextLineStart.readLine();
        if (!nextLineStart.isAtEnd()) {
          nextLineStart.advance();
        }
        cursor.pos = nextLineStart.pos;
        cursor.lineNumber = nextLineStart.lineNumber;
        cursor.columnNumber = nextLineStart.columnNumber;
      }
    }
    const end = cursor.pos;
    const refNode = context.builder.createAndAppend("target", {
      name: label,
      target: url,
      title
    }, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    context.addTarget(refNode, label);
    return {
      consumed: end - start,
      node: refNode
    };
  }
}

export { ReferenceDefinitionParser };
