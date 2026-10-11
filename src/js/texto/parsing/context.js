import { Cursor } from "../utils/cursor.js";
import { expandTabs, getIndent, removeLeadingSpaces } from "../utils/indent.js";

class ParsingContext {
  builder;
  parser = null;
  links = [];
  targets = [];
  errors = [];
  keyIndex = new Map;
  tabSize = 4;
  text = "";
  _offset = 0;
  _blockStartOffset = 0;
  _blockEndOffset = -1;
  _lineNumber = 1;
  _columnNumber = 0;
  _nextBlockNumber = 0;
  _cursor = null;
  constructor(builder, text) {
    this.builder = builder;
    if (text !== undefined) {
      this.text = text;
    }
  }
  setParser(parser) {
    this.parser = parser;
  }
  setText(text) {
    this.text = text;
    this._offset = 0;
    this._blockStartOffset = 0;
    this._blockEndOffset = text.length;
    this._lineNumber = 1;
    this._columnNumber = 0;
    this._nextBlockNumber = 0;
    this._cursor = new Cursor(text);
  }
  getNextBlockNumber() {
    const current = this._nextBlockNumber;
    this._nextBlockNumber += 1;
    return current;
  }
  getText() {
    return this.text;
  }
  getOffset() {
    return this._offset;
  }
  setOffset(offset) {
    this._offset = offset;
    if (this._cursor) {
      this._cursor.pos = offset;
      let line = 1;
      let col = 0;
      for (let i = 0;i < offset && i < this.text.length; i++) {
        if (this.text[i] === `
`) {
          line++;
          col = 0;
        } else {
          col++;
        }
      }
      this._cursor.lineNumber = line;
      this._cursor.columnNumber = col;
    }
  }
  getCursor() {
    if (!this._cursor) {
      this._cursor = new Cursor(this.text);
      this._cursor.pos = this._offset;
    }
    return this._cursor;
  }
  setCurrentBlock(start, end) {
    this._blockStartOffset = start;
    this._blockEndOffset = end;
    this._offset = start;
  }
  getBlockStart() {
    return this._blockStartOffset;
  }
  getBlockEnd() {
    return this._blockEndOffset;
  }
  currentFragment() {
    return this.text.slice(this._offset, this._blockEndOffset);
  }
  isAtBlockEnd() {
    return this._offset >= this._blockEndOffset;
  }
  saveOffsets() {
    return {
      offset: this._offset,
      blockStart: this._blockStartOffset,
      blockEnd: this._blockEndOffset,
      lineNumber: this._lineNumber,
      columnNumber: this._columnNumber
    };
  }
  restoreOffsets(saved) {
    this._offset = saved.offset;
    this._blockStartOffset = saved.blockStart;
    this._blockEndOffset = saved.blockEnd;
    this._lineNumber = saved.lineNumber;
    this._columnNumber = saved.columnNumber;
    if (this._cursor) {
      this._cursor.pos = this._offset;
      this._cursor.lineNumber = this._lineNumber;
      this._cursor.columnNumber = this._columnNumber;
    }
  }
  advanceOffset(amount = 1) {
    this.setOffset(this._offset + amount);
  }
  getCurrentNode() {
    return this.builder.getCurrentNode();
  }
  setCurrentNode(node) {
    this.builder.setCurrentNode(node);
  }
  addLink(node, target, type) {
    this.links.push({ node, target, type });
  }
  addTarget(node, name) {
    this.targets.push({ node, name });
  }
  addError(message, line, column, severity = "error") {
    this.errors.push({
      message,
      position: {
        start: 0,
        end: 0,
        line,
        column
      },
      severity
    });
  }
  normaliseText(text) {
    return text.replace(/[\s\n]+/g, " ").trim();
  }
  expandTabs(text) {
    return expandTabs(text, this.tabSize);
  }
  getIndentation(text) {
    return getIndent(text, this.tabSize);
  }
  removeLeadingSpaces(text, max) {
    return removeLeadingSpaces(text, max);
  }
  asKey(text, node) {
    let key = text.toLowerCase().trim().replace(/[^a-z0-9\-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (this.keyIndex.has(key)) {
      let i = 1;
      let newKey = key;
      while (this.keyIndex.has(newKey)) {
        newKey = `${key}-${i}`;
        i++;
      }
      key = newKey;
    }
    if (node) {
      this.keyIndex.set(key, node);
    }
    return key;
  }
  pushSection(node, content, depth, indent) {
    this.builder.pushSection(node, content, depth, indent);
  }
  getParentSection(depth, indent) {
    return this.builder.findParentSection(depth, indent);
  }
  getCurrentSection() {
    return this.builder.getCurrentSection();
  }
  countIndentAtOffset(offset) {
    const pos = offset !== undefined ? offset : this._offset;
    let indent = 0;
    while (pos + indent < this.text.length) {
      const char = this.text[pos + indent];
      if (char === " ") {
        indent++;
      } else if (char === "\t") {
        indent += this.tabSize;
      } else {
        break;
      }
    }
    return indent;
  }
  findNextNewline() {
    const index = this.text.indexOf(`
`, this._offset);
    return index === -1 ? this.text.length : index;
  }
  readLineAtOffset() {
    const end = this.findNextNewline();
    const line = this.text.slice(this._offset, end);
    this._offset = end;
    if (this.text[this._offset] === `
`) {
      this._offset++;
      this._lineNumber++;
      this._columnNumber = 0;
    }
    return line;
  }
  clone() {
    const clone = new ParsingContext(this.builder, this.text);
    clone.links = [...this.links];
    clone.targets = [...this.targets];
    clone.errors = [...this.errors];
    clone.keyIndex = new Map(this.keyIndex);
    clone.tabSize = this.tabSize;
    clone._offset = this._offset;
    clone._blockStartOffset = this._blockStartOffset;
    clone._blockEndOffset = this._blockEndOffset;
    clone._lineNumber = this._lineNumber;
    clone._columnNumber = this._columnNumber;
    clone._nextBlockNumber = this._nextBlockNumber;
    return clone;
  }
}

export { ParsingContext };
