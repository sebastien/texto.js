class Cursor {
  buffer;
  _position;
  _line;
  _column;
  constructor(buffer, startOffset = 0) {
    this.buffer = buffer;
    this._position = startOffset;
    this._line = 1;
    this._column = 0;
  }
  get text() {
    return this.buffer;
  }
  get length() {
    return this.buffer.length;
  }
  get pos() {
    return this._position;
  }
  set pos(value) {
    this._position = value;
  }
  get lineNumber() {
    return this._line;
  }
  set lineNumber(value) {
    this._line = value;
  }
  get columnNumber() {
    return this._column;
  }
  set columnNumber(value) {
    this._column = value;
  }
  peek(offset = 0) {
    const idx = this._position + offset;
    if (idx < 0 || idx >= this.buffer.length) {
      return null;
    }
    return this.buffer[idx];
  }
  current() {
    return this.peek(0);
  }
  lookahead(n) {
    let result = "";
    for (let i = 0;i < n; i++) {
      const char = this.peek(i);
      if (char === null)
        break;
      result += char;
    }
    return result;
  }
  advance(count = 1) {
    for (let i = 0;i < count; i++) {
      const char = this.peek();
      if (char === null)
        break;
      this._position++;
      if (char === `
`) {
        this._line++;
        this._column = 0;
      } else {
        this._column++;
      }
    }
  }
  retreat(count = 1) {
    for (let i = 0;i < count; i++) {
      if (this._position <= 0)
        break;
      this._position--;
      const char = this.peek();
      if (char === `
`) {
        this._line--;
        let col = 0;
        let j = this._position - 1;
        while (j >= 0 && this.buffer[j] !== `
`) {
          col++;
          j--;
        }
        this._column = col;
      } else {
        this._column = Math.max(0, this._column - 1);
      }
    }
  }
  match(str) {
    if (this._position + str.length > this.buffer.length) {
      return false;
    }
    for (let i = 0;i < str.length; i++) {
      if (this.buffer[this._position + i] !== str[i]) {
        return false;
      }
    }
    return true;
  }
  skipWhitespace() {
    while (this._position < this.buffer.length) {
      const char = this.buffer[this._position];
      if (char !== " " && char !== "\t" && char !== "\r") {
        break;
      }
      this.advance();
    }
  }
  skipNewlines() {
    while (this._position < this.buffer.length) {
      const char = this.buffer[this._position];
      if (char !== `
` && char !== "\r") {
        break;
      }
      this.advance();
    }
  }
  readUntil(predicate) {
    let result = "";
    while (this._position < this.buffer.length) {
      const char = this.buffer[this._position];
      if (predicate(char)) {
        break;
      }
      result += char;
      this.advance();
    }
    return result;
  }
  readLine() {
    const line = this.readUntil((char) => char === `
` || char === "\r");
    if (this.current() === "\r") {
      this.advance();
      if (this.current() === `
`) {
        this.advance();
      }
    } else if (this.current() === `
`) {
      this.advance();
    }
    return line;
  }
  slice(start, end) {
    return this.buffer.slice(start, end);
  }
  isAtEnd() {
    return this._position >= this.buffer.length;
  }
  getPosition() {
    return {
      start: this._position,
      end: this._position,
      line: this._line,
      column: this._column
    };
  }
  getPositionRange(startOffset, endOffset) {
    let line = this._line;
    let column = this._column;
    for (let i = this._position - 1;i >= startOffset && i >= 0; i--) {
      if (this.buffer[i] === `
`) {
        line--;
        column = 0;
        let j = i + 1;
        while (j < this._position && this.buffer[j] !== `
`) {
          column++;
          j++;
        }
      }
    }
    const end = endOffset !== undefined ? endOffset : this._position;
    const _endLine = end === this._position ? this._line : line;
    const _endColumn = end === this._position ? this._column : column + (end - startOffset);
    return {
      start: startOffset,
      end,
      line,
      column
    };
  }
  clone() {
    const clone = new Cursor(this.buffer, this._position);
    clone._line = this._line;
    clone._column = this._column;
    return clone;
  }
}

export { Cursor };
