// Parsing context for managing parser state
// Enhanced with offset management for recursive block parsing

import { DocumentBuilder, SectionEntry } from '../document/builder.ts';
import { Node, ParseError } from '../utils/types.ts';
import { expandTabs, getIndent, removeLeadingSpaces } from '../utils/indent.ts';
import { Cursor } from '../utils/cursor.ts';

export interface LinkEntry {
  node: Node;
  target: string;
  type: 'url' | 'ref';
}

export interface TargetEntry {
  node: Node;
  name: string;
}

export interface OffsetState {
  offset: number;
  blockStart: number;
  blockEnd: number;
  lineNumber: number;
  columnNumber: number;
}

export class ParsingContext {
  builder: DocumentBuilder;
  links: LinkEntry[] = [];
  targets: TargetEntry[] = [];
  errors: ParseError[] = [];
  keyIndex: Map<string, Node> = new Map();
  private tabSize: number = 4;

  // NEW: Text reference for offset-based parsing
  private text: string = '';

  // NEW: Offset management for recursive parsing
  private _offset: number = 0;
  private _blockStartOffset: number = 0;
  private _blockEndOffset: number = -1;
  private _lineNumber: number = 1;
  private _columnNumber: number = 0;

  // NEW: Cursor for character-based parsing (backward compatibility)
  private _cursor: Cursor | null = null;

  constructor(builder: DocumentBuilder, text?: string) {
    this.builder = builder;
    if (text !== undefined) {
      this.text = text;
    }
  }

  // NEW: Initialize with text
  setText(text: string): void {
    this.text = text;
    this._offset = 0;
    this._blockStartOffset = 0;
    this._blockEndOffset = text.length;
    this._lineNumber = 1;
    this._columnNumber = 0;
    this._cursor = new Cursor(text);
  }

  // NEW: Get current text
  getText(): string {
    return this.text;
  }

  // NEW: Get/set offset
  getOffset(): number {
    return this._offset;
  }

  setOffset(offset: number): void {
    this._offset = offset;
    // Update cursor to match
    if (this._cursor) {
      this._cursor.pos = offset;
      // Recalculate line/column
      let line = 1;
      let col = 0;
      for (let i = 0; i < offset && i < this.text.length; i++) {
        if (this.text[i] === '\n') {
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

  // NEW: Get cursor (for backward compatibility with existing parsers)
  getCursor(): Cursor {
    if (!this._cursor) {
      this._cursor = new Cursor(this.text);
      this._cursor.pos = this._offset;
    }
    return this._cursor;
  }

  // NEW: Set current block boundaries
  setCurrentBlock(start: number, end: number): void {
    this._blockStartOffset = start;
    this._blockEndOffset = end;
    this._offset = start;
  }

  // NEW: Get block boundaries
  getBlockStart(): number {
    return this._blockStartOffset;
  }

  getBlockEnd(): number {
    return this._blockEndOffset;
  }

  // NEW: Current text fragment (from offset to block end)
  currentFragment(): string {
    return this.text.slice(this._offset, this._blockEndOffset);
  }

  // NEW: Check if we're at block end
  isAtBlockEnd(): boolean {
    return this._offset >= this._blockEndOffset;
  }

  // NEW: Save current state for restoration
  saveOffsets(): OffsetState {
    return {
      offset: this._offset,
      blockStart: this._blockStartOffset,
      blockEnd: this._blockEndOffset,
      lineNumber: this._lineNumber,
      columnNumber: this._columnNumber
    };
  }

  // NEW: Restore saved state
  restoreOffsets(saved: OffsetState): void {
    this._offset = saved.offset;
    this._blockStartOffset = saved.blockStart;
    this._blockEndOffset = saved.blockEnd;
    this._lineNumber = saved.lineNumber;
    this._columnNumber = saved.columnNumber;

    // Sync cursor
    if (this._cursor) {
      this._cursor.pos = this._offset;
      this._cursor.lineNumber = this._lineNumber;
      this._cursor.columnNumber = this._columnNumber;
    }
  }

  // NEW: Advance offset by amount
  advanceOffset(amount: number = 1): void {
    this.setOffset(this._offset + amount);
  }

  getCurrentNode(): Node {
    return this.builder.getCurrentNode();
  }

  setCurrentNode(node: Node): void {
    this.builder.setCurrentNode(node);
  }

  addLink(node: Node, target: string, type: 'url' | 'ref'): void {
    this.links.push({ node, target, type });
  }

  addTarget(node: Node, name: string): void {
    this.targets.push({ node, name });
  }

  addError(message: string, line: number, column: number, severity: 'error' | 'warning' = 'error'): void {
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

  normaliseText(text: string): string {
    // Replace multiple whitespace with single space
    return text.replace(/[\s\n]+/g, ' ').trim();
  }

  expandTabs(text: string): string {
    return expandTabs(text, this.tabSize);
  }

  getIndentation(text: string): number {
    return getIndent(text, this.tabSize);
  }

  removeLeadingSpaces(text: string, max?: number): string {
    return removeLeadingSpaces(text, max);
  }

  asKey(text: string, node?: Node): string {
    // Create URL-safe key from text
    let key = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Handle duplicates
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

  pushSection(node: Node, content: Node, depth: number, indent: number): void {
    this.builder.pushSection(node, content, depth, indent);
  }

  getParentSection(depth: number, indent: number): Node {
    return this.builder.findParentSection(depth, indent);
  }

  getCurrentSection(): SectionEntry | null {
    return this.builder.getCurrentSection();
  }

  // NEW: Count leading spaces at current offset
  countIndentAtOffset(offset?: number): number {
    const pos = offset !== undefined ? offset : this._offset;
    let indent = 0;
    while (pos + indent < this.text.length) {
      const char = this.text[pos + indent];
      if (char === ' ') {
        indent++;
      } else if (char === '\t') {
        indent += this.tabSize;
      } else {
        break;
      }
    }
    return indent;
  }

  // NEW: Find next newline from current offset
  findNextNewline(): number {
    const index = this.text.indexOf('\n', this._offset);
    return index === -1 ? this.text.length : index;
  }

  // NEW: Read line at current offset
  readLineAtOffset(): string {
    const end = this.findNextNewline();
    const line = this.text.slice(this._offset, end);
    this._offset = end;
    if (this.text[this._offset] === '\n') {
      this._offset++;
      this._lineNumber++;
      this._columnNumber = 0;
    }
    return line;
  }

  clone(): ParsingContext {
    const clone = new ParsingContext(this.builder, this.text);
    clone.links = [...this.links];
    clone.targets = [...this.targets];
    clone.errors = [...this.errors];
    clone.keyIndex = new Map(this.keyIndex);
    clone.tabSize = this.tabSize;

    // Clone offset state
    clone._offset = this._offset;
    clone._blockStartOffset = this._blockStartOffset;
    clone._blockEndOffset = this._blockEndOffset;
    clone._lineNumber = this._lineNumber;
    clone._columnNumber = this._columnNumber;

    return clone;
  }
}
