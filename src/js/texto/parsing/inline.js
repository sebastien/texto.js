class InlineParsingEngine {
  registry;
  constructor(registry) {
    this.registry = registry;
  }
  parseInlines(cursor, context, _parent, endOffset, baseOffset = 0) {
    const ordered = this.registry.getOrdered();
    while (cursor.pos < endOffset) {
      const matchInfo = this.findNextMatch(cursor, context, ordered, endOffset);
      if (!matchInfo) {
        const remainingText = cursor.slice(cursor.pos, endOffset);
        if (remainingText) {
          const absStart = baseOffset + cursor.pos;
          const absEnd = baseOffset + endOffset;
          const currentPos = cursor.getPosition();
          context.builder.addText(remainingText, {
            start: absStart,
            end: absEnd,
            line: currentPos.line,
            column: currentPos.column
          });
        }
        break;
      }
      const { parser, match, isAtCurrentPos } = matchInfo;
      if (isAtCurrentPos) {
        const adjustedMatch = {
          ...match,
          start: baseOffset + match.start,
          end: baseOffset + match.end
        };
        const newOffset = parser.parse(cursor, context, adjustedMatch);
        cursor.pos = newOffset - baseOffset;
      } else {
        const beforeText = cursor.slice(cursor.pos, match.start);
        if (beforeText) {
          const absStart = baseOffset + cursor.pos;
          const absEnd = baseOffset + match.start;
          const currentPos = cursor.getPosition();
          context.builder.addText(beforeText, {
            start: absStart,
            end: absEnd,
            line: currentPos.line,
            column: currentPos.column
          });
        }
        cursor.pos = match.start;
      }
    }
  }
  findNextMatch(cursor, context, parsers, blockEnd) {
    const realParsers = [];
    let fallbackParser = null;
    for (const parser of parsers) {
      if (parser.name === "text") {
        fallbackParser = parser;
      } else {
        realParsers.push(parser);
      }
    }
    let bestMatch = null;
    let bestPosition = 1 / 0;
    let bestPriority = 1 / 0;
    for (const parser of realParsers) {
      const save = cursor.clone();
      const match = parser.findNext(cursor, context);
      if (match && match.start >= cursor.pos && match.start < blockEnd) {
        if (match.start < bestPosition || match.start === bestPosition && parser.priority < bestPriority) {
          bestPosition = match.start;
          bestPriority = parser.priority;
          bestMatch = { parser, match };
        }
      }
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
    }
    if (bestMatch) {
      const isAtCurrentPos = bestMatch.match.start === cursor.pos;
      return { ...bestMatch, isAtCurrentPos };
    }
    if (fallbackParser) {
      const save = cursor.clone();
      const match = fallbackParser.findNext(cursor, context);
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
      if (match && match.start >= cursor.pos && match.start < blockEnd) {
        return { parser: fallbackParser, match, isAtCurrentPos: true };
      }
    }
    return null;
  }
  normaliseWhitespace(text) {
    return text.replace(/\t/g, " ").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  }
}

export { InlineParsingEngine };
