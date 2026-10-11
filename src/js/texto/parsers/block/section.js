import { createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class SectionParser extends BaseBlockParser {
  constructor() {
    super("section", BLOCK_PRIORITIES.SECTION);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    let pos = cursor.pos;
    let hasNumber = false;
    let dotCount = 0;
    while (pos < cursor.length) {
      while (pos < cursor.length && /[a-zA-Z0-9]/.test(cursor.slice(pos, pos + 1))) {
        hasNumber = true;
        pos++;
      }
      if (pos >= cursor.length || cursor.slice(pos, pos + 1) !== ".") {
        break;
      }
      dotCount++;
      pos++;
    }
    if (hasNumber && dotCount > 0) {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "section", style: "numbered", depth: dotCount };
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    const _line = cursor.readLine();
    if (!cursor.isAtEnd()) {
      const underline = cursor.readLine();
      if (/^[=-]+$/.test(underline) && underline.length >= 3) {
        cursor.pos = save.pos;
        cursor.lineNumber = save.lineNumber;
        cursor.columnNumber = save.columnNumber;
        const weight = underline.startsWith("==") ? 2 : underline.startsWith("--") ? 1 : 0;
        return { type: "section", style: "underline", weight };
      }
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    let hashCount = 0;
    while (cursor.peek(hashCount) === "#") {
      hashCount++;
    }
    if (hashCount > 0 && hashCount <= 6 && cursor.peek(hashCount) === " ") {
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "section", style: "hash", depth: hashCount };
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
    let sectionWeight = 0;
    let titleStart = start;
    let titleStartLine = startLine;
    let titleStartColumn = startColumn;
    if (info.style === "numbered") {
      this.skipLeadingWhitespace(cursor);
      while (/[a-zA-Z0-9.]/.test(cursor.current() || "")) {
        cursor.advance();
      }
      this.skipLeadingWhitespace(cursor);
      titleStart = cursor.pos;
      titleStartLine = cursor.lineNumber;
      titleStartColumn = cursor.columnNumber;
      title = cursor.readLine();
      depth = info.depth || 1;
    } else if (info.style === "underline") {
      this.skipLeadingWhitespace(cursor);
      titleStart = cursor.pos;
      titleStartLine = cursor.lineNumber;
      titleStartColumn = cursor.columnNumber;
      title = cursor.readLine();
      sectionWeight = info.weight || 0;
      if (!cursor.isAtEnd()) {
        cursor.readLine();
      }
      depth = this.calculateDepth(title, sectionWeight, context);
    } else if (info.style === "hash") {
      while (cursor.current() === "#") {
        cursor.advance();
      }
      this.skipLeadingWhitespace(cursor);
      titleStart = cursor.pos;
      titleStartLine = cursor.lineNumber;
      titleStartColumn = cursor.columnNumber;
      title = cursor.readLine();
      depth = info.depth || 1;
    }
    const end = cursor.pos;
    const endLine = cursor.lineNumber;
    const endColumn = cursor.columnNumber;
    const indent = context.getIndentation(title);
    const parentContent = context.getParentSection(depth, indent);
    context.builder.setCurrentNode(parentContent);
    const sectionNode = context.builder.createAndAppend("section", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    sectionNode.attributes.set("depth", String(depth));
    sectionNode.attributes.set("_indent", String(indent));
    sectionNode.attributes.set("_style", info.style);
    if (info.style === "underline") {
      sectionNode.attributes.set("_weight", String(sectionWeight));
    } else if (info.style === "numbered") {
      const sectionNumber = this.generateSectionNumber(context, depth);
      sectionNode.attributes.set("_number", sectionNumber);
    }
    const id = context.asKey(title, sectionNode);
    sectionNode.attributes.set("id", id);
    context.builder.pushNode(sectionNode);
    const titleEnd = titleStart + title.length;
    const titleNode = context.builder.createAndAppend("title", {}, {
      start,
      end,
      line: startLine,
      column: startColumn
    });
    const normalizedTitle = context.normaliseText(title);
    const textNode = createText(normalizedTitle, {
      start: titleStart,
      end: titleEnd,
      line: titleStartLine,
      column: titleStartColumn
    });
    titleNode.children.push(textNode);
    const contentNode = context.builder.createAndAppend("content", {}, {
      start: end,
      end,
      line: endLine,
      column: endColumn
    });
    contentNode.attributes.set("_indent", String(indent));
    context.builder.popNode();
    context.pushSection(sectionNode, contentNode, depth, indent);
    context.builder.pushNode(contentNode);
    return {
      consumed: end - start,
      node: sectionNode
    };
  }
  generateSectionNumber(context, depth) {
    const current = context.getCurrentSection();
    const parentContent = context.getParentSection(depth, 0);
    const siblings = parentContent.children.filter((c) => c.type === "element" && c.name === "section");
    const sectionIndex = siblings.length + 1;
    if (depth === 1) {
      return String(sectionIndex);
    }
    const parentNumber = current?.node.attributes.get("_number") || "";
    if (parentNumber) {
      return `${parentNumber}.${sectionIndex}`;
    }
    return String(sectionIndex);
  }
  calculateDepth(_title, weight, context) {
    const current = context.getCurrentSection();
    if (!current) {
      return 1;
    }
    let depth = current.depth + 1;
    if (weight === 2) {
      depth = Math.max(1, depth - 1);
    } else if (weight === 0) {
      depth = depth + 1;
    }
    return depth;
  }
}

export { SectionParser };
