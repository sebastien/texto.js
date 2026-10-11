import { createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class FencedBlockParser extends BaseBlockParser {
  constructor() {
    super("fenced", BLOCK_PRIORITIES.PRE);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() !== "`" || cursor.peek(1) !== "`" || cursor.peek(2) !== "`") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.advance(3);
    let lang = "";
    while (cursor.current() !== null && cursor.current() !== " " && cursor.current() !== "\t" && cursor.current() !== `
` && cursor.current() !== "`") {
      lang += cursor.current();
      cursor.advance();
    }
    let output = "";
    if (cursor.current() === " " || cursor.current() === "\t") {
      this.skipLeadingWhitespace(cursor);
      if (cursor.current() === ">") {
        cursor.advance();
        this.skipLeadingWhitespace(cursor);
        while (cursor.current() !== null && cursor.current() !== `
` && cursor.current() !== "`") {
          output += cursor.current();
          cursor.advance();
        }
        output = output.trim();
      }
    }
    const current = cursor.current();
    if (current !== null && current !== `
`) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return null;
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    const indent = this.countLeadingSpaces(save);
    return {
      type: "fenced",
      lang: lang.trim(),
      output,
      indent
    };
  }
  process(cursor, context, info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const indent = info.indent;
    const lang = info.lang;
    const output = info.output;
    this.skipLeadingWhitespace(cursor);
    cursor.advance(3);
    while (cursor.current() !== null && cursor.current() !== `
`) {
      cursor.advance();
    }
    if (cursor.current() === `
`) {
      cursor.advance();
    }
    const contentStart = cursor.pos;
    const contentStartLine = cursor.lineNumber;
    const contentStartColumn = cursor.columnNumber;
    let contentEnd = contentStart;
    let foundClosing = false;
    let iterations = 0;
    const maxIterations = 1e4;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const lineStart = cursor.pos;
      const lineIndent = this.countLeadingSpaces(cursor);
      this.skipLeadingWhitespace(cursor);
      if (lineIndent === indent && cursor.current() === "`" && cursor.peek(1) === "`" && cursor.peek(2) === "`") {
        const saved = cursor.clone();
        cursor.advance(3);
        while (cursor.current() === " " || cursor.current() === "\t") {
          cursor.advance();
        }
        if (cursor.current() === null || cursor.current() === `
`) {
          contentEnd = lineStart;
          foundClosing = true;
          if (cursor.current() === `
`) {
            cursor.advance();
          }
          break;
        } else {
          cursor.pos = saved.pos;
          cursor.lineNumber = saved.lineNumber;
          cursor.columnNumber = saved.columnNumber;
        }
      }
      while (cursor.current() !== null && cursor.current() !== `
`) {
        cursor.advance();
      }
      if (cursor.current() === `
`) {
        cursor.advance();
      }
      contentEnd = cursor.pos;
    }
    if (!foundClosing) {
      cursor.pos = start;
      return {
        consumed: 0,
        node: undefined
      };
    }
    let content = context.getText().slice(contentStart, contentEnd);
    content = this.removeCommonIndent(content);
    content = content.replace(/\n$/, "");
    const end = cursor.pos;
    const node = context.builder.createAndAppend("preformatted", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    node.attributes.set("_format", "fenced");
    if (lang) {
      node.attributes.set("data-lang", lang);
    }
    if (output) {
      node.attributes.set("data-output", output);
    }
    if (content) {
      const actualContentEnd = contentStart + content.length;
      const textNode = createText(content, {
        start: contentStart,
        end: actualContentEnd,
        line: contentStartLine,
        column: contentStartColumn
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
  removeCommonIndent(content) {
    const lines = content.split(`
`);
    if (lines.length === 0) {
      return content;
    }
    let minIndent = null;
    for (const line of lines) {
      if (line.trim() === "")
        continue;
      const indent = this.getIndentOfLine(line);
      if (minIndent === null || indent < minIndent) {
        minIndent = indent;
      }
    }
    if (minIndent === null || minIndent === 0) {
      return content;
    }
    return lines.map((line) => {
      if (line.trim() === "")
        return "";
      return line.slice(minIndent);
    }).join(`
`);
  }
  getIndentOfLine(line) {
    let indent = 0;
    for (const char of line) {
      if (char === " ") {
        indent++;
      } else if (char === "\t") {
        indent += 4;
      } else {
        break;
      }
    }
    return indent;
  }
}

export { FencedBlockParser };
