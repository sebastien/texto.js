import { createElement, createText } from "../../document/node.js";
import { BLOCK_PRIORITIES } from "../../parsing/priority.js";
import { BaseBlockParser } from "./base.js";

class DefinitionListParser extends BaseBlockParser {
  constructor() {
    super("definition-list", BLOCK_PRIORITIES.DEFINITION);
  }
  recognises(cursor, _context) {
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    let hasTermContent = false;
    while (cursor.current() !== null && cursor.current() !== `
`) {
      if (cursor.current() === ":" && cursor.peek(1) === ":") {
        if (cursor.peek(2) !== ":") {
          cursor.advance(2);
          let onlyWhitespaceAfter = true;
          while (cursor.current() !== null && cursor.current() !== `
`) {
            if (cursor.current() !== " " && cursor.current() !== "\t") {
              onlyWhitespaceAfter = false;
              break;
            }
            cursor.advance();
          }
          if (hasTermContent && onlyWhitespaceAfter) {
            cursor.pos = save.pos;
            cursor.lineNumber = save.lineNumber;
            cursor.columnNumber = save.columnNumber;
            return { type: "definition-list" };
          }
          break;
        }
      }
      if (cursor.current() !== " " && cursor.current() !== "\t" && cursor.current() !== ":") {
        hasTermContent = true;
      }
      cursor.advance();
    }
    cursor.pos = save.pos;
    cursor.lineNumber = save.lineNumber;
    cursor.columnNumber = save.columnNumber;
    return null;
  }
  process(cursor, context, _info) {
    const start = cursor.pos;
    const startLine = cursor.lineNumber;
    const startColumn = cursor.columnNumber;
    const startIndent = this.countIndent(cursor);
    const listNode = context.builder.createAndAppend("list", {}, { start, end: start, line: startLine, column: startColumn });
    listNode.attributes.set("type", "definition");
    listNode.attributes.set("_indent", String(startIndent));
    context.builder.pushNode(listNode);
    let iterations = 0;
    const maxIterations = 50;
    while (!cursor.isAtEnd() && iterations < maxIterations) {
      iterations++;
      const itemInfo = this.recognises(cursor, context);
      if (!itemInfo)
        break;
      this.processItem(cursor, context);
      cursor.skipNewlines();
    }
    const end = cursor.pos;
    listNode.position = { start, end, line: startLine, column: startColumn };
    context.builder.popNode();
    return {
      consumed: end - start,
      node: listNode
    };
  }
  processItem(cursor, context) {
    const itemStart = cursor.pos;
    const itemStartLine = cursor.lineNumber;
    const itemStartColumn = cursor.columnNumber;
    const save = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const itemIndent = cursor.pos - save.pos;
    let term = "";
    const termStart = cursor.pos;
    const termStartLine = cursor.lineNumber;
    const termStartColumn = cursor.columnNumber;
    while (cursor.current() !== null && cursor.current() !== `
` && !(cursor.current() === ":" && cursor.peek(1) === ":" && cursor.peek(2) !== ":")) {
      term += cursor.current();
      cursor.advance();
    }
    term = term.trim();
    const termEnd = cursor.pos;
    if (cursor.current() === ":" && cursor.peek(1) === ":") {
      cursor.advance(2);
    }
    while (cursor.current() === " " || cursor.current() === "\t") {
      cursor.advance();
    }
    if (cursor.current() === `
`) {
      cursor.skipNewlines();
    }
    const itemNode = context.builder.createAndAppend("item", {}, {
      start: itemStart,
      end: itemStart,
      line: itemStartLine,
      column: itemStartColumn
    });
    itemNode.attributes.set("_indent", String(itemIndent));
    context.builder.pushNode(itemNode);
    const termNode = createElement("term", {}, {
      start: termStart,
      end: termEnd,
      line: termStartLine,
      column: termStartColumn
    });
    termNode.children.push(createText(term, {
      start: termStart,
      end: termEnd,
      line: termStartLine,
      column: termStartColumn
    }));
    itemNode.children.push(termNode);
    let definition = "";
    const defStart = cursor.pos;
    let defIterations = 0;
    const maxDefIterations = 50;
    while (!cursor.isAtEnd() && defIterations < maxDefIterations) {
      defIterations++;
      const lineStartSave = cursor.clone();
      const currentIndent = this.countIndent(cursor);
      if (currentIndent <= itemIndent) {
        if (this.recognises(cursor, context)) {
          break;
        }
        cursor.pos = lineStartSave.pos;
        cursor.lineNumber = lineStartSave.lineNumber;
        cursor.columnNumber = lineStartSave.columnNumber;
        break;
      }
      cursor.pos = lineStartSave.pos;
      cursor.lineNumber = lineStartSave.lineNumber;
      cursor.columnNumber = lineStartSave.columnNumber;
      const line = cursor.readLine();
      if (cursor.current() === "\r") {
        cursor.advance();
        if (cursor.current() === `
`) {
          cursor.advance();
        }
      } else if (cursor.current() === `
`) {
        cursor.advance();
      }
      if (currentIndent > itemIndent) {
        definition += line.slice(currentIndent);
      } else {
        definition += line.trim();
      }
      if (cursor.isAtEnd())
        break;
      definition += `
`;
    }
    const itemEnd = cursor.pos;
    itemNode.position = {
      start: itemStart,
      end: itemEnd,
      line: itemStartLine,
      column: itemStartColumn
    };
    definition = context.normaliseText(definition).trim();
    if (definition) {
      const defEnd = Math.min(defStart + definition.length, itemEnd);
      const defStartLine = cursor.lineNumber;
      const defStartColumn = cursor.columnNumber;
      const defNode = createElement("definition", {}, {
        start: defStart,
        end: defEnd,
        line: defStartLine,
        column: defStartColumn
      });
      defNode.children.push(createText(definition, {
        start: defStart,
        end: defEnd,
        line: defStartLine,
        column: defStartColumn
      }));
      itemNode.children.push(defNode);
    }
    context.builder.popNode();
    return itemNode;
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

export { DefinitionListParser };
