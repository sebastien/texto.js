class BaseBlockParser {
  name;
  priority;
  constructor(name, priority = 20) {
    this.name = name;
    this.priority = priority;
  }
  skipLeadingWhitespace(cursor) {
    while (cursor.current() === " " || cursor.current() === "\t") {
      cursor.advance();
    }
  }
  isBlankLine(cursor) {
    const saved = cursor.clone();
    this.skipLeadingWhitespace(cursor);
    const result = cursor.current() === `
` || cursor.current() === null;
    cursor.pos = saved.pos;
    cursor.lineNumber = saved.lineNumber;
    cursor.columnNumber = saved.columnNumber;
    return result;
  }
}

export { BaseBlockParser };
