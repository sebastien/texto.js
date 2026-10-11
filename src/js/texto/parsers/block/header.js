import { createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class HeaderParser extends BaseBlockParser {
  constructor() {
    super("header", BLOCK_PRIORITIES.SECTION - 1);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const _line = cursor.readLine();
    if (!cursor.isAtEnd()) {
      const _newlinePos = cursor.pos;
      cursor.advance();
      const underline = cursor.readLine();
      if (/^[=-]+$/.test(underline) && underline.length >= 3) {
        cursor.pos = save.pos;
        cursor.lineNumber = save.lineNumber;
        cursor.columnNumber = save.columnNumber;
        const depth = underline.startsWith("==") ? 1 : 2;
        return { type: "header", style: "underline", depth };
      }
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    let hashCount = 0;
    while (cursor.peek(hashCount) === "#") {
      hashCount++;
    }
    if (hashCount > 0 && hashCount <= 6) {
      const nextChar = cursor.peek(hashCount);
      if (nextChar === " " || nextChar === "\t" || nextChar === `
` || nextChar === null) {
        cursor.pos = save.pos;
        cursor.lineNumber = save.lineNumber;
        cursor.columnNumber = save.columnNumber;
        return { type: "header", style: "hash", depth: hashCount };
      }
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
    let title = "";
    let depth = 1;
    let titleStart = start;
    let titleStartLine = startLine;
    let titleStartColumn = startColumn;
    if (info.style === "underline") {
      this.skipLeadingWhitespace(cursor);
      titleStart = cursor.pos;
      titleStartLine = cursor.lineNumber;
      titleStartColumn = cursor.columnNumber;
      title = cursor.readLine().trim();
      if (!cursor.isAtEnd()) {
        cursor.advance();
        cursor.readLine();
      }
      depth = info.depth;
    } else if (info.style === "hash") {
      this.skipLeadingWhitespace(cursor);
      depth = info.depth;
      let hashCount = 0;
      while (cursor.current() === "#" && hashCount < depth) {
        cursor.advance();
        hashCount++;
      }
      if (cursor.current() === " " || cursor.current() === "\t") {
        cursor.advance();
      }
      titleStart = cursor.pos;
      titleStartLine = cursor.lineNumber;
      titleStartColumn = cursor.columnNumber;
      title = cursor.readLine().trim();
      title = title.replace(/\s+#+$/, "");
    }
    const end = cursor.pos;
    const endLine = cursor.lineNumber;
    const endColumn = cursor.columnNumber;
    const indent = context.getIndentation(title);
    const parentContent = context.getParentSection(depth, indent);
    context.builder.setCurrentNode(parentContent);
    const node = context.builder.createAndAppend("section", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    node.attributes.set("depth", String(depth));
    node.attributes.set("_indent", String(indent));
    node.attributes.set("_style", info.style);
    node.attributes.set("id", context.asKey(title, node));
    context.builder.pushNode(node);
    const titleNode = context.builder.createAndAppend("title", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    if (title) {
      const textNode = createText(context.normaliseText(title), {
        start: titleStart,
        end: titleStart + title.length,
        line: titleStartLine,
        column: titleStartColumn
      });
      titleNode.children.push(textNode);
    }
    const contentNode = context.builder.createAndAppend("content", {}, {
      start: end,
      end,
      line: endLine,
      column: endColumn
    });
    contentNode.attributes.set("_indent", String(indent));
    context.builder.popNode();
    context.pushSection(node, contentNode, depth, indent);
    context.builder.pushNode(contentNode);
    return {
      consumed: end - start,
      node
    };
  }
}

export { HeaderParser };
