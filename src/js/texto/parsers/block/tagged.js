import { createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class TaggedBlockParser extends BaseBlockParser {
  constructor() {
    super("tagged", BLOCK_PRIORITIES.TAGGED);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    let tagName = "";
    if (/[A-Z]/.test(cursor.current() || "")) {
      while (/[a-zA-Z0-9]/.test(cursor.current() || "")) {
        tagName += cursor.current();
        cursor.advance();
      }
    }
    if (tagName.length === 0) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    let underscoreCount = 0;
    while (cursor.current() === "_") {
      underscoreCount++;
      cursor.advance();
    }
    if (underscoreCount >= 3 && (cursor.current() === `
` || cursor.current() === null)) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "tagged", tag: tagName };
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return null;
  }
  process(cursor, context, info) {
    return this.processWithEndDetection(cursor, context, info, null);
  }
  processWithEndDetection(cursor, context, _info, explicitEnd) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const startIndent = this.countIndent(cursor);
    this.skipLeadingWhitespace(cursor);
    let tagName = "";
    while (/[a-zA-Z0-9]/.test(cursor.current() || "")) {
      tagName += cursor.current();
      cursor.advance();
    }
    while (cursor.current() === "_") {
      cursor.advance();
    }
    if (cursor.current() === `
`) {
      cursor.advance();
    }
    const node = context.builder.createAndAppend("tagged", {}, {
      start,
      end: start,
      line: startLine,
      column: startColumn
    });
    node.attributes.set("tag", tagName);
    node.attributes.set("_indent", String(startIndent));
    node.attributes.set("_format", "tagged");
    context.builder.pushNode(node);
    let content = "";
    const contentStart = cursor.pos;
    const contentStartLine = cursor.lineNumber;
    const contentStartColumn = cursor.columnNumber;
    let iterations = 0;
    const maxIterations = 1000;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      if (explicitEnd !== null && cursor.pos >= explicitEnd) {
        break;
      }
      const lineStart = cursor.pos;
      const lineStartSave = cursor.clone();
      const lineIndent = this.countIndent(cursor);
      this.skipLeadingWhitespace(cursor);
      let line = "";
      while (cursor.current() !== null && cursor.current() !== `
` && cursor.current() !== "\r") {
        line += cursor.current();
        cursor.advance();
      }
      if (lineIndent === startIndent && /^_{3,}\s*$/.test(line)) {
        break;
      }
      cursor.pos = lineStart;
      cursor.lineNumber = lineStartSave.lineNumber;
      cursor.columnNumber = lineStartSave.columnNumber;
      const fullLine = cursor.readLine();
      content += fullLine;
      if (cursor.isAtEnd())
        break;
      content += `
`;
    }
    const end = cursor.pos;
    node.position = { start, end, line: startLine, column: startColumn };
    content = context.normaliseText(content).trim();
    if (content) {
      const actualContentStart = contentStart < end ? contentStart : start;
      const actualContentEnd = Math.min(actualContentStart + content.length, end);
      const textNode = createText(content, {
        start: actualContentStart,
        end: actualContentEnd,
        line: contentStartLine,
        column: contentStartColumn
      });
      node.children.push(textNode);
    }
    context.builder.popNode();
    return {
      consumed: end - start,
      node
    };
  }
  countIndent(cursor) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const indent = cursor.pos - save.pos;
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return indent;
  }
}

export { TaggedBlockParser };
