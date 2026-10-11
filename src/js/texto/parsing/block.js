class BlockParsingEngine {
  registry;
  defaultParser;
  constructor(registry, defaultParser) {
    this.registry = registry;
    this.defaultParser = defaultParser;
  }
  processBlock(cursor, context) {
    const _startPos = cursor.pos;
    const ordered = this.registry.getOrdered();
    let recognised = null;
    for (const parser of ordered) {
      const save = cursor.clone();
      const info = parser.recognises(cursor, context);
      if (info) {
        recognised = { parser, info };
        break;
      }
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
    }
    if (!recognised) {
      const save = cursor.clone();
      const info = this.defaultParser.recognises(cursor, context);
      if (info) {
        recognised = { parser: this.defaultParser, info };
      }
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
    }
    if (!recognised) {
      throw new Error("No parser could recognise block");
    }
    const result = recognised.parser.process(cursor, context, recognised.info);
    return result;
  }
  processBlockAt(context) {
    const text = context.getText();
    const startOffset = context.getOffset();
    const savedState = context.saveOffsets();
    const cursor = context.getCursor();
    cursor.pos = startOffset;
    const ordered = this.registry.getOrdered();
    let recognised = null;
    for (const parser of ordered) {
      const save = cursor.clone();
      const info = parser.recognises(cursor, context);
      if (info) {
        recognised = { parser, info };
        break;
      }
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
    }
    if (!recognised) {
      const save = cursor.clone();
      const info = this.defaultParser.recognises(cursor, context);
      if (info) {
        recognised = { parser: this.defaultParser, info };
      }
      cursor.pos = save.pos;
      cursor.lineNumber = save.lineNumber;
      cursor.columnNumber = save.columnNumber;
    }
    if (!recognised) {
      context.restoreOffsets(savedState);
      return null;
    }
    let blockEnd;
    if (recognised.info.type === "tagged") {
      blockEnd = this.findTaggedBlockEnd(text, startOffset);
    } else if (recognised.info.type === "blockquote") {
      blockEnd = this.findBlockquoteEnd(text, startOffset);
    } else {
      blockEnd = this.findBlockEnd(text, startOffset);
    }
    blockEnd = Math.min(blockEnd, context.getBlockEnd());
    context.setCurrentBlock(startOffset, blockEnd);
    const result = recognised.parser.process(cursor, context, recognised.info, this);
    if (result?.node?.position && !this.isIgnoredMarkupBlock(recognised.info)) {
      result.node.position.block = context.getNextBlockNumber();
    }
    context.restoreOffsets(savedState);
    return result;
  }
  isIgnoredMarkupBlock(info) {
    const type = info.type;
    return type === "markup" || type === "html";
  }
  findTaggedBlockEnd(text, startOffset) {
    let pos = startOffset;
    let openingIndent = 0;
    while (pos < text.length && text[pos] !== `
`) {
      if (text[pos] === " ") {
        openingIndent++;
      } else if (text[pos] === "\t") {
        openingIndent += 4;
      } else {
        break;
      }
      pos++;
    }
    if (pos < text.length && text[pos] === `
`) {
      pos++;
    }
    while (pos < text.length) {
      const _lineStart = pos;
      let lineIndent = 0;
      while (pos < text.length && (text[pos] === " " || text[pos] === "\t")) {
        if (text[pos] === " ") {
          lineIndent++;
        } else {
          lineIndent += 4;
        }
        pos++;
      }
      let underscoreCount = 0;
      while (pos < text.length && text[pos] === "_") {
        underscoreCount++;
        pos++;
      }
      while (pos < text.length && (text[pos] === " " || text[pos] === "\t")) {
        pos++;
      }
      if (lineIndent === openingIndent && underscoreCount >= 3 && (pos >= text.length || text[pos] === `
` || text[pos] === "\r")) {
        if (pos < text.length && text[pos] === "\r")
          pos++;
        if (pos < text.length && text[pos] === `
`)
          pos++;
        return pos;
      }
      while (pos < text.length && text[pos] !== `
`) {
        pos++;
      }
      if (pos < text.length && text[pos] === `
`) {
        pos++;
      }
    }
    return text.length;
  }
  parseBlocksInRange(context, parentNode, startOffset, endOffset) {
    const savedOffsets = context.saveOffsets();
    const savedNode = context.getCurrentNode();
    context.setCurrentBlock(startOffset, endOffset);
    context.setCurrentNode(parentNode);
    let iterations = 0;
    const maxIterations = endOffset - startOffset + 100;
    while (!context.isAtBlockEnd() && iterations < maxIterations) {
      iterations++;
      this.skipBlankLinesInContext(context);
      if (context.isAtBlockEnd())
        break;
      const offsetBefore = context.getOffset();
      const result = this.processBlockAt(context);
      if (result && result.consumed > 0) {
        context.setOffset(offsetBefore + result.consumed);
      } else {
        context.advanceOffset(1);
      }
    }
    context.restoreOffsets(savedOffsets);
    context.setCurrentNode(savedNode);
  }
  skipBlankLinesInContext(context) {
    const savedOffset = context.saveOffsets();
    while (!context.isAtBlockEnd()) {
      const fragment = context.currentFragment();
      if (fragment.length === 0)
        break;
      let i = 0;
      while (i < fragment.length && (fragment[i] === " " || fragment[i] === "\t")) {
        i++;
      }
      if (i < fragment.length && (fragment[i] === `
` || fragment[i] === "\r")) {
        if (fragment[i] === "\r" && i + 1 < fragment.length && fragment[i + 1] === `
`) {
          context.advanceOffset(i + 2);
        } else {
          context.advanceOffset(i + 1);
        }
        continue;
      }
      context.restoreOffsets(savedOffset);
      break;
    }
  }
  findBlockEnd(text, startOffset) {
    let pos = startOffset;
    while (pos < text.length) {
      const newline1 = text.indexOf(`
`, pos);
      if (newline1 === -1)
        break;
      const newline2 = text.indexOf(`
`, newline1 + 1);
      if (newline2 === -1) {
        return text.length;
      }
      const between = text.slice(newline1 + 1, newline2);
      if (between.trim() === "") {
        return newline1;
      }
      pos = newline2;
    }
    return text.length;
  }
  findBlockquoteEnd(text, startOffset) {
    let pos = startOffset;
    while (pos < text.length) {
      const newline = text.indexOf(`
`, pos);
      if (newline === -1) {
        return text.length;
      }
      const nextLineStart = newline + 1;
      if (nextLineStart >= text.length) {
        return text.length;
      }
      let checkPos = nextLineStart;
      while (checkPos < text.length && (text[checkPos] === " " || text[checkPos] === "\t")) {
        checkPos++;
      }
      if (checkPos < text.length && text[checkPos] === ">") {
        pos = nextLineStart;
        continue;
      }
      if (checkPos < text.length && text[checkPos] !== `
`) {
        return newline;
      }
      let searchPos = nextLineStart;
      while (searchPos < text.length) {
        const nextNewline = text.indexOf(`
`, searchPos);
        const line = nextNewline === -1 ? text.slice(searchPos) : text.slice(searchPos, nextNewline);
        const trimmed = line.trimStart();
        if (trimmed.startsWith(">")) {
          pos = searchPos;
          break;
        }
        if (trimmed !== "") {
          return newline;
        }
        if (nextNewline === -1) {
          return text.length;
        }
        searchPos = nextNewline + 1;
      }
      if (searchPos >= text.length) {
        return text.length;
      }
    }
    return text.length;
  }
  isBlankLine(text, offset) {
    let pos = offset;
    while (pos < text.length && text[pos] !== `
`) {
      if (text[pos] !== " " && text[pos] !== "\t" && text[pos] !== "\r") {
        return false;
      }
      pos++;
    }
    return true;
  }
}

export { BlockParsingEngine };
