import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class ParagraphParser extends BaseBlockParser {
  constructor() {
    super("paragraph", BLOCK_PRIORITIES.PARAGRAPH);
  }
  recognises(_cursor, _context) {
    return { type: "paragraph" };
  }
  process(cursor, context, _info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const blockEnd = context.getBlockEnd();
    const text = context.getText();
    const lines = [];
    const linePositions = [];
    let iterations = 0;
    const maxIterations = 100;
    const firstLineIndent = this.getLineIndent(text, start);
    while (cursor.pos < blockEnd && !cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const lineStartOffset = cursor.pos;
      const lineStartLine = cursor.lineNumber;
      const _lineStartColumn = cursor.columnNumber;
      const line = cursor.readLine();
      const lineEndOffset = cursor.pos;
      if (lines.length === 0 && line.trim() === "") {
        continue;
      }
      if (line.trim() === "") {
        cursor.pos = lineStartOffset;
        break;
      }
      const lineIndent = this.getLineIndent(text, lineStartOffset);
      if (lineIndent >= 4) {
        cursor.pos = lineStartOffset;
        break;
      }
      lines.push(line);
      linePositions.push({
        start: lineStartOffset,
        end: lineEndOffset,
        lineStart: lineStartLine,
        lineEnd: cursor.lineNumber
      });
      if (cursor.pos < text.length) {
        const nextLineStart = cursor.pos;
        const nextLineIndent = this.getLineIndent(text, nextLineStart);
        const nextLineContent = this.readLineFromText(text, nextLineStart).trim();
        const nextLineFull = this.readLineFromText(text, nextLineStart);
        const tableBorderLine = /^\s*={3,}\s*$/.test(nextLineFull);
        if (nextLineContent === "") {
          break;
        }
        if (tableBorderLine) {
          break;
        }
        if (nextLineIndent < firstLineIndent - 2) {
          break;
        }
        const listMarkerMatch = /^\s*([-_*]|\[\s\]|\[[xX]\]|\d+[.)])\s/.test(nextLineFull);
        if (listMarkerMatch && nextLineIndent <= firstLineIndent + 2) {
          break;
        }
        if (nextLineIndent >= 4) {
          break;
        }
      }
      if (cursor.pos >= blockEnd) {
        break;
      }
    }
    const end = cursor.pos;
    if (lines.length === 0) {
      return {
        consumed: end - start,
        node: null
      };
    }
    const node = context.builder.createAndAppend("paragraph", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    if (context.parser) {
      const firstLine = lines[0];
      const firstLineTrimmed = firstLine.trimStart();
      const leadingSpaces = firstLine.length - firstLineTrimmed.length;
      const contentStartOffset = linePositions[0].start + leadingSpaces;
      let content = "";
      let hasHardBreaks = false;
      for (let i = 0;i < lines.length; i++) {
        const line = lines[i];
        if (i > 0) {
          const prevLine = lines[i - 1];
          if (/ {2}\s*$/.test(prevLine)) {
            content += `
`;
            hasHardBreaks = true;
          } else {
            content += " ";
          }
        }
        if (i < lines.length - 1) {
          content += line.trim();
        } else {
          const trimmed = line.trimStart();
          content += trimmed;
        }
      }
      content = content.trimStart();
      const trailingMatch = content.match(/[ \t]+$/);
      const trailingSpaces = trailingMatch ? trailingMatch[0] : "";
      content = content.replace(/[ \t]+/g, " ") + trailingSpaces;
      if (content) {
        context.builder.pushNode(node);
        if (hasHardBreaks) {
          this.parseWithLineBreaks(content, node, context, contentStartOffset);
        } else {
          context.parser.parseInlines(content, node, context, contentStartOffset);
        }
        context.builder.popNode();
      }
    }
    return {
      consumed: end - start,
      node
    };
  }
  parseWithLineBreaks(content, node, context, baseOffset) {
    const lines = content.split(`
`);
    let currentOffset = baseOffset;
    for (let i = 0;i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        context.parser?.parseInlines(line, node, context, currentOffset);
      }
      if (i < lines.length - 1) {
        context.builder.createAndAppend("br", {}, {
          start: currentOffset,
          end: currentOffset,
          line: 0,
          column: 0
        });
      }
      currentOffset += line.length + 1;
    }
  }
  getLineIndent(text, offset) {
    let indent = 0;
    let pos = offset;
    while (pos < text.length) {
      const char = text[pos];
      if (char === " ") {
        indent++;
        pos++;
      } else if (char === "\t") {
        indent += 4;
        pos++;
      } else if (char === `
` || char === "\r") {
        break;
      } else {
        break;
      }
    }
    return indent;
  }
  readLineFromText(text, offset) {
    const lfPos = text.indexOf(`
`, offset);
    const crPos = text.indexOf("\r", offset);
    let end;
    if (lfPos === -1 && crPos === -1) {
      return text.slice(offset);
    } else if (crPos === -1 || lfPos !== -1 && lfPos < crPos) {
      end = lfPos;
    } else {
      end = crPos;
    }
    return text.slice(offset, end);
  }
}

export { ParagraphParser };
