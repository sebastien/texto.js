import { createElement, createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class ListParser extends BaseBlockParser {
  stripContinuationIndent;
  orderedMarker;
  includeBoundaryBlankLine;
  constructor(priorityOrOptions) {
    const options = typeof priorityOrOptions === "number" ? { priority: priorityOrOptions } : priorityOrOptions ?? {};
    super("list", options.priority ?? BLOCK_PRIORITIES.LIST);
    this.stripContinuationIndent = options.stripContinuationIndent ?? false;
    this.orderedMarker = options.orderedMarker ?? "both";
    this.includeBoundaryBlankLine = options.includeBoundaryBlankLine ?? true;
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const current = cursor.current();
    const next = cursor.peek(1);
    if ((current === "-" || current === "*" || current === "+") && (next === " " || next === "\t")) {
      const boxOpen = cursor.peek(2);
      const boxState = cursor.peek(3);
      const boxClose = cursor.peek(4);
      const afterBox = cursor.peek(5);
      if (boxOpen === "[" && boxClose === "]" && (boxState === " " || boxState === "x" || boxState === "X") && (afterBox === " " || afterBox === "\t")) {
        cursor.pos = save.pos;
        cursor.lineNumber = save.lineNumber;
        cursor.columnNumber = save.columnNumber;
        const checked = boxState === "x" || boxState === "X";
        return { type: "list", listType: "todo", checked, markerWidth: 6 };
      }
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      return { type: "list", listType: "unordered", markerWidth: 2 };
    }
    if (/[0-9a-zA-Z]/.test(current || "")) {
      let numEnd = 1;
      while (/[0-9a-zA-Z]/.test(cursor.peek(numEnd) || "")) {
        numEnd++;
      }
      const marker = cursor.peek(numEnd);
      const orderedMarkerAllowed = this.orderedMarker === "both" || this.orderedMarker === marker;
      if (orderedMarkerAllowed && (marker === ")" || marker === ".") && (cursor.peek(numEnd + 1) === " " || cursor.peek(numEnd + 1) === "\t")) {
        cursor.pos = save.pos;
        cursor.lineNumber = save.lineNumber;
        cursor.columnNumber = save.columnNumber;
        return {
          type: "list",
          listType: "ordered",
          markerWidth: numEnd + 2
        };
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
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const firstIndent = cursor.pos - save.pos;
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    const listNode = context.builder.createAndAppend("list", {}, {
      start,
      end: start,
      line: startLine,
      column: startColumn
    });
    listNode.attributes.set("_indent", String(firstIndent));
    listNode.attributes.set("type", info.listType);
    context.builder.pushNode(listNode);
    let iterations = 0;
    const maxIterations = 100;
    let hasLooseItem = false;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const itemInfo = this.recognises(cursor, context);
      if (!itemInfo) {
        break;
      }
      const _itemSave = cursor.clone();
      const itemIndent = this.countIndent(cursor);
      if (itemIndent < firstIndent - 2) {
        break;
      }
      const itemNode = this.processItem(cursor, context, itemInfo, firstIndent, engine);
      if (itemNode.attributes.get("_hasBlock") === "true") {
        hasLooseItem = true;
      }
      cursor.skipNewlines();
    }
    const end = cursor.pos;
    if (hasLooseItem) {
      this.makeListLoose(listNode);
    }
    for (const child of listNode.children) {
      if (child.type === "element" && child.name === "item") {
        child.attributes.delete("_hasBlock");
      }
    }
    listNode.position = { start, end, line: startLine, column: startColumn };
    context.builder.popNode();
    return {
      consumed: end - start,
      node: listNode
    };
  }
  processItem(cursor, context, info, listIndent, engine) {
    const itemStart = cursor.pos;
    const itemStartLine = cursor.lineNumber;
    const itemStartColumn = cursor.columnNumber;
    this.skipLeadingWhitespace(cursor);
    const indent = cursor.pos - itemStart;
    const contentStart = this.getContentStart(cursor, info);
    const contentStartLine = cursor.lineNumber;
    const contentStartColumn = cursor.columnNumber;
    const itemEnd = this.findItemEnd(cursor, context, listIndent);
    const itemNode = context.builder.createAndAppend("item", {}, {
      start: itemStart,
      end: itemEnd,
      line: itemStartLine,
      column: itemStartColumn
    });
    itemNode.attributes.set("_indent", String(indent));
    if (info.listType === "todo") {
      itemNode.attributes.set("todo", info.checked ? "done" : "true");
    }
    context.builder.pushNode(itemNode);
    const hasBlockContent = this.hasBlockContent(context.getText(), contentStart, itemEnd);
    itemNode.attributes.set("_hasBlock", hasBlockContent ? "true" : "false");
    if (contentStart < itemEnd && hasBlockContent) {
      const parsedChildren = this.parseItemBlocks(context, contentStart, itemEnd);
      if (parsedChildren) {
        itemNode.children.push(...parsedChildren);
      } else if (engine) {
        engine.parseBlocksInRange(context, itemNode, contentStart, itemEnd);
      }
    } else {
      const content = this.readItemContent(cursor, contentStart, itemEnd, context, this.getContinuationStripWidth(info));
      if (content) {
        if (context.parser) {
          context.parser.parseInlines(content, itemNode, context, contentStart);
        } else {
          const textNode = createText(content, {
            start: contentStart,
            end: itemEnd,
            line: contentStartLine,
            column: contentStartColumn
          });
          itemNode.children.push(textNode);
        }
      }
    }
    context.builder.popNode();
    cursor.pos = itemEnd;
    return itemNode;
  }
  makeListLoose(listNode) {
    for (const child of listNode.children) {
      if (child.type !== "element" || child.name !== "item") {
        continue;
      }
      const hasElementChildren = child.children.some((n) => n.type === "element");
      if (hasElementChildren) {
        child.attributes.delete("_hasBlock");
        continue;
      }
      const paragraph = createElement("paragraph");
      paragraph.children = child.children;
      child.children = [paragraph];
      child.attributes.delete("_hasBlock");
    }
  }
  parseItemBlocks(context, contentStart, itemEnd) {
    if (!context.parser) {
      return null;
    }
    const raw = context.getText().slice(contentStart, itemEnd);
    const normalized = this.normalizeItemContentForBlocks(raw);
    if (!normalized.trim()) {
      return [];
    }
    const parsed = context.parser.parse(normalized);
    return parsed.content.children;
  }
  normalizeItemContentForBlocks(raw) {
    const normalizedNewlines = raw.replace(/\r\n/g, `
`);
    const lines = normalizedNewlines.split(`
`);
    if (lines.length === 0) {
      return "";
    }
    const [first, ...rest] = lines;
    const normalizedRest = rest.map((line) => this.stripListContinuationIndent(line));
    let lastNonBlank = normalizedRest.length - 1;
    while (lastNonBlank >= 0 && normalizedRest[lastNonBlank] === "") {
      lastNonBlank--;
    }
    const trimmedRest = normalizedRest.slice(0, lastNonBlank + 1);
    return [first, ...trimmedRest].join(`
`);
  }
  stripListContinuationIndent(line) {
    let index = 0;
    let removedColumns = 0;
    while (index < line.length && removedColumns < 4) {
      const char = line[index];
      if (char === " ") {
        removedColumns++;
        index++;
        continue;
      }
      if (char === "\t") {
        removedColumns = 4;
        index++;
        continue;
      }
      break;
    }
    return line.slice(index);
  }
  getContentStart(cursor, info) {
    const save = cursor.clone();
    const markerWidth = this.getMarkerWidth(info);
    if (markerWidth > 0) {
      cursor.advance(markerWidth);
    }
    const contentStart = cursor.pos;
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return contentStart;
  }
  findItemEnd(cursor, context, listIndent) {
    const startPos = cursor.pos;
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    if (cursor.current() === "-" || cursor.current() === "*" || cursor.current() === "+") {
      cursor.advance(2);
    } else if (cursor.current() === "[") {
      cursor.advance(4);
    } else {
      while (/[0-9a-zA-Z]/.test(cursor.current() || "")) {
        cursor.advance();
      }
      cursor.advance(2);
    }
    let itemEnd = cursor.pos;
    let iterations = 0;
    const maxIterations = 200;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      while (cursor.current() !== null && cursor.current() !== `
`) {
        cursor.advance();
      }
      const lineEnd = cursor.pos;
      if (cursor.isAtEnd()) {
        itemEnd = lineEnd;
        break;
      }
      cursor.advance();
      const lineEndWithNewline = cursor.pos;
      const lineStartSave = cursor.clone();
      const lineIndent = this.countIndent(cursor);
      if (lineIndent < listIndent && !this.isLineBlank(cursor)) {
        cursor.pos = lineStartSave.pos;
        cursor.lineNumber = lineStartSave.lineNumber;
        cursor.columnNumber = lineStartSave.columnNumber;
        itemEnd = lineEndWithNewline;
        break;
      }
      if (lineIndent <= listIndent + 2) {
        const recognitionSave = cursor.clone();
        if (this.recognises(cursor, context)) {
          cursor.pos = recognitionSave.pos;
          cursor.lineNumber = recognitionSave.lineNumber;
          cursor.columnNumber = recognitionSave.columnNumber;
          itemEnd = lineEndWithNewline;
          break;
        }
        cursor.pos = recognitionSave.pos;
        cursor.lineNumber = recognitionSave.lineNumber;
        cursor.columnNumber = recognitionSave.columnNumber;
      }
      if (lineIndent <= listIndent && !this.isLineBlank(cursor)) {
        const recognitionSave = cursor.clone();
        const isListItem = this.recognises(cursor, context);
        if (!isListItem) {
          cursor.pos = recognitionSave.pos;
          let isTaggedBlock = false;
          if (/[A-Z]/.test(cursor.current() || "")) {
            while (/[a-zA-Z0-9]/.test(cursor.current() || "")) {
              cursor.advance();
            }
            let underscoreCount = 0;
            while (cursor.current() === "_") {
              underscoreCount++;
              cursor.advance();
            }
            if (underscoreCount >= 3 && (cursor.current() === `
` || cursor.current() === "\r" || cursor.current() === null)) {
              isTaggedBlock = true;
            }
          }
          cursor.pos = recognitionSave.pos;
          cursor.lineNumber = recognitionSave.lineNumber;
          cursor.columnNumber = recognitionSave.columnNumber;
          if (!isTaggedBlock) {
            itemEnd = lineEndWithNewline;
            break;
          }
        }
        cursor.pos = recognitionSave.pos;
        cursor.lineNumber = recognitionSave.lineNumber;
        cursor.columnNumber = recognitionSave.columnNumber;
      }
      itemEnd = cursor.pos;
    }
    cursor.pos = startPos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return itemEnd;
  }
  readItemContent(cursor, contentStart, itemEnd, context, markerWidth) {
    const text = context.getText();
    cursor.pos = contentStart;
    const content = text.slice(contentStart, itemEnd);
    if (!this.stripContinuationIndent) {
      return content.trim();
    }
    const normalized = content.replace(/\r\n/g, `
`);
    const lines = normalized.split(`
`);
    if (lines.length <= 1) {
      return normalized.trim();
    }
    const [first, ...rest] = lines;
    const cleaned = rest.map((line) => this.stripIndentColumns(line, markerWidth));
    return [first, ...cleaned].join(`
`).trim();
  }
  stripIndentColumns(line, maxColumns) {
    if (maxColumns <= 0) {
      return line;
    }
    return line.trimStart();
  }
  getMarkerWidth(info) {
    const markerWidth = info.markerWidth;
    if (typeof markerWidth === "number" && markerWidth > 0) {
      return markerWidth;
    }
    if (info.listType === "todo") {
      return 4;
    }
    if (info.listType === "ordered") {
      return 3;
    }
    return 2;
  }
  getContinuationStripWidth(info) {
    if (!this.stripContinuationIndent) {
      return 0;
    }
    return this.getMarkerWidth(info);
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
  isLineBlank(cursor) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const result = cursor.current() === `
` || cursor.current() === null;
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return result;
  }
  hasBlockContent(text, startOffset, endOffset) {
    const scanEnd = this.includeBoundaryBlankLine ? Math.min(text.length, endOffset + 1) : endOffset;
    const content = text.slice(startOffset, scanEnd);
    return /\r?\n[ \t]*\r?\n/.test(content);
  }
}

export { ListParser };
