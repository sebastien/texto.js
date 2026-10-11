import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class BlockquoteParser extends BaseBlockParser {
  constructor() {
    super("blockquote", BLOCK_PRIORITIES.TABLE + 1);
  }
  recognises(cursor, context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() === ">") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "blockquote" };
    }
    const text = context.getText();
    const currentPos = cursor.pos;
    const lineEnd = text.indexOf(`
`, currentPos);
    const currentLine = lineEnd === -1 ? text.slice(currentPos) : text.slice(currentPos, lineEnd);
    if (currentLine.trim() === "") {
      let pos = lineEnd === -1 ? text.length : lineEnd + 1;
      while (pos < text.length) {
        const nextLineEnd = text.indexOf(`
`, pos);
        const nextLine = nextLineEnd === -1 ? text.slice(pos) : text.slice(pos, nextLineEnd);
        const trimmed = nextLine.trimStart();
        if (trimmed.startsWith(">")) {
          cursor.pos = save.pos;
          cursor.lineNumber = save.lineNumber;
          cursor.columnNumber = save.columnNumber;
          return { type: "blockquote", continuation: true };
        }
        if (trimmed !== "") {
          break;
        }
        pos = nextLineEnd === -1 ? text.length : nextLineEnd + 1;
      }
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return null;
  }
  process(cursor, context, info, engine) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const text = context.getText();
    const blockEnd = context.getBlockEnd();
    if (info.continuation) {
      while (cursor.pos < blockEnd && !cursor.isAtEnd()) {
        const lineStart = cursor.pos;
        const lineEnd = text.indexOf(`
`, cursor.pos);
        const line = lineEnd === -1 ? text.slice(lineStart) : text.slice(lineStart, lineEnd);
        if (line.trimStart().startsWith(">")) {
          break;
        }
        if (lineEnd === -1) {
          cursor.pos = text.length;
          break;
        }
        cursor.pos = lineEnd + 1;
        cursor.lineNumber++;
        cursor.columnNumber = 0;
      }
    }
    const lines = [];
    let iterations = 0;
    const maxIterations = 1000;
    while (cursor.pos < blockEnd && !cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const lineStartOffset = cursor.pos;
      this.skipLeadingWhitespace(cursor);
      let level = 0;
      while (cursor.current() === ">") {
        level++;
        cursor.advance();
        if (cursor.current() === " ") {
          cursor.advance();
        }
      }
      if (level === 0) {
        cursor.pos = lineStartOffset;
        break;
      }
      const lineContent = cursor.readLine();
      lines.push({ content: lineContent, level });
      if (cursor.pos < text.length) {
        const nextLineStart = cursor.pos;
        const nextLine = this.readLineFromText(text, nextLineStart).trimStart();
        if (!nextLine.startsWith(">")) {
          if (nextLine === "") {
            const afterBlankPos = nextLineStart + nextLine.length + 1;
            if (afterBlankPos < text.length) {
              const afterLine = this.readLineFromText(text, afterBlankPos).trimStart();
              if (afterLine.startsWith(">")) {
                lines.push({ content: "", level: 1 });
                cursor.pos = afterBlankPos;
                continue;
              }
            }
          }
          break;
        }
      }
    }
    const end = cursor.pos;
    const node = context.builder.createAndAppend("blockquote", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    if (lines.length > 0 && context.parser) {
      context.builder.pushNode(node);
      this.processLines(lines, node, context, engine, start);
      context.builder.popNode();
    }
    return {
      consumed: end - start,
      node
    };
  }
  processLines(lines, parentNode, context, _engine, startOffset) {
    const currentLevel = 1;
    let currentLines = [];
    const currentOffset = startOffset;
    for (let i = 0;i < lines.length; i++) {
      const line = lines[i];
      if (line.level === currentLevel && line.content === "") {
        if (currentLines.length > 0) {
          this.processBlockquoteContent(currentLines, parentNode, context, currentLevel);
          currentLines = [];
        }
        continue;
      }
      if (line.level === currentLevel) {
        const headerMatch = line.content.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch && currentLines.length > 0) {
          this.processBlockquoteContent(currentLines, parentNode, context, currentLevel);
          currentLines = [];
        }
        if (headerMatch) {
          const level = headerMatch[1].length;
          const text = headerMatch[2];
          this.createSection(text, level, context, currentOffset);
        } else {
          currentLines.push(line.content);
        }
      } else if (line.level > currentLevel) {
        if (currentLines.length > 0) {
          this.processBlockquoteContent(currentLines, parentNode, context, currentLevel);
          currentLines = [];
        }
        const nestedNode = context.builder.createAndAppend("blockquote", {}, {
          start: currentOffset,
          end: currentOffset,
          line: 0,
          column: 0
        });
        const nestedLines = [];
        while (i < lines.length) {
          const nestedLine = lines[i];
          if (nestedLine.level >= currentLevel + 1) {
            nestedLines.push({
              content: nestedLine.content,
              level: nestedLine.level - currentLevel
            });
            i++;
            continue;
          }
          if (nestedLine.level === currentLevel && nestedLine.content !== "") {
            nestedLines.push({
              content: nestedLine.content,
              level: 1
            });
            i++;
            continue;
          }
          break;
        }
        i--;
        context.builder.pushNode(nestedNode);
        this.processLines(nestedLines, nestedNode, context, _engine, currentOffset);
        context.builder.popNode();
      } else {
        currentLines.push(line.content);
      }
    }
    if (currentLines.length > 0) {
      this.processBlockquoteContent(currentLines, parentNode, context, currentLevel);
    }
  }
  createSection(title, depth, context, offset) {
    const sectionNode = context.builder.createAndAppend("section", {}, {
      start: offset,
      end: offset,
      line: 0,
      column: 0
    });
    sectionNode.attributes.set("depth", String(depth));
    sectionNode.attributes.set("_style", "hash");
    context.builder.pushNode(sectionNode);
    const titleNode = context.builder.createAndAppend("title", {}, undefined);
    if (context.parser) {
      context.builder.pushNode(titleNode);
      context.parser.parseInlines(title, titleNode, context, offset);
      context.builder.popNode();
    }
    context.builder.createAndAppend("content", {}, undefined);
    context.builder.popNode();
  }
  processBlockquoteContent(lines, parentNode, context, _level) {
    if (lines.length === 0)
      return;
    let content = "";
    for (let i = 0;i < lines.length; i++) {
      if (i > 0) {
        const prevLine = lines[i - 1];
        if (!prevLine.endsWith(" ")) {
          content += " ";
        }
      }
      content += lines[i];
    }
    this.createParagraph(content, parentNode, context);
  }
  createParagraph(content, _parentNode, context) {
    if (!content.trim())
      return;
    const pNode = context.builder.createAndAppend("paragraph", {}, {
      start: 0,
      end: 0,
      line: 0,
      column: 0
    });
    if (context.parser) {
      context.builder.pushNode(pNode);
      const trimmedContent = content.trimStart();
      context.parser.parseInlines(trimmedContent, pNode, context, 0);
      context.builder.popNode();
    }
  }
  readLineFromText(text, offset) {
    const end = text.indexOf(`
`, offset);
    if (end === -1) {
      return text.slice(offset);
    }
    return text.slice(offset, end);
  }
}

export { BlockquoteParser };
